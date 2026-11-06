import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import JournalBoard from '@/features/journal/components/JournalBoard.vue'
import JournalService from '@/features/journal/JournalService.js'
import { useJournalStore } from '@/features/journal/journalStore.js'
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

// The tabs read a campaign's characters; the board only ever reads them and asks
// the store's existing action to load them, so a small stub is enough.
const { campaignStub } = vi.hoisted(() => ({
  campaignStub: {
    characters: [],
    loadingCharacters: false,
    campaignCharacters: {},
    getCharactersByCampaignId: vi.fn(),
    fetchCharactersForCampaign: vi.fn(),
  },
}))

vi.mock('@/features/campaign/campaignStore.js', () => ({
  useCampaignStore: () => campaignStub,
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

/** Two stored pages, page 2 edited most recently — the page a reader wants. */
const TWO_PAGES_WITH_TIMES = {
  id: 4,
  campaignId: CAMPAIGN_ID,
  userId: USER.id,
  pageCount: 2,
  pages: [
    { ...PAGE, id: 31, pageNumber: 1, content: 'older', updatedAt: '2026-01-01T00:00:00Z' },
    { ...PAGE, id: 32, pageNumber: 2, content: 'newest', updatedAt: '2026-03-01T00:00:00Z' },
  ],
}

/** A real router, so `BaseLinkButton` renders an `<a>` rather than an unresolved stub. */
const testRouter = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/characters/:id', name: 'CharacterView', component: { template: '<div />' } },
    { path: '/:catchAll(.*)*', component: { template: '<div />' } },
  ],
})

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
    campaignStub.characters = []
    campaignStub.campaignCharacters = {}
    campaignStub.loadingCharacters = false
    campaignStub.getCharactersByCampaignId.mockImplementation(() => campaignStub.characters)
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
    wrapper = mount(JournalBoard, {
      props: { campaignId: CAMPAIGN_ID },
      global: { plugins: [testRouter] },
    })
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

  it('opens on the most recently edited page, not page 1', async () => {
    JournalService.fetchJournal.mockResolvedValue(TWO_PAGES_WITH_TIMES)

    await open()

    expect(useJournalStore().currentPageNumber).toBe(2)
    expect(wrapper.get('textarea').element.value).toBe('newest')
  })

  it('keeps an in-progress draft instead of jumping to the newest page', async () => {
    // Unsaved text is where the reader was: the default must never move them.
    useJournalStore().saveState = 'dirty'
    JournalService.fetchJournal.mockResolvedValue(TWO_PAGES_WITH_TIMES)

    await open()

    expect(useJournalStore().currentPageNumber).toBe(1)
    expect(wrapper.get('textarea').element.value).toBe('older')
  })

  it('shows no tab bar when the participant has no character in the campaign', async () => {
    campaignStub.characters = [{ id: 2, name: 'Doc', ownerId: 9 }]

    await open()

    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
  })

  it('gives a tab to each owned character only, and reads it read-only', async () => {
    campaignStub.characters = [
      {
        id: 1,
        name: 'Vex',
        ownerId: USER.id,
        notes: 'Vex notes',
        backstory: 'Vex story',
        privateBackstory: 'Vex secret',
      },
      // Someone else's character: never a tab.
      { id: 2, name: 'Doc', ownerId: 9, notes: 'Doc notes' },
    ]

    await open()

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((tab) => tab.text())).toEqual(['Campaign', 'Vex'])

    await tabs[1].trigger('click')

    const panel = wrapper.get('[role="tabpanel"][aria-labelledby="journal-tab-1"]')
    expect(panel.text()).toContain('Vex notes')
    expect(panel.text()).toContain('Vex story')
    expect(panel.text()).toContain('Vex secret')
    expect(panel.find('a[href="/characters/1"]').exists()).toBe(true)
  })

  it('omits the private backstory block when the API did not return it', async () => {
    campaignStub.characters = [{ id: 1, name: 'Vex', ownerId: USER.id, notes: 'Vex notes' }]

    await open()

    // Vex is the second tab (Campaign is first).
    const vexTab = wrapper.findAll('[role="tab"]')[1]
    await vexTab.trigger('click')

    const panel = wrapper.get('[role="tabpanel"][aria-labelledby="journal-tab-1"]')
    expect(panel.text()).not.toContain('Private —')
  })
})
