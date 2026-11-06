<script setup>
/**
 * "My journal" — the container the campaign view renders for its journal
 * section, in the same spirit as `MessageBoard`: it talks to its store, and the
 * parts it shows (`JournalPager`, `JournalPageEditor`, `CharacterJournalPanel`)
 * stay presentational.
 *
 * The book always has a page to write on: the one after the last stored page is
 * a blank, virtual page, so the first keystroke on it creates the page and the
 * server never stores empty rows. Everything is autosaved with a debounce, and
 * what is pending is flushed at every navigation point — plus when the field
 * loses focus, when the tab is hidden and on `Ctrl/Cmd+S`, so the debounce is
 * never what the reader is waiting for.
 *
 * Two views sit behind a tab bar: the campaign journal itself, and a read-only
 * panel per character the participant owns (from the campaign store, filtered to
 * `ownerId === the viewer`). The character tabs only read what lives on the
 * character — editing stays on `CharacterView`, reached from the tab's link.
 * With no owned character there is a single tab, so the bar is not rendered and
 * the section looks exactly as it did before.
 *
 * On opening, the journal lands on its most recently edited page (the newest
 * `updatedAt` across the stored pages) rather than page 1. An in-progress draft
 * wins over that default: the current page is left alone when there is unsaved
 * text. Neither changes the store's own page semantics — `goToPage`,
 * `insertPageAfterCurrent`, `deleteCurrentPage`, the guard and the pager are
 * untouched.
 *
 * Privacy is the backend's job — only the owner may read a journal, and the
 * campaign owner and a GM are refused too. The note below says so; it is not
 * what enforces it.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useJournalStore } from '@/features/journal/journalStore.js'
import {
  counterVisible as counterVisibleFor,
  mostRecentlyEditedPageNumber,
  resolveJump,
} from '@/features/journal/journalUtils.js'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { sameId } from '@/features/campaign/campaignPermissions.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { useUnsavedChanges } from '@/utils/useUnsavedChanges.js'
import BaseButton from '@/components/base/BaseButton.vue'
import CharacterJournalPanel from '@/features/journal/components/CharacterJournalPanel.vue'
import JournalPageEditor from '@/features/journal/components/JournalPageEditor.vue'
import JournalPager from '@/features/journal/components/JournalPager.vue'
import JournalTabs from '@/features/journal/components/JournalTabs.vue'

const props = defineProps({
  campaignId: {
    type: [Number, String],
    required: true,
  },
})

const journalStore = useJournalStore()
const campaignStore = useCampaignStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const {
  journal,
  currentPage,
  currentPageNumber,
  lastPageNumber,
  draft,
  charCount,
  saveState,
  hasConflict,
  isLoading,
  isSaving,
  atPageLimit,
} = storeToRefs(journalStore)

const counterVisible = computed(() => counterVisibleFor(charCount.value))

// --- Tabs: the journal, then one per character the participant owns ----------

/**
 * The participant's own characters in this campaign, in the store's party order.
 * Never another participant's character and never an NPC: the journal is the
 * participant's own space.
 */
const ownCharacters = computed(() =>
  campaignStore
    .getCharactersByCampaignId(props.campaignId)
    .filter((character) => sameId(character.ownerId, userStore.userId)),
)

/** Campaign first, then the owned characters under their own names. */
const tabs = computed(() => [
  { key: 'campaign', label: 'Campaign' },
  ...ownCharacters.value.map((character) => ({
    key: String(character.id),
    label: character.name || 'Character',
  })),
])

const activeTab = ref('campaign')

/** The character behind the active tab, or `null` on the campaign tab. */
const activeCharacter = computed(
  () => ownCharacters.value.find((character) => String(character.id) === activeTab.value) || null,
)

function onSelectTab(key) {
  activeTab.value = key
}

// Autosave is debounced, so a pending save is what "unsaved changes" means here.
useUnsavedChanges(
  () => journalStore.hasUnsavedChanges(),
  'You have unsaved changes in your journal. Leave without saving?',
)

/**
 * Flush what is pending without waiting for the debounce: when the field loses
 * focus (announced by the editor, since `blur` alone does not bubble) the reader
 * has stopped typing on purpose.
 */
function onBlur() {
  void journalStore.flush()
}

/**
 * `Ctrl/Cmd+S` saves at once, the way a habit expects — and it stops the browser
 * from offering to save the page itself. Bound on the document, so it works from
 * the field, the pager's jump box and anywhere else in the section; the section
 * is what puts the board on screen, so the listener exists only while the
 * journal does. The save state in the field row is the feedback.
 */
function onSaveShortcut(event) {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return
  event.preventDefault()
  void journalStore.flush()
}

/** A hidden tab may never come back: send what is pending while it still can. */
function onVisibilityChange() {
  if (document.visibilityState === 'hidden') void journalStore.flush()
}

