<script setup>
/**
 * "My journal" — the container the campaign view renders for its journal
 * section, in the same spirit as `MessageBoard`: it talks to its store, and the
 * parts it shows (`JournalPager`, `JournalPageEditor`) stay presentational.
 *
 * The book always has a page to write on: the one after the last stored page is
 * a blank, virtual page, so the first keystroke on it creates the page and the
 * server never stores empty rows. Everything is autosaved with a debounce, and
 * every navigation point flushes what is pending.
 *
 * Privacy is the backend's job — only the owner may read a journal, and the
 * campaign owner and a GM are refused too. The note below says so; it is not
 * what enforces it.
 */
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useJournalStore } from '@/features/journal/journalStore.js'
import { counterVisible as counterVisibleFor, resolveJump } from '@/features/journal/journalUtils.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { useUnsavedChanges } from '@/utils/useUnsavedChanges.js'
import BaseButton from '@/components/base/BaseButton.vue'
import JournalPageEditor from '@/features/journal/components/JournalPageEditor.vue'
import JournalPager from '@/features/journal/components/JournalPager.vue'

const props = defineProps({
  campaignId: {
    type: [Number, String],
    required: true,
  },
})

const journalStore = useJournalStore()
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

// Autosave is debounced, so a pending save is what "unsaved changes" means here.
useUnsavedChanges(
  () => journalStore.hasUnsavedChanges(),
  'You have unsaved changes in your journal. Leave without saving?',
)

onMounted(() => journalStore.fetchJournal(props.campaignId))

watch(
  () => props.campaignId,
  (id) => {
    if (id) journalStore.fetchJournal(id)
  },
)

// Leaving the campaign drops the book (and any timer with it).
onUnmounted(() => journalStore.clearJournal())

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
      <p class="text-sm text-muted">
        Only you can read this journal. Changes are saved automatically.
      </p>

      <div v-if="hasConflict" class="error-message flex flex-wrap items-center justify-between gap-2">
        <span>This page was changed by someone else. Reload to see the latest before writing.</span>
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
      />
    </template>
  </div>
</template>
