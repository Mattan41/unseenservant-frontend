import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CharacterCard from '@/features/character/components/CharacterCard.vue'

const mounted = []
afterEach(() => {
  while (mounted.length) mounted.pop().unmount()
})

/** The card links through a `RouterLink`, so every mount needs a router. */
async function mountCard(character, props = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/characters/:id', name: 'CharacterView', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  const wrapper = mount(CharacterCard, {
    props: { character, ...props },
    global: { plugins: [router] },
  })
  mounted.push(wrapper)
  return wrapper
}

const DND5E_CHARACTER = {
  id: 'ch1',
  name: 'Gandalf',
  campaignId: 'c1',
  systemType: 'DND5E',
  avatarUrl: '/defaultCharacter.svg',
  dnd5e: { level: 10, race: 'Human', characterClass: 'Wizard' },
}

describe('CharacterCard', () => {
  it('links to the character with the list context by default', async () => {
    const wrapper = await mountCard(DND5E_CHARACTER)

    expect(wrapper.get('a').attributes('href')).toBe('/characters/ch1?from=characterList')
  })

  it("carries the caller's own context in `from`", async () => {
    const wrapper = await mountCard(DND5E_CHARACTER, { from: 'home' })

    expect(wrapper.get('a').attributes('href')).toBe('/characters/ch1?from=home')
  })

  it('shows the campaign name it is given', async () => {
    const wrapper = await mountCard(DND5E_CHARACTER, { campaignName: 'Lavendelhavet' })

    expect(wrapper.text()).toContain('Lavendelhavet')
  })

  it('falls back to a neutral campaign label', async () => {
    const wrapper = await mountCard(DND5E_CHARACTER)

    expect(wrapper.text()).toContain('No campaign')
  })

  it('tags a 5e character with race, class and level', async () => {
    const wrapper = await mountCard(DND5E_CHARACTER)

    expect(wrapper.text()).toContain('Human')
    expect(wrapper.text()).toContain('Wizard')
    expect(wrapper.text()).toContain('Level 10')
  })

  it('tags an Offworlders character with its health', async () => {
    const wrapper = await mountCard({
      id: 'ch2',
      name: 'Ripley',
      systemType: 'OFFWORLDERS',
      offworlders: { species: 'Android', characterClass: 'Geek', health: 12, currentHealth: 12 },
    })

    expect(wrapper.text()).toContain('Android')
    expect(wrapper.text()).toContain('HP 12/12')
  })

  it('names the system of a character that has no system block', async () => {
    const wrapper = await mountCard({ id: 'ch3', name: 'Nameless', systemType: null })

    expect(wrapper.text()).toContain('No system')
  })

  it('offers the card itself as the only control', async () => {
    const wrapper = await mountCard(DND5E_CHARACTER)

    // "View Details" is the link's affordance — a link cannot nest a control.
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.text()).toContain('View Details')
  })
})
