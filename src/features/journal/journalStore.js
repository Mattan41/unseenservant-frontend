import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import JournalService from './JournalService.js'
import { clearDraft, readDraft, writeDraft } from './journalDraft.js'
import { MAX_PAGES } from './journalLimits.js'
import { clampPageNumber, isOverLimit, lastPageNumber as lastPageNumberOf } from './journalUtils.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { extractErrorMessage } from '@/utils/errorUtils.js'

/** How long the editor waits after the last keystroke before it saves itself. */
export const AUTOSAVE_DELAY_MS = 800

/** The signed-in user, for the draft mirror's key. Nothing local to capture. */
function currentUserId() {
  return useUserStore().userId
}

/**
 * One notification. Defaults mirror the notification store's own, so a caller
 * that only cares about the message can simply say so.
 * @param {string} message
 * @param {'success'|'error'} [type]
 * @param {number} [duration] milliseconds on screen
 */
function notify(message, type = 'error', duration = 3000) {
  useNotificationStore().addNotification(message, type, duration)
}

/**
 * The private journal of the current participant in one campaign.
 *
 * The book arrives whole (`pageCount` stored pages plus their text) and the page
 * after the last stored one is a blank, virtual page the reader can always write
 * on. Writing there creates a page; clearing the last stored page removes it
 * again, so no empty rows ever accumulate.
 *
 * Saving is debounced and every navigation point flushes what is pending. The
 * text is additionally mirrored in localStorage on each keystroke
 * (`journalDraft.js`), because a closed tab cannot wait for a request.
 *
 * Two rules keep the editor steady while that happens. One save runs at a time
 * (`saveInFlight`), so answers cannot land out of order and `flush()` really
 * waits. And an answer never overwrites newer text: if the reader typed on while
 * the request was in flight, their text stays on screen (and in the mirror) and
 * the next quiet moment sends it — otherwise the cursor would jump to the end of
 * the page and the keystrokes would be lost.
 */
