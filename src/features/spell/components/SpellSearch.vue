<script setup>
import { ref, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSpellStore } from '@/features/spell/spellStore.js'

const emit = defineEmits(['spell-click', 'save'])

const spellStore = useSpellStore()
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
const savingSpellKey = ref(null)
const expandedSpellKey = ref(null)

onUnmounted(() => {
  spellStore.clearSearch()
})

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

function getSpellLevel(spell) {
  return spell.level === 0 || spell.level === '0' ? 'Cantrip' : 'Level ' + spell.level
}

function getSchoolName(spell) {
  return typeof spell.school === 'object' ? spell.school.name : spell.school
}

function getComponents(spell) {
  return Array.isArray(spell.components) ? spell.components.join(', ') : spell.components
}

</script>

<template>
  <div class="spell-search">

    <!-- Search input -->
    <div class="mb-4">
      <div class="relative">
        <input
          v-model="searchInput"
          type="text"
          placeholder="Search spells (e.g., fireball, healing, charm)..."
          class="w-full px-4 py-3 pr-10 border border-third-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-third-800"
          @input="onSearchInput"
          @keydown.escape="onClearSearch"
        />
        <button
          v-if="searchInput"
          class="button-icon absolute right-3 top-1/2 -translate-y-1/2"
          aria-label="Clear search"
          @click="onClearSearch"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Search history -->
    <div v-if="searchHistory?.length > 0 && !currentQuery" class="mb-4">
      <p class="text-xs text-third-400 mb-1">Recent searches:</p>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="item in searchHistory"
          :key="item.timestamp"
          class="badge badge-secondary hover:bg-third-200 transition-colors"
          @click="onHistoryClick(item.query)"
        >
          {{ item.query }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center items-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      <span class="ml-3 text-third-500">Searching spells...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-8">
      <p class="error-message mb-2">{{ error }}</p>
      <button
        class="button button-retry text-sm"
        @click="spellStore.searchSpells(currentQuery, currentPage)"
      >
        Retry
      </button>
    </div>

    <!-- Results -->
    <div v-else-if="searchResults?.length > 0">
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm text-third-500">
          Found {{ totalResults }} spell{{ totalResults !== 1 ? 's' : '' }}
          <span v-if="totalPages > 1">— Page {{ currentPage }} of {{ totalPages }}</span>
        </p>
      </div>

      <!-- Pagination (top) -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-third-200"
      >
        <button
          class="button button-secondary"
          :disabled="!hasPreviousPage || isLoading"
          @click="spellStore.previousPage()"
        >
          ← Previous
        </button>
        <span class="text-sm text-third-500">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          class="button button-secondary"
          :disabled="!hasNextPage || isLoading"
          @click="spellStore.nextPage()"
        >
          Next →
        </button>
      </div>

      <!-- Results table -->
      <div class="flex flex-col border border-third-200 rounded-lg overflow-hidden bg-white shadow-sm">

        <!-- Table header -->
        <div class="grid grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-2 px-4 py-2 bg-third-50 border-b border-third-200 font-semibold text-xs text-third-500 uppercase tracking-wider">
          <div>Name</div>
          <div>Level</div>
          <div>School</div>
          <div>Source</div>
          <div class="w-16"></div>
        </div>

        <!-- Table rows -->
        <div
          v-for="spell in searchResults"
          :key="spell.key"
          class="border-b border-third-100 last:border-b-0"
        >
          <!-- Row -->
          <div
            class="grid grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-third-50 transition-colors"
            @click="toggleExpand(spell.key)"
          >
            <div class="font-medium text-third-800 flex items-center gap-1.5 flex-wrap">
              {{ spell.name }}
              <span
                v-if="spell.concentration"
                class="badge badge-danger text-[10px] font-bold border border-red-200 px-1"
                title="Concentration"
              >C</span>
              <span
                v-if="spell.ritual"
                class="badge badge-info text-[10px] font-bold border border-blue-200 px-1"
                title="Ritual"
              >R</span>
            </div>
            <div class="text-sm text-third-600">{{ getSpellLevel(spell) }}</div>
            <div class="text-sm text-third-500 capitalize">{{ getSchoolName(spell) }}</div>
            <div class="text-xs text-third-400 italic truncate">{{ spell.sourceLabel }}</div>
            <div class="w-16 flex justify-end" @click.stop>
              <button
                :disabled="savingSpellKey === spell.key"
                class="button button-add disabled:opacity-50"
                @click="onSaveSpell(spell)"
              >
                {{ savingSpellKey === spell.key ? '...' : '+ Add' }}
              </button>
            </div>
          </div>

          <!-- Expanded detail -->
          <div
            v-if="expandedSpellKey === spell.key"
            class="px-4 pb-4 pt-2 bg-third-50/50 border-t border-third-100 text-sm text-third-700"
          >
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs text-third-500 border-b border-third-100 pb-2">
              <div><strong>Casting Time:</strong> {{ spell.casting_time }}</div>
              <div><strong>Range:</strong> {{ spell.range }}</div>
              <div><strong>Duration:</strong> {{ spell.duration }}</div>
              <div><strong>Components:</strong> {{ getComponents(spell) }}</div>
            </div>
            <div class="prose prose-sm max-w-none text-third-600 whitespace-pre-line mb-2">
              {{ spell.desc || spell.description }}
            </div>
            <button
              class="element-link text-xs font-medium underline mt-1"
              @click="emit('spell-click', spell)"
            >
              Open Full Details
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination (bottom) -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-third-200"
      >
        <button
          class="button button-secondary"
          :disabled="!hasPreviousPage || isLoading"
          @click="spellStore.previousPage()"
        >
          ← Previous
        </button>
        <span class="text-sm text-third-500">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          class="button button-secondary"
          :disabled="!hasNextPage || isLoading"
          @click="spellStore.nextPage()"
        >
          Next →
        </button>
      </div>
    </div>

    <!-- No results -->
    <div v-else-if="currentQuery && !isLoading && !error" class="text-center py-8">
      <p class="text-third-500">No spells found for "{{ currentQuery }}".</p>
      <p class="text-sm text-third-400 mt-1">Try a different search term.</p>
    </div>

    <!-- Idle state -->
    <div v-else class="text-center py-8">
      <p class="text-third-400 text-sm">
        Type a spell name to start searching the Open5e spell database.
      </p>
    </div>

  </div>
</template>

<style scoped>
.spell-search {
  width: 100%;
}
</style>
