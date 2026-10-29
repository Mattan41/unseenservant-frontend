import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import JournalService from '@/features/journal/JournalService.js'
import { readDraft, writeDraft } from '@/features/journal/journalDraft.js'
import { MAX_PAGE_CHARS } from '@/features/journal/journalLimits.js'
import { AUTOSAVE_DELAY_MS, useJournalStore } from '@/features/journal/journalStore.js'
import { useUserStore } from '@/features/user/userStore.js'

vi.mock('@/features/journal/JournalService.js', () => ({
  default: {
    fetchJournal: vi.fn(),
    createPage: vi.fn(),
    updatePage: vi.fn(),
    deletePage: vi.fn(),
  },
}))

const CAMPAIGN_ID = 1
const USER = { id: 7, role: 'USER' }

const page = (id, pageNumber, content, version = 0) => ({
  id,
  pageNumber,
  content,
  version,
  createdAt: null,
  updatedAt: null,
})

/** Two stored pages, so the reader also has page 3 — the trailing blank one. */
const TWO_PAGES = {
  id: 4,
  campaignId: CAMPAIGN_ID,
  userId: USER.id,
  pageCount: 2,
  pages: [page(31, 1, 'one', 3), page(32, 2, 'two')],
}

/**
 * Let the first PATCH hang until the test releases it, echoing back what was
 * sent; later calls answer at once. Returns the release, which is what makes a
 * keystroke land *while* the request is in flight.
 */
function hangFirstPatch() {
  let release = null
  let first = true

  JournalService.updatePage.mockImplementation((id, body) => {
    const answer = () => ({
      page: page(id, 1, body.content, Number(body.version) + 1),
      pageCount: 2,
    })

    if (!first) return Promise.resolve(answer())
    first = false
    return new Promise((resolve) => {
      release = () => resolve(answer())
    })
  })

  return () => release?.()
}