/**
 * Open the journal and land on the page a returning reader wants — see
 * `landOnMostRecentPage`.
 */
async function openJournal(id) {
  await journalStore.fetchJournal(id)
  await landOnMostRecentPage()
}

/**
 * Land on the most recently edited page rather than page 1.
 *
 * A draft in progress is where the reader was, so it wins: the current page is
 * left alone while there is unsaved text. Otherwise the newest stored page is
 * the default (page 1 for an empty book or one whose pages carry no timestamp),
 * and a no-op when it is already the page on screen. This only moves the store
 * through its existing `goToPage` — no store behaviour changes.
 */
async function landOnMostRecentPage() {
  if (journalStore.hasUnsavedChanges()) return
  const target = mostRecentlyEditedPageNumber(journalStore.pages)
  if (target && target !== journalStore.currentPageNumber) {
    await journalStore.goToPage(target)
  }
}

/**
 * The party is already loaded by the campaign view, so the tabs normally need
 * nothing. Fetch only when this campaign's characters have never been loaded and
 * no load is on its way — through the store's existing action, never a new one.
 */
function ensureCharactersLoaded() {
  const key = props.campaignId
  const loaded = campaignStore.campaignCharacters?.[key]
  if (loaded === undefined && !campaignStore.loadingCharacters) {
    void campaignStore.fetchCharactersForCampaign(key)
  }
}

onMounted(() => {
  document.addEventListener('keydown', onSaveShortcut)
  document.addEventListener('visibilitychange', onVisibilityChange)
  void openJournal(props.campaignId)
  ensureCharactersLoaded()
})

watch(
  () => props.campaignId,
  (id) => {
    if (id) {
      activeTab.value = 'campaign'
      void openJournal(id)
    }
  },
)

// Leaving the campaign drops the book (and any timer with it).
onUnmounted(() => {
  document.removeEventListener('keydown', onSaveShortcut)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  journalStore.clearJournal()
})

/**
 * A typed page number. `resolveJump` decides: nothing typed stays put, `0` and
 * negatives mean the first page, past the end means the last page.
 */
async function onGo(value) {
  const target = resolveJump(value, journalStore.pageCount)
  await journalStore.goToPage(target ?? journalStore.currentPageNumber)
}

function onInsert() {
  return journalStore.insertPageAfterCurrent()
}

async function onRemove() {
  if (!window.confirm('Delete this page? The pages after it move up one number.')) return
  await journalStore.deleteCurrentPage()
}

function onContent(value) {
  journalStore.setContent(value)
}

function onRejected(message) {
  notificationStore.addNotification(message, 'error', 5000)
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="isLoading && !journal" class="flex items-center gap-2 text-sm text-muted">
      <div class="spinner h-4 w-4 border-b-2"></div>
      <span>Loading your journal…</span>
    </div>

    <template v-else>
      <!-- The bar only earns its place with something to switch to. -->
      <JournalTabs
        v-if="tabs.length > 1"
        :tabs="tabs"
        :active-key="activeTab"
        @select="onSelectTab"
      />

      <!-- Campaign tab: the journal itself, exactly as it was -->
      <div
        v-if="activeTab === 'campaign'"
        id="journal-panel-campaign"
        role="tabpanel"
        aria-labelledby="journal-tab-campaign"
        class="space-y-4"
      >
        <p class="text-sm text-muted">
          Only you can read this journal. Changes are saved automatically — Ctrl/Cmd+S saves at
          once.
        </p>

        <div
          v-if="hasConflict"
          class="error-message flex flex-wrap items-center justify-between gap-2"
        >
          <span
            >This page was changed by someone else. Reload to see the latest before writing.</span
          >
          <BaseButton variant="retry" @click="journalStore.reload()">Reload</BaseButton>
        </div>

        <p v-if="atPageLimit" class="error-message">
          This journal is full: {{ lastPageNumber - 1 }} pages is the limit. Delete a page before
          adding another.
        </p>

        <JournalPager
          :page-number="currentPageNumber"
          :last-page-number="lastPageNumber"
          :busy="isSaving"
          :can-delete="currentPage !== null"
          @go="onGo"
          @insert="onInsert"
          @remove="onRemove"
        />

        <JournalPageEditor
          :model-value="draft"
          :save-state="saveState"
          :char-count="charCount"
          :counter-visible="counterVisible"
          @update:model-value="onContent"
          @rejected="onRejected"
          @blur="onBlur"
        />
      </div>

      <!-- Character tab: a read-only view of one owned character's material -->
      <div
        v-else-if="activeCharacter"
        :id="`journal-panel-${activeTab}`"
        role="tabpanel"
        :aria-labelledby="`journal-tab-${activeTab}`"
      >
        <CharacterJournalPanel :character="activeCharacter" />
      </div>
    </template>
  </div>
</template>
