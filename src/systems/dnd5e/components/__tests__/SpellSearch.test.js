import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SpellSearch from '@/systems/dnd5e/components/SpellSearch.vue'
import { useDnd5eSpellStore } from '@/systems/dnd5e/dnd5eSpellStore.js'

/**
 * The result row is a disclosure: the row itself is a native button (so
 * Enter/Space work natively and no `role="button"` is needed), and the row's own
 * "+ Add" control is a *sibling* of that button — a button must not contain
 * another control, and a click on it must not toggle the row.
 */
const SPELL = {
  key: 'srd_fireball',
  name: 'Fireball',
  level: 3,
  levelLabel: '3rd level',
  school: 'Evocation',
  sourceLabel: 'SRD 5.1',
  concentration: false,
  ritual: false,
  desc: 'A bright streak flashes from your pointing finger.',
}

function mountSearch({ characterId = null } = {}) {
  setActivePinia(createPinia())

  const spellStore = useDnd5eSpellStore()
  spellStore.searchResults = [SPELL]
  spellStore.currentQuery = 'fire'
  spellStore.totalResults = 1

  return mount(SpellSearch, { props: { characterId } })
}

/** The disclosure row: the only button that carries `aria-expanded`. */
function rowButton(wrapper) {
  return wrapper
    .findAll('button')
    .find((button) => button.attributes('aria-expanded') !== undefined)
}

/** The row's secondary control. */
function addButton(wrapper) {
  return wrapper.findAll('button').find((button) => button.text() === '+ Add')
}

describe('SpellSearch result rows', () => {
  it('renders the row as a native button, not a div with the button role', () => {
    const wrapper = mountSearch()

    expect(rowButton(wrapper).element.tagName).toBe('BUTTON')
    expect(rowButton(wrapper).classes()).toContain('base-btn-row')
    expect(rowButton(wrapper).attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[role="button"]').exists()).toBe(false)
  })

  it('expands and collapses the details when the row is clicked', async () => {
    const wrapper = mountSearch()

    await rowButton(wrapper).trigger('click')
    expect(rowButton(wrapper).attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('A bright streak flashes from your pointing finger.')

    await rowButton(wrapper).trigger('click')
    expect(rowButton(wrapper).attributes('aria-expanded')).toBe('false')
  })

  it('keeps "+ Add" out of the row button, and clicking it leaves the row closed', async () => {
    const wrapper = mountSearch({ characterId: 7 })

    expect(rowButton(wrapper).find('button').exists()).toBe(false)

    await addButton(wrapper).trigger('click')

    expect(wrapper.emitted('save')[0][0].key).toBe('srd_fireball')
    expect(rowButton(wrapper).attributes('aria-expanded')).toBe('false')
  })

  it('hides "+ Add" when there is no character context', () => {
    const wrapper = mountSearch()

    expect(addButton(wrapper)).toBeUndefined()
  })
})
