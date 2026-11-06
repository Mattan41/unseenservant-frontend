import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import CharacterView from '@/features/character/views/CharacterView.vue'
import CharacterService from '@/features/character/CharacterService.js'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useUserStore } from '@/features/user/userStore.js'

vi.mock('@/features/character/CharacterService.js', () => ({
  default: { fetchCharacter: vi.fn() },
}))

// The system sheet is a heavy subtree with nothing here under test.
vi.mock('@/features/character/dispatchers/SystemSheetRouter.vue', () => ({
  default: { name: 'SystemSheetRouter', template: '<div />' },
}))

// Recording a view writes to localStorage; nothing here is about recency.
vi.mock('@/utils/useViewRecency.js', () => ({ useViewRecency: vi.fn() }))

const OWNER_ID = 7
const CHARACTER = {
  id: 5,
  ownerId: OWNER_ID,
  name: 'Kestrel',
  systemType: '',
  avatarUrl: '/images/portrait.png',
  imageUrls: ['/images/a.png', '/images/b.png'],
}

const wrappers = []
afterEach(() => {
  while (wrappers.length) wrappers.pop().unmount()
})

async function mountView({ owner = true, guest = false, character = CHARACTER } = {}) {
  setActivePinia(createPinia())
  useAuthStore().isGuest = guest
  useUserStore().currentUser = { id: owner ? OWNER_ID : 999, username: 'player' }
  CharacterService.fetchCharacter.mockResolvedValue({ ...character })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/characters', name: 'CharactersView', component: { template: '<div />' } },
      { path: '/characters/:id', name: 'CharacterView', component: { template: '<div />' } },
      { path: '/characters/:id/edit', name: 'EditCharacter', component: { template: '<div />' } },
      { path: '/campaign/:id', name: 'CampaignView', component: { template: '<div />' } },
    ],
  })
  await router.push(`/characters/${character.id}`)
  await router.isReady()

  const wrapper = mount(CharacterView, { global: { plugins: [router] } })
  await flushPromises()
  wrappers.push(wrapper)
  return wrapper
}

const buttonByText = (wrapper, text) =>
  wrapper.findAll('button').find((button) => button.text() === text)

/**
 * The view-mode image entry points: an owner changes the avatar and adds gallery
 * images without entering Edit, a non-owner gets neither, and the gallery opens
 * its own lightbox.
 */
describe('CharacterView — images from view mode', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows the avatar "Change image" affordance to the owner', async () => {
    const wrapper = await mountView({ owner: true })

    expect(buttonByText(wrapper, 'Change image')).toBeTruthy()
  })

  it('hides the avatar affordance from a non-owner', async () => {
    const wrapper = await mountView({ owner: false })

    expect(buttonByText(wrapper, 'Change image')).toBeFalsy()
  })

  it('renders one gallery thumbnail per image and opens the lightbox on click', async () => {
    const wrapper = await mountView()

    const thumbnails = wrapper.findAll('button[aria-label^="View "]')
    expect(thumbnails).toHaveLength(2)

    await thumbnails[0].trigger('click')

    expect(wrapper.find('dialog').exists()).toBe(true)
  })

  it('hides the upload affordances in guest mode and says why', async () => {
    const wrapper = await mountView({ guest: true })

    expect(buttonByText(wrapper, 'Change image')).toBeFalsy()
    expect(buttonByText(wrapper, 'Add image')).toBeFalsy()
    expect(wrapper.find('.guest-notice').exists()).toBe(true)
  })
})
