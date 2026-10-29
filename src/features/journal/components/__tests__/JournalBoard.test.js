import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import JournalBoard from '@/features/journal/components/JournalBoard.vue'
import JournalService from '@/features/journal/JournalService.js'
import { useUserStore } from '@/features/user/userStore.js'

// The board registers a route guard, and nothing here is about routing.
vi.mock('@/utils/useUnsavedChanges.js', () => ({
  useUnsavedChanges: vi.fn(),
  confirmDiscardUnsavedChanges: vi.fn(() => true),
}))

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
const PAGE = { id: 31, pageNumber: 1, content: 'one', version: 3, createdAt: null, updatedAt: null }
const BOOK = {
  id: 4,
  campaignId: CAMPAIGN_ID,
  userId: USER.id,
  pageCount: 1,
  pages: [PAGE],
}

/** jsdom's `visibilityState` is read-only, so shadow it for one call. */
function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
}

function pressSave() {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true }),
  )
}

describe('JournalBoard', () => {
  let wrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    useUserStore().currentUser = USER
    JournalService.fetchJournal.mockResolvedValue(BOOK)
    JournalService.updatePage.mockImplementation((id, body) =>
      Promise.resolve({ page: { ...PAGE, content: body.content }, pageCount: 1 }),
    )
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    delete document.visibilityState
  })

  /** Mount the section and let the book load. */
  async function open() {
    wrapper = mount(JournalBoard, { props: { campaignId: CAMPAIGN_ID } })
    await flushPromises()
  }

  it('saves at once on Ctrl/Cmd+S, without waiting for the debounce', async () => {
    await open()
    await wrapper.get('textarea').setValue('one, and')

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      cancelable: true,
    })
    document.dispatchEvent(event)
    await flushPromises()

    // The browser's own Save-page dialog is suppressed, and the text is sent.
    expect(event.defaultPrevented).toBe(true)
    expect(JournalService.updatePage).toHaveBeenCalledWith(31, { content: 'one, and', version: 3 })
  })

  it('saves what is pending when the tab is hidden', async () => {
    await open()
    await wrapper.get('textarea').setValue('one, and')

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()

    expect(JournalService.updatePage).toHaveBeenCalledWith(31, { content: 'one, and', version: 3 })
  })

  it('saves what is pending when the field loses focus', async () => {
    await open()
    await wrapper.get('textarea').setValue('one, and')

    await wrapper.get('textarea').trigger('focusout')
    await flushPromises()

    expect(JournalService.updatePage).toHaveBeenCalledWith(31, { content: 'one, and', version: 3 })
  })

  it('stops listening once the journal is off screen', async () => {
    await open()
    const removed = vi.spyOn(document, 'removeEventListener')

    wrapper.unmount()
    wrapper = null
    pressSave()
    await flushPromises()

    expect(removed).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(removed).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(JournalService.updatePage).not.toHaveBeenCalled()
  })
})
