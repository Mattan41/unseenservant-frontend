import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ContextNavList from '@/components/base/ContextNavList.vue'

/**
 * The section list is shared by the campaign rail and the settings rail, so what
 * matters here is that the badge is optional and that a badged button still says
 * something a screen reader can act on.
 */
const ITEMS = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'messages', label: 'Messages', icon: 'messages' },
  { key: 'lore', label: 'World Lore & Background', icon: 'lore' },
]

function mountList(props = {}) {
  return mount(ContextNavList, {
    props: { items: ITEMS, activeSection: 'overview', ...props },
  })
}

const buttons = (wrapper) => wrapper.findAll('button')

describe('ContextNavList', () => {
  it('renders one button per item, marking the active section', () => {
    const wrapper = mountList({ activeSection: 'messages' })

    expect(buttons(wrapper)).toHaveLength(ITEMS.length)
    expect(buttons(wrapper)[1].classes()).toContain('context-nav-item--active')
    expect(buttons(wrapper)[1].attributes('aria-current')).toBe('page')
    expect(buttons(wrapper)[0].attributes('aria-current')).toBeUndefined()
  })

  it('emits the section key when an item is chosen', async () => {
    const wrapper = mountList()

    await buttons(wrapper)[2].trigger('click')

    expect(wrapper.emitted('select')).toEqual([['lore']])
  })

  it('renders no marker when the items carry none', () => {
    const wrapper = mountList()

    expect(wrapper.findAll('.context-nav-badge')).toHaveLength(0)
    // An unbadged button keeps its own visible label as the accessible name.
    expect(buttons(wrapper)[1].attributes('aria-label')).toBeUndefined()
  })

  it('shows a count, capped so a long campaign cannot widen the rail', () => {
    const items = [{ ...ITEMS[1], badge: 3 }, { ...ITEMS[2], badge: 120 }, ITEMS[0]]
    const wrapper = mountList({ items })

    const badges = wrapper.findAll('.context-nav-badge')
    expect(badges).toHaveLength(2)
    expect(badges[0].text()).toBe('3')
    expect(badges[1].text()).toBe('99+')
    // A count of 0 is not a badge.
    expect(buttons(wrapper)[2].find('.context-nav-badge').exists()).toBe(false)
  })

  it('shows a dot for a section that changed with nothing to count', () => {
    const wrapper = mountList({ items: [{ ...ITEMS[2], dot: true }, ITEMS[1]] })

    const badge = buttons(wrapper)[0].find('.context-nav-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.classes()).toContain('context-nav-badge--dot')
    expect(badge.text()).toBe('')
  })

  it('prefers the count over the dot when an item carries both', () => {
    const wrapper = mountList({ items: [{ ...ITEMS[1], badge: 2, dot: true }] })

    const badge = buttons(wrapper)[0].find('.context-nav-badge')
    expect(badge.text()).toBe('2')
    expect(badge.classes()).not.toContain('context-nav-badge--dot')
  })

  it('names a badged button after its badge, since a digit or a dot says nothing', () => {
    const wrapper = mountList({
      items: [
        { ...ITEMS[1], badge: 3 },
        { ...ITEMS[2], dot: true },
        { ...ITEMS[0], badge: 120 },
      ],
    })

    expect(buttons(wrapper)[0].attributes('aria-label')).toBe('Messages — 3 unread')
    expect(buttons(wrapper)[1].attributes('aria-label')).toBe(
      'World Lore & Background — changed since you last opened it',
    )
    // The label names the full count, not the capped one that is painted.
    expect(buttons(wrapper)[2].attributes('aria-label')).toBe('Overview — 120 unread')
  })
})
