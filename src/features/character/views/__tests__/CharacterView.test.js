import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import CharacterView from '@/features/character/views/CharacterView.vue'
import CharacterService from '@/features/character/CharacterService.js'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useUnsavedChanges } from '@/utils/useUnsavedChanges.js'

vi.mock('@/features/character/CharacterService.js', () => ({
  default: { fetchCharacter: vi.fn(), updateCharacterField: vi.fn() },
}))

// The system sheet is a heavy subtree with nothing here under test.
vi.mock('@/features/character/dispatchers/SystemSheetRouter.vue', () => ({
  default: { name: 'SystemSheetRouter', template: '<div />' },
}))

// Recording a view writes to localStorage; nothing here is about recency.
vi.mock('@/utils/useViewRecency.js', () => ({ useViewRecency: vi.fn() }))

// The route guard itself is shared and tested through its own callers; here we
// only check that the view wires a note's unsaved text into it.
vi.mock('@/utils/useUnsavedChanges.js', () => ({ useUnsavedChanges: vi.fn() }))

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
 * A control inside a section card. Scoped to `li` because the view's own
 * "Edit" link reads the same as a section's Edit button.
 */
const sectionButton = (wrapper, text) =>
  wrapper.findAll('li button').find((button) => button.text() === text)

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
    expect(wrapper.find('#character-avatar-input').exists()).toBe(false)
    expect(wrapper.find('#character-gallery-input').exists()).toBe(false)
    expect(wrapper.find('.guest-notice').exists()).toBe(true)
  })
})

/**
 * Sections belong to the character and save through the ordinary character
 * PATCH. Only the owner may write; everyone who can see the character reads.
 */
describe('CharacterView — sections', () => {
  const SECTIONS = [
    { id: 's1', title: 'Cargo', body: 'Two crates of medical supplies.' },
    { id: 's2', title: 'Leads', body: 'A rumour about the Dry Dock.' },
  ]

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows the sections to any viewer', async () => {
    const wrapper = await mountView({ owner: false, character: { ...CHARACTER, sections: SECTIONS } })

    const titles = wrapper.findAll('li h5').map((heading) => heading.text())
    expect(titles).toEqual(['Cargo', 'Leads'])
  })

  it('offers no add/edit/delete controls to a non-owner', async () => {
    const wrapper = await mountView({ owner: false, character: { ...CHARACTER, sections: SECTIONS } })

    expect(buttonByText(wrapper, 'Add note')).toBeFalsy()
    // Scoped to the section cards: the view's own "Edit" link is not a section
    // control and must not be mistaken for one.
    expect(sectionButton(wrapper, 'Edit')).toBeFalsy()
    expect(sectionButton(wrapper, 'Delete')).toBeFalsy()
  })

  it('adds a section through the character store and shows it', async () => {
    const wrapper = await mountView({ owner: true })
    CharacterService.updateCharacterField.mockImplementation(async (id, field, value) => ({
      ...CHARACTER,
      id,
      [field]: value,
    }))

    await buttonByText(wrapper, 'Add note').trigger('click')
    await wrapper.find('#new-section-title').setValue('Cargo')
    await wrapper.find('#new-section-body').setValue('Two crates.')
    await buttonByText(wrapper, 'Add note').trigger('click')
    await flushPromises()

    expect(CharacterService.updateCharacterField).toHaveBeenCalledTimes(1)
    const [id, field, sections] = CharacterService.updateCharacterField.mock.calls[0]
    expect(id).toBe(CHARACTER.id)
    expect(field).toBe('sections')
    expect(sections).toHaveLength(1)
    expect(sections[0]).toMatchObject({ title: 'Cargo', body: 'Two crates.' })

    expect(wrapper.findAll('li h5').map((heading) => heading.text())).toEqual(['Cargo'])
  })

  it('asks before leaving while a note is being typed', async () => {
    const wrapper = await mountView({ owner: true })
    const [isDirty, message] = useUnsavedChanges.mock.calls.at(-1)

    expect(message).toMatch(/unsaved changes in a note/)
    expect(isDirty()).toBe(false)

    await buttonByText(wrapper, 'Add note').trigger('click')
    await wrapper.find('#new-section-title').setValue('Cargo')
    await flushPromises()

    expect(isDirty()).toBe(true)
  })

  it('saves an edited section with its id kept', async () => {
    const wrapper = await mountView({ owner: true, character: { ...CHARACTER, sections: SECTIONS } })
    CharacterService.updateCharacterField.mockImplementation(async (id, field, value) => ({
      ...CHARACTER,
      id,
      [field]: value,
    }))

    await sectionButton(wrapper, 'Edit').trigger('click')
    await wrapper.find('#section-body-s1').setValue('Three crates now.')
    await sectionButton(wrapper, 'Save').trigger('click')
    await flushPromises()

    const [, , sections] = CharacterService.updateCharacterField.mock.calls[0]
    expect(sections[0]).toEqual({ id: 's1', title: 'Cargo', body: 'Three crates now.' })
    expect(sections[1]).toEqual(SECTIONS[1])
  })
})