export const useJournalStore = defineStore('journal', () => {
  // ==========================================================================
  // State
  // ==========================================================================
  const campaignId = ref(null)
  const journal = ref(null)
  const currentPageNumber = ref(1)
  const draft = ref('')
  const isLoading = ref(false)
  const isSaving = ref(false)
  /** idle | dirty | saving | saved | error */
  const saveState = ref('idle')
  const hasConflict = ref(false)
  const error = ref(null)

  let autosaveTimer = null
  /** The request in flight, so `flush()` can wait for it instead of guessing. */
  let saveInFlight = null

  // ==========================================================================
  // Derived
  // ==========================================================================
  const pages = computed(() => journal.value?.pages || [])
  const pageCount = computed(() => pages.value.length)
  const lastPageNumber = computed(() => lastPageNumberOf(pageCount.value))
  /** `null` while the trailing blank page is on screen: it is not stored. */
  const currentPage = computed(() => pages.value[currentPageNumber.value - 1] || null)
  const charCount = computed(() => draft.value.length)
  const atPageLimit = computed(() => pageCount.value >= MAX_PAGES)

  // ==========================================================================
  // Helpers
  // ==========================================================================

  function emptyJournal() {
    return {
      id: null,
      campaignId: campaignId.value,
      userId: currentUserId(),
      pageCount: 0,
      pages: [],
    }
  }

  /** The mirror's key for a page: its id, or the name of the virtual page. */
  function pageKey(page = currentPage.value) {
    return page ? String(page.id) : 'virtual'
  }

  function draftArgs(page = currentPage.value) {
    return [currentUserId(), campaignId.value, pageKey(page)]
  }

  function cancelAutosave() {
    if (autosaveTimer !== null) {
      clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
  }

  /** Save once the typing settles: the debounce timer is the only one here. */
  function armAutosave() {
    cancelAutosave()
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null
      void saveNow()
    }, AUTOSAVE_DELAY_MS)
  }

  /**
   * The text the page on screen should show.
   *
   * `savedDraft` is what a save request went out with. When the reader has typed
   * on since (`draft` no longer holds it), their text wins: the answer is older
   * than the screen, and assigning it would move the caret to the end and drop
   * the keystrokes. A caller that is not a save response passes `null`, because
   * a page change must always replace the text.
   *
   * @param {string|null} savedDraft
   * @returns {string}
   */
  function pageDraftText(savedDraft) {
    if (savedDraft !== null && draft.value !== savedDraft) return draft.value
    return currentPage.value?.content ?? ''
  }

  /**
   * Adopt a journal payload (or an empty one), land on a valid page and seed the
   * editor with that page's text (see `pageDraftText`).
   */
  function adoptJournal(next, { savedDraft = null } = {}) {
    journal.value =
      next && Array.isArray(next.pages) ? { ...next, pageCount: next.pages.length } : emptyJournal()
    currentPageNumber.value = clampPageNumber(currentPageNumber.value, pageCount.value)
    draft.value = pageDraftText(savedDraft)
  }

  /**
   * Adopt this page's mirror when it differs from what the server holds — text
   * typed just before the tab was closed, which the debounce never sent.
   * @returns {boolean} whether anything was restored
   */
  function restoreDraft() {
    const mirror = readDraft(...draftArgs())
    if (!mirror || mirror.content === draft.value) return false

    draft.value = mirror.content
    saveState.value = 'dirty'
    notify('Unsaved text was restored from this browser and will be saved now.', 'success')
    return true
  }

  async function goToPage(number) {
    if (!journal.value) return
    await flush()
    currentPageNumber.value = clampPageNumber(number, pageCount.value)
    draft.value = currentPage.value?.content ?? ''
    restoreDraft()
  }

  /**
   * The page after this one, or the last page when a jump overshoots.
   * @param {number} number
   */
  async function nextPage() {
    await goToPage(currentPageNumber.value + 1)
  }

  async function previousPage() {
    await goToPage(currentPageNumber.value - 1)
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Load the caller's journal. A read creates nothing on the server, so a
   * participant who has never written gets an empty book with a blank page.
   * @param {number|string} id campaign id
   * @returns {Promise<object|null>}
   */
  async function fetchJournal(id) {
    campaignId.value = id
    isLoading.value = true
    error.value = null
    hasConflict.value = false
    cancelAutosave()

    try {
      adoptJournal(await JournalService.fetchJournal(id))
      restoreDraft()
      return journal.value
    } catch (err) {
      console.error('Failed to fetch the journal:', err)
      error.value = 'Failed to load your journal.'
      if (!err.handled) notify(extractErrorMessage(err, 'Failed to load your journal.'))
      return null
    } finally {
      isLoading.value = false
    }
  }

  /** Fetch the journal again, e.g. after a conflict. */
  function reload() {
    return fetchJournal(campaignId.value)
  }

  /**
   * The editor's input. An over-limit value is refused whole — never truncated —
   * and `false` tells the editor to put its own text back.
   * @param {string} text
   * @returns {boolean} whether the text was accepted
   */
  function setContent(text) {
    if (isOverLimit(text)) return false

    draft.value = String(text ?? '')
    saveState.value = 'dirty'
    writeDraft(...draftArgs(), draft.value)

    armAutosave()
    return true
  }

  /**
   * Fold a PATCH answer into the loaded book.
   *
   * A `null` page means the page was blank and last, so writing it removed it —
   * it is the virtual trailing page again. `pageCount` can drop by more than one
   * there, because blank pages at the end collapse into the single virtual one.
   *
   * @param {object} result
   * @param {string|null} [savedDraft] what the request went out with (see
   *   `pageDraftText`), so text typed while it was in flight is not overwritten
   */
  function applySavedPage(result, savedDraft = null) {
    const kept = pages.value
      .slice(0, Number(result.pageCount ?? pageCount.value))
      .map((page) => ({ ...page }))

    if (result.page) {
      const index = kept.findIndex((page) => String(page.id) === String(result.page.id))
      if (index >= 0) kept[index] = result.page
    }

    journal.value = { ...(journal.value || emptyJournal()), pages: kept, pageCount: kept.length }
    currentPageNumber.value = clampPageNumber(currentPageNumber.value, kept.length)
    draft.value = pageDraftText(savedDraft)
  }

  /**
   * Save what is pending.
   *
   * One request at a time: a caller that arrives while a save is in flight waits
   * for it and then looks again, so two answers can never be applied out of
   * order and `flush()` can promise that the text on screen has landed.
   *
   * @returns {Promise<boolean>} whether the book is saved
   */
  async function saveNow() {
    cancelAutosave()
    if (!campaignId.value) return false

    if (saveInFlight) await saveInFlight
    if (saveState.value !== 'dirty' && saveState.value !== 'error') return true

    saveInFlight = performSave()
    try {
      return await saveInFlight
    } finally {
      saveInFlight = null
    }
  }

  /**
   * The single request a save consists of. Writing on the virtual last page
   * creates it; writing on a stored page updates it under its version token, and
   * a stale token is reported as a conflict instead of silently overwriting the
   * other writer.
   */
  async function performSave() {
    const savedCampaign = campaignId.value
    const savedPage = currentPage.value
    const savedKey = pageKey(savedPage)
    const content = draft.value
    isSaving.value = true
    saveState.value = 'saving'

    try {
      const answer = savedPage
        ? await JournalService.updatePage(savedPage.id, { content, version: savedPage.version })
        : await JournalService.createPage(savedCampaign, {
            afterPageId: pages.value.at(-1)?.id ?? null,
            content,
          })

      // The reader left the campaign while the request was in flight, so this
      // answer belongs to a book that is no longer on screen: fold nothing of it
      // into the one that is. Nothing is pending here either, while the older
      // book's text waits in its mirror for the next visit.
      if (campaignId.value !== savedCampaign) {
        saveState.value = 'idle'
        return true
      }

      if (savedPage) applySavedPage(answer, content)
      else adoptJournal(answer, { savedDraft: content })

      if (draft.value === content) {
        clearDraft(currentUserId(), savedCampaign, savedKey)
        hasConflict.value = false
        saveState.value = 'saved'
      } else {
        // Typing carried on during the request. The newer text stays on screen,
        // stays `dirty` and stays in the mirror — under the page's new key when
        // creating the page moved it off the virtual one — and the next quiet
        // moment sends it.
        const args = draftArgs()
        if (args[2] !== savedKey) clearDraft(currentUserId(), savedCampaign, savedKey)
        writeDraft(...args, draft.value)
        saveState.value = 'dirty'
        armAutosave()
      }
      return true
    } catch (err) {
      if (err?.response?.status === 409) {
        hasConflict.value = true
        notify(
          'This page was changed by someone else. Reload to see the latest before writing.',
          'error',
          5000,
        )
      } else {
        console.error('Failed to save the journal page:', err)
        if (!err.handled) notify(extractErrorMessage(err, 'Could not save this page.'))
      }
      saveState.value = 'error'
      return false
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Finish a pending save before the page, the section or the route changes.
   * Every navigation point calls this, so nothing is lost by moving around — and
   * it really waits: a request already on its way is awaited first.
   * @returns {Promise<boolean>}
   */
  async function flush() {
    if (saveInFlight) await saveInFlight
    if (saveState.value === 'dirty' || saveState.value === 'error') return saveNow()
    cancelAutosave()
    return true
  }

  /**
   * Insert an empty page after the current one, pushing the later numbers along.
   * At the end of the book this only moves to the trailing blank page, which is
   * already there: storing another blank would leave two.
   */
  async function insertPageAfterCurrent() {
    if (!journal.value) return false
    await flush()

    const number = clampPageNumber(currentPageNumber.value, pageCount.value)
    // After the last stored page there is only the trailing blank page, and the
    // backend treats appending a blank page as a no-op — so this is a move, not
    // a write: storing another blank would leave two.
    if (number >= pageCount.value) {
      await goToPage(lastPageNumber.value)
      return true
    }

    try {
      adoptJournal(
        await JournalService.createPage(campaignId.value, {
          afterPageId: pages.value[number - 1].id,
          content: '',
        }),
      )
      currentPageNumber.value = clampPageNumber(number + 1, pageCount.value)
      draft.value = currentPage.value?.content ?? ''
      notify('Page inserted.', 'success')
      return true
    } catch (err) {
      console.error('Failed to insert a journal page:', err)
      if (!err.handled) notify(extractErrorMessage(err, 'Could not insert a page.'))
      return false
    }
  }

  /** Delete the page on screen; the pages after it close the gap. */
  async function deleteCurrentPage() {
    const page = currentPage.value
    if (!journal.value || !page) return false

    // An answer still on its way would otherwise be folded into a book that no
    // longer has this page.
    if (saveInFlight) await saveInFlight
    cancelAutosave()
    isSaving.value = true

    try {
      adoptJournal(await JournalService.deletePage(page.id))
      clearDraft(currentUserId(), campaignId.value, String(page.id))
      saveState.value = 'saved'
      notify('Page deleted.', 'success')
      return true
    } catch (err) {
      console.error('Failed to delete the journal page:', err)
      if (!err.handled) notify(extractErrorMessage(err, 'Could not delete this page.'))
      return false
    } finally {
      isSaving.value = false
    }
  }

  /** Whether text typed here is not saved yet (the unsaved-changes guard asks). */
  function hasUnsavedChanges() {
    return saveState.value === 'dirty' || saveState.value === 'error'
  }

  /** Drop everything (leaving the campaign, or switching to another one). */
  function clearJournal() {
    cancelAutosave()
    campaignId.value = null
    journal.value = null
    currentPageNumber.value = 1
    draft.value = ''
    isLoading.value = false
    isSaving.value = false
    saveState.value = 'idle'
    hasConflict.value = false
    error.value = null
  }

  // ==========================================================================
  // Return all public state and actions
  // ==========================================================================
  return {
    // State
    campaignId,
    journal,
    currentPageNumber,
    draft,
    isLoading,
    isSaving,
    saveState,
    hasConflict,
    error,

    // Derived
    pages,
    pageCount,
    lastPageNumber,
    currentPage,
    charCount,
    atPageLimit,

    // Actions
    fetchJournal,
    reload,
    goToPage,
    nextPage,
    previousPage,
    setContent,
    saveNow,
    flush,
    insertPageAfterCurrent,
    deleteCurrentPage,
    hasUnsavedChanges,
    clearJournal,
  }
})
