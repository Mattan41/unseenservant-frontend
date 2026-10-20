<script setup>
import { onUnmounted, ref, useId } from 'vue'
import { storeToRefs } from 'pinia'
import { useDnd5eSpellStore } from '@/systems/dnd5e/dnd5eSpellStore.js'
import BaseButton from '@/components/base/BaseButton.vue'
import MarkdownText from '@/components/base/MarkdownText.vue'

const props = defineProps({
  characterId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['spell-click', 'save'])

const spellStore = useDnd5eSpellStore()
const {
  searchResults,
  currentQuery,
  currentPage,
  totalResults,
  totalPages,
  isLoading,
  error,
  searchHistory,
  hasNextPage,
  hasPreviousPage,
} = storeToRefs(spellStore)

const searchInput = ref('')
// Instance-scoped: the search is rendered from three places (the spell page, the
// campaign panel, the character sheet), so its field id has to stay unique if
// two ever land in the same document.
const searchInputId = `spell-search-${useId()}`
const savingSpellKey = ref(null)
const expandedSpellKey = ref(null)

onUnmounted(() => spellStore.clearSearch())

function onSearchInput() {
  spellStore.debouncedSearch(searchInput.value)
}

function onClearSearch() {
  searchInput.value = ''
  spellStore.clearSearch()
}

function onHistoryClick(query) {
  searchInput.value = query
  spellStore.searchSpells(query)
}

/**
 * Expand or collapse a spell's details.
 *
 * The row itself is the disclosure control — `<BaseButton variant="row">`, a
 * native button, so Enter and Space come for free and no key handler is needed.
 * The row's own "+ Add" control sits *beside* that button rather than inside it:
 * a native button must not contain another control.
 */
function toggleExpand(key) {
  expandedSpellKey.value = expandedSpellKey.value === key ? null : key
}

async function onSaveSpell(spell) {
  savingSpellKey.value = spell.key
  try {
    emit('save', spell)
  } finally {
    savingSpellKey.value = null
  }
}
</script>

<template>
  <div class="spell-search">
    <!-- Header with 5E context -->
    <div class="mb-4">
      <h4 class="mb-0.5 text-heading">Search 5E Spells</h4>
      <p class="text-xs text-default">
        Search spells compatible with the 5th Edition of the world's oldest fantasy roleplaying
        game.
      </p>
    </div>
    <div class="mb-4">
      <div class="relative">
        <input
          :id="searchInputId"
          v-model="searchInput"
          type="text"
          placeholder="Search spells (e.g., fireball, healing, charm)..."
          class="w-full px-4 py-3 pr-10 border border-input rounded-lg input-field"
          aria-label="Search spells"
          @input="onSearchInput"
          @keydown.escape="onClearSearch"
        />
        <BaseButton
          v-if="searchInput"
          variant="icon"
          class="absolute right-3 top-1/2 -translate-y-1/2"
          aria-label="Clear search"
          @click="onClearSearch"
        >
          ✕
        </BaseButton>
      </div>
    </div>

    <div v-if="searchHistory?.length > 0 && !currentQuery" class="mb-4">
      <p class="text-xs text-subtle mb-1">Recent searches:</p>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="item in searchHistory"
          :key="item.timestamp"
          class="badge badge-secondary spell-history-hover"
          @click="onHistoryClick(item.query)"
        >
          {{ item.query }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="flex justify-center items-center py-8">
      <div class="spinner h-8 w-8 border-t-2 border-b-2"></div>
      <span class="ml-3 text-muted">Searching spells...</span>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="error-message mb-2">{{ error }}</p>
      <BaseButton variant="retry" @click="spellStore.searchSpells(currentQuery, currentPage)">
        Retry
      </BaseButton>
    </div>

    <div v-else-if="searchResults?.length > 0">
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm text-muted">
          Found {{ totalResults }} spell{{ totalResults !== 1 ? 's' : '' }}
          <span v-if="totalPages > 1">— Page {{ currentPage }} of {{ totalPages }}</span>
        </p>
      </div>

      <div
        v-if="totalPages > 1"
        class="flex items-center justify-center gap-4 mb-4 pt-4 border-t border-section"
      >
        <BaseButton
          variant="ghost"
          :disabled="!hasPreviousPage || isLoading"
          @click="spellStore.previousPage()"
        >
          ← Previous
        </BaseButton>
        <span class="text-sm text-muted">Page {{ currentPage }} of {{ totalPages }}</span>
        <BaseButton
          variant="ghost"
          :disabled="!hasNextPage || isLoading"
          @click="spellStore.nextPage()"
        >
          Next →
        </BaseButton>
      </div>

      <div
        class="flex flex-col border border-section rounded-lg overflow-hidden bg-[var(--color-surface)] shadow-sm"
      >
        <!-- Column headings only where there is room for real columns. -->
        <div
          class="hidden sm:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2 px-4 py-2 border-b border-section font-semibold text-xs text-muted uppercase tracking-wider"
          style="background-color: var(--surface-muted)"
        >
          <div>Name</div>
          <div>Level</div>
          <div>School</div>
          <div>Source</div>
          <div class="w-16"></div>
        </div>

        <div
          v-for="spell in searchResults"
          :key="spell.key"
          class="border-b border-subtle last:border-b-0"
        >
          <!-- Stacks (name, meta line, Add) on narrow screens and becomes the
               table row at sm+, so the "+ Add" control always stays inside the
               bordered row instead of being clipped by `overflow-hidden`. The
               wrapper keeps the row chrome; the row itself is the disclosure
               button, and "+ Add" is its sibling (a button cannot hold a
               control). The button repeats the four text-column widths so they
               stay aligned with the header row. -->
          <div
            class="flex flex-col gap-1 px-4 py-3 spell-row-hover sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-center sm:gap-2"
          >
            <BaseButton
              variant="row"
              class="flex flex-col gap-1 sm:col-span-4 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-2"
              :aria-expanded="expandedSpellKey === spell.key"
              @click="toggleExpand(spell.key)"
            >
              <div class="min-w-0 font-medium flex items-center gap-1.5 flex-wrap text-heading">
                {{ spell.name }}
                <span
                  v-if="spell.concentration"
                  class="badge badge-danger text-[10px] font-bold border border-red-200 px-1"
                  title="Concentration"
                  >C</span
                >
                <span
                  v-if="spell.ritual"
                  class="badge badge-info text-[10px] font-bold border border-blue-200 px-1"
                  title="Ritual"
                  >R</span
                >
              </div>

              <!-- Compact meta line (narrow screens): level · school · source -->
              <div class="text-xs text-muted sm:hidden">
                {{ spell.levelLabel }}
                <template v-if="spell.school">
                  · <span class="capitalize">{{ spell.school }}</span>
                </template>
                <template v-if="spell.sourceLabel">
                  · <span class="italic">{{ spell.sourceLabel }}</span>
                </template>
              </div>

              <!-- Table cells (sm+) -->
              <div class="hidden sm:block min-w-0 text-sm text-secondary">
                {{ spell.levelLabel }}
              </div>
              <div class="hidden sm:block min-w-0 text-sm text-muted capitalize truncate">
                {{ spell.school }}
              </div>
              <div class="hidden sm:block min-w-0 text-xs text-subtle italic truncate">
                {{ spell.sourceLabel }}
              </div>
            </BaseButton>

            <div class="flex justify-end sm:w-16">
              <BaseButton
                v-if="props.characterId"
                variant="add"
                :disabled="savingSpellKey === spell.key"
                @click="onSaveSpell(spell)"
              >
                {{ savingSpellKey === spell.key ? '...' : '+ Add' }}
              </BaseButton>
            </div>
          </div>

          <div
            v-if="expandedSpellKey === spell.key"
            class="px-4 pb-4 pt-2 border-t border-subtle text-sm text-default"
            style="background-color: var(--surface-muted)"
          >
            <div
              class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs text-muted border-b border-subtle pb-2"
            >
              <div><strong>Casting Time:</strong> {{ spell.casting_time }}</div>
              <div><strong>Range:</strong> {{ spell.range }}</div>
              <div><strong>Duration:</strong> {{ spell.duration }}</div>
            </div>
            <MarkdownText :text="spell.desc" class="mb-2" />
            <BaseButton variant="link" @click="emit('spell-click', spell)">
              Open Full Details
            </BaseButton>
          </div>
        </div>
      </div>

      <div
        v-if="totalPages > 1"
        class="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-section"
      >
        <BaseButton
          variant="ghost"
          :disabled="!hasPreviousPage || isLoading"
          @click="spellStore.previousPage()"
        >
          ← Previous
        </BaseButton>
        <span class="text-sm text-muted">Page {{ currentPage }} of {{ totalPages }}</span>
        <BaseButton
          variant="ghost"
          :disabled="!hasNextPage || isLoading"
          @click="spellStore.nextPage()"
        >
          Next →
        </BaseButton>
      </div>
    </div>

    <div v-else-if="currentQuery && !isLoading && !error" class="text-center py-8">
      <p class="text-muted">No spells found for "{{ currentQuery }}".</p>
      <p class="text-sm text-subtle mt-1">Try a different search term.</p>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-sm text-default">
        Why not start with searching for the handy spell
        <span class="italic animate-pulse font-medium">Unseen Servant</span>
      </p>
    </div>

    <!-- Attribution footer -->
    <div class="mt-6 pt-4 border-t border-subtle text-center">
      <p class="text-[11px] italic text-default">
        Data provided via the
        <a
          href="https://open5e.com"
          target="_blank"
          rel="noopener"
          class="element-link underline font-medium"
          >Open5e API</a
        >.
      </p>
    </div>
  </div>
</template>

<style scoped>
.spell-search {
  width: 100%;
}
</style>