describe('journalStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    useUserStore().currentUser = USER
    JournalService.fetchJournal.mockResolvedValue(TWO_PAGES)
  })

  afterEach(() => vi.useRealTimers())

  it('loads the whole book and opens on page 1', async () => {
    const store = useJournalStore()

    await store.fetchJournal(CAMPAIGN_ID)

    expect(store.pageCount).toBe(2)
    expect(store.currentPageNumber).toBe(1)
    expect(store.draft).toBe('one')
    expect(store.lastPageNumber).toBe(3)
  })

  it('gives an empty book one blank page to write on', async () => {
    JournalService.fetchJournal.mockResolvedValue({
      id: null,
      campaignId: CAMPAIGN_ID,
      userId: USER.id,
      pageCount: 0,
      pages: [],
    })
    const store = useJournalStore()

    await store.fetchJournal(CAMPAIGN_ID)

    expect(store.lastPageNumber).toBe(1)
    expect(store.currentPage).toBeNull()
    expect(store.draft).toBe('')
  })

  it('creates the page when the trailing blank one is written on', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    await store.goToPage(3)
    expect(store.currentPage).toBeNull()

    JournalService.createPage.mockResolvedValue({
      ...TWO_PAGES,
      pageCount: 3,
      pages: [...TWO_PAGES.pages, page(33, 3, 'three')],
    })

    expect(store.setContent('three')).toBe(true)
    await store.flush()

    expect(JournalService.createPage).toHaveBeenCalledWith(CAMPAIGN_ID, {
      afterPageId: 32,
      content: 'three',
    })
    expect(store.pageCount).toBe(3)
    expect(store.currentPageNumber).toBe(3)
    expect(store.saveState).toBe('saved')
  })

  it('rewrites a stored page under the version it loaded', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    JournalService.updatePage.mockResolvedValue({ page: page(31, 1, 'one more', 4), pageCount: 2 })

    store.setContent('one more')
    expect(store.saveState).toBe('dirty')
    await store.flush()

    expect(JournalService.updatePage).toHaveBeenCalledWith(31, { content: 'one more', version: 3 })
    expect(store.currentPage.content).toBe('one more')
    expect(store.currentPage.version).toBe(4)
    expect(store.saveState).toBe('saved')
    expect(store.hasUnsavedChanges()).toBe(false)
  })

  it('debounces a burst of keystrokes into one save', async () => {
    vi.useFakeTimers()
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    JournalService.updatePage.mockResolvedValue({ page: page(31, 1, 'abc', 4), pageCount: 2 })

    store.setContent('a')
    store.setContent('ab')
    store.setContent('abc')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS)

    expect(JournalService.updatePage).toHaveBeenCalledTimes(1)
    expect(JournalService.updatePage).toHaveBeenCalledWith(31, { content: 'abc', version: 3 })
  })

  it('clearing the last page removes it and lands on the blank one', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    await store.goToPage(2)
    JournalService.updatePage.mockResolvedValue({ page: null, pageCount: 1 })

    store.setContent('   ')
    await store.flush()

    expect(store.pageCount).toBe(1)
    // One stored page left, so page 2 is the virtual blank page again.
    expect(store.currentPageNumber).toBe(2)
    expect(store.currentPage).toBeNull()
    expect(store.draft).toBe('')
  })

  it('keeps a blank page that is not last', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    JournalService.updatePage.mockResolvedValue({ page: page(31, 1, '', 4), pageCount: 2 })

    store.setContent('')
    await store.flush()

    expect(store.pageCount).toBe(2)
    expect(store.currentPageNumber).toBe(1)
    expect(store.currentPage.content).toBe('')
  })

  it('inserts after the current page and shows the new one', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    JournalService.createPage.mockResolvedValue({
      ...TWO_PAGES,
      pageCount: 3,
      pages: [page(31, 1, 'one', 3), page(33, 2, ''), page(32, 3, 'two')],
    })

    await store.insertPageAfterCurrent()

    expect(JournalService.createPage).toHaveBeenCalledWith(CAMPAIGN_ID, {
      afterPageId: 31,
      content: '',
    })
    expect(store.currentPageNumber).toBe(2)
    expect(store.currentPage.id).toBe(33)
    expect(store.pageCount).toBe(3)
  })

  it('inserting at the end only moves to the blank page already there', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    await store.goToPage(2)

    await store.insertPageAfterCurrent()

    expect(JournalService.createPage).not.toHaveBeenCalled()
    expect(store.currentPageNumber).toBe(3)
    expect(store.currentPage).toBeNull()
  })

  it('deleting a page shows the one that took its number', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    await store.goToPage(2)
    JournalService.deletePage.mockResolvedValue({
      id: 4,
      campaignId: CAMPAIGN_ID,
      userId: USER.id,
      pageCount: 1,
      pages: [page(31, 1, 'one', 3)],
    })

    await store.deleteCurrentPage()

    expect(JournalService.deletePage).toHaveBeenCalledWith(32)
    expect(store.pageCount).toBe(1)
    expect(store.lastPageNumber).toBe(2)
    expect(store.currentPageNumber).toBe(2)
  })

  it('reports a stale version as a conflict instead of overwriting', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    JournalService.updatePage.mockRejectedValue({
      response: { status: 409, data: { detail: 'gone' } },
      handled: true,
    })

    store.setContent('mine')
    await store.flush()

    expect(store.hasConflict).toBe(true)
    expect(store.saveState).toBe('error')
    expect(store.hasUnsavedChanges()).toBe(true)
    expect(store.currentPage.content).toBe('one')
    expect(store.draft).toBe('mine')
  })

  it('refuses an over-limit paste whole instead of truncating it', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)

    expect(store.setContent('a'.repeat(MAX_PAGE_CHARS + 1))).toBe(false)

    expect(store.draft).toBe('one')
    expect(store.saveState).toBe('idle')
    expect(JournalService.updatePage).not.toHaveBeenCalled()
  })

  it('clamps a jump into the book', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)

    await store.goToPage(99)
    expect(store.currentPageNumber).toBe(3)

    await store.goToPage(-5)
    expect(store.currentPageNumber).toBe(1)
  })

  it('restores text a closed tab never managed to save', async () => {
    writeDraft(useUserStore().userId, CAMPAIGN_ID, '31', 'typed but never sent')
    const store = useJournalStore()

    await store.fetchJournal(CAMPAIGN_ID)

    expect(store.draft).toBe('typed but never sent')
    expect(store.saveState).toBe('dirty')
    expect(store.hasUnsavedChanges()).toBe(true)
  })

  it('drops everything when the campaign is left', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)

    store.clearJournal()

    expect(store.journal).toBeNull()
    expect(store.campaignId).toBeNull()
    expect(store.draft).toBe('')
    expect(store.saveState).toBe('idle')
  })

  it('keeps text typed while a save is in flight, and sends it next', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    const release = hangFirstPatch()

    store.setContent('one, and')
    const saving = store.saveNow()
    expect(JournalService.updatePage).toHaveBeenCalledWith(31, { content: 'one, and', version: 3 })

    // The reader carries on typing while the request is in flight.
    store.setContent('one, and more')
    release()
    await saving

    // The answer is older than the screen, so it must not become the screen:
    // assigning it would drop the caret at the end and lose those keystrokes.
    expect(store.draft).toBe('one, and more')
    expect(store.saveState).toBe('dirty')
    expect(store.hasUnsavedChanges()).toBe(true)
    expect(store.currentPage.content).toBe('one, and')
    expect(readDraft(USER.id, CAMPAIGN_ID, '31')).toEqual({ content: 'one, and more' })

    await store.flush()

    expect(JournalService.updatePage).toHaveBeenLastCalledWith(31, {
      content: 'one, and more',
      version: 4,
    })
    expect(store.draft).toBe('one, and more')
    expect(store.saveState).toBe('saved')
    expect(readDraft(USER.id, CAMPAIGN_ID, '31')).toBeNull()
  })

  it('makes a navigation flush wait for the save in flight before the page turns', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    const release = hangFirstPatch()

    store.setContent('one, and')
    const saving = store.saveNow()
    store.setContent('one, and more')

    const navigating = store.goToPage(2)
    // Still on page 1: what is pending has not landed yet, so the page waits.
    expect(store.currentPageNumber).toBe(1)

    release()
    await Promise.all([saving, navigating])

    // The newer text went out before the page turned, so no keystroke is left to
    // be written against the wrong page.
    expect(JournalService.updatePage).toHaveBeenLastCalledWith(31, {
      content: 'one, and more',
      version: 4,
    })
    expect(store.currentPageNumber).toBe(2)
    expect(store.draft).toBe('two')
    expect(store.saveState).toBe('saved')
  })

  it('folds nothing from a save into another campaign’s book', async () => {
    const store = useJournalStore()
    await store.fetchJournal(CAMPAIGN_ID)
    const release = hangFirstPatch()

    store.setContent('one, and')
    const saving = store.saveNow()

    JournalService.fetchJournal.mockResolvedValue({
      id: 9,
      campaignId: 2,
      userId: USER.id,
      pageCount: 1,
      pages: [page(41, 1, 'another book', 2)],
    })
    await store.fetchJournal(2)
    release()
    await saving

    expect(store.journal.campaignId).toBe(2)
    expect(store.draft).toBe('another book')
    expect(store.pageCount).toBe(1)
    expect(store.saveState).toBe('idle')
    // The unsent text is not lost: the mirror holds it for the book it belongs to.
    expect(readDraft(USER.id, CAMPAIGN_ID, '31')).toEqual({ content: 'one, and' })
  })
})
