import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import BaseCarousel from '@/components/base/BaseCarousel.vue'
import CharacterCard from '@/features/character/components/CharacterCard.vue'
import { useAuthStore } from '@/features/auth/authStore.js'
import CampaignService from '@/features/campaign/CampaignService.js'
import CharacterService from '@/features/character/CharacterService.js'

vi.mock('@/features/campaign/CampaignService.js', () => ({
  default: { fetchAllCampaignsForCurrentUser: vi.fn() },
}))
vi.mock('@/features/character/CharacterService.js', () => ({
  default: { fetchAllCharactersForCurrentUser: vi.fn() },
}))

const CAMPAIGNS = [
  {
    id: 'c1',
    name: 'Curse of Strahd',
    primarySystem: 'DND5E',
    participants: [{ id: 'u1' }, { id: 'u2' }],
  },
]

const CHARACTERS = [
  {
    id: 'ch1',
    name: 'Gandalf',
    campaignId: 'c1',
    systemType: 'DND5E',
    dnd5e: { level: 10, race: 'Human', characterClass: 'Wizard' },
  },
]

/**
 * The home page is the hero for everyone, and the visitor's own campaigns and
 * characters as carousels for a session — the strips must stay out of an
 * anonymous visit, and must not put up a heading when a collection is empty.
 */
async function mountHome({
  authenticated = false,
  guest = false,
  campaigns,
  characters,
  characterFetchFails = false,
  pending = false,
} = {}) {
  setActivePinia(createPinia())
  const authStore = useAuthStore()
  authStore.isAuthChecked = true
  authStore.authStatus = authenticated ? 'authenticated' : 'unauthenticated'
  authStore.isGuest = guest

  if (pending) {
    // A request still in flight: the dashboard must not show its empty states.
    CampaignService.fetchAllCampaignsForCurrentUser.mockReturnValue(new Promise(() => {}))
    CharacterService.fetchAllCharactersForCurrentUser.mockReturnValue(new Promise(() => {}))
  } else {
    CampaignService.fetchAllCampaignsForCurrentUser.mockResolvedValue(campaigns ?? CAMPAIGNS)
    if (characterFetchFails) {
      CharacterService.fetchAllCharactersForCurrentUser.mockRejectedValue(new Error('offline'))
    } else {
      CharacterService.fetchAllCharactersForCurrentUser.mockResolvedValue(characters ?? CHARACTERS)
    }
  }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/campaigns', name: 'CampaignsView', component: { template: '<div />' } },
      { path: '/characters', name: 'CharactersView', component: { template: '<div />' } },
      { path: '/characters/create', name: 'CreateCharacter', component: { template: '<div />' } },
      { path: '/campaign/:id', name: 'CampaignView', component: { template: '<div />' } },
      { path: '/characters/:id', name: 'CharacterView', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  const wrapper = mount(HomeView, { global: { plugins: [router] } })
  await flushPromises()

  return wrapper
}

describe('home collections', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows example strips for an anonymous visitor, without fetching anything', async () => {
    const wrapper = await mountHome()
    const carousels = wrapper.findAllComponents(BaseCarousel)

    // The same page, filled with illustrations: examples, not the visitor's data.
    expect(carousels).toHaveLength(2)
    expect(carousels[0].props('label')).toBe('Example campaigns')
    expect(carousels[1].props('label')).toBe('Example characters')
    expect(wrapper.text()).toContain('Example campaigns')
    expect(wrapper.text()).toContain('Sign in to make your own')
    expect(wrapper.get('.welcome-name').text()).toBe('Traveler')
    expect(CampaignService.fetchAllCampaignsForCurrentUser).not.toHaveBeenCalled()
    expect(CharacterService.fetchAllCharactersForCurrentUser).not.toHaveBeenCalled()
  })

  it('offers the discovery tiles when a signed-in collection is empty', async () => {
    const wrapper = await mountHome({ authenticated: true, campaigns: [], characters: [] })

    expect(wrapper.findAllComponents(BaseCarousel)).toHaveLength(0)
    expect(wrapper.text()).toContain("You aren't in any campaign yet.")
    expect(wrapper.text()).toContain("You don't have any characters yet.")
  })

  it('does not flash the empty states while the collections are still loading', async () => {
    const wrapper = await mountHome({ authenticated: true, pending: true })

    expect(wrapper.findAllComponents(BaseCarousel)).toHaveLength(0)
    expect(wrapper.text()).not.toContain("You aren't in any campaign yet.")
    expect(wrapper.text()).not.toContain("You don't have any characters yet.")
  })

  it('shows a strip per collection for a signed-in account', async () => {
    const wrapper = await mountHome({ authenticated: true })
    const carousels = wrapper.findAllComponents(BaseCarousel)

    expect(carousels).toHaveLength(2)
    expect(carousels[0].props('items')).toHaveLength(1)
    expect(carousels[1].props('items')).toHaveLength(1)
    expect(wrapper.text()).toContain('Campaigns')
    expect(wrapper.text()).toContain('Curse of Strahd')
    expect(wrapper.text()).toContain('Characters')
    expect(wrapper.text()).toContain('Gandalf')
  })

  it('renders the plain welcome heading, with no rainbow name', async () => {
    const wrapper = await mountHome({ authenticated: true })

    expect(wrapper.find('.page-heading').exists()).toBe(true)
    expect(wrapper.find('.page-heading-rule').exists()).toBe(true)
    expect(wrapper.find('.rainbow-text').exists()).toBe(false)
  })

  it('renders characters through the shared card, marking the home context', async () => {
    const wrapper = await mountHome({ authenticated: true })
    const card = wrapper.findComponent(CharacterCard)

    expect(card.exists()).toBe(true)
    expect(card.props('campaignName')).toBe('Curse of Strahd')
    expect(card.get('a').attributes('href')).toBe('/characters/ch1?from=home')
  })

  it('shows the Guest Demo collections as well, since a guest has a session', async () => {
    const wrapper = await mountHome({ guest: true })

    expect(wrapper.findAllComponents(BaseCarousel)).toHaveLength(2)
  })

  it('leaves out a collection that is empty', async () => {
    const wrapper = await mountHome({ authenticated: true, campaigns: [], characters: CHARACTERS })
    const carousels = wrapper.findAllComponents(BaseCarousel)

    expect(carousels).toHaveLength(1)
    expect(carousels[0].props('label')).toBe('Characters')
    expect(wrapper.text()).not.toContain('Curse of Strahd')
  })

  it('keeps the strips up when one of the two fetches fails', async () => {
    // The store logs the failure before rethrowing; that log is not asserted here.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = await mountHome({ authenticated: true, characterFetchFails: true })
    consoleError.mockRestore()
    const carousels = wrapper.findAllComponents(BaseCarousel)

    expect(carousels).toHaveLength(1)
    expect(carousels[0].props('label')).toBe('Campaigns')
  })
})
