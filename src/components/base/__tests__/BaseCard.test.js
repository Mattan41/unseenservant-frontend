import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseCard from '@/components/base/BaseCard.vue'

const mounted = []
function mountCard(options) {
  const wrapper = mount(BaseCard, options)
  mounted.push(wrapper)
  return wrapper
}

afterEach(() => {
  while (mounted.length) mounted.pop().unmount()
})

describe('BaseCard', () => {
  it('renders its slot content', () => {
    const wrapper = mountCard({ slots: { default: '<p>Card body</p>' } })
    expect(wrapper.text()).toContain('Card body')
  })

  it('stays a plain, non-focusable div by default', async () => {
    const wrapper = mountCard({ slots: { default: 'Card body' } })

    expect(wrapper.attributes('role')).toBeUndefined()
    expect(wrapper.attributes('tabindex')).toBeUndefined()

    await wrapper.trigger('click')
    await wrapper.trigger('keydown', { key: 'Enter' })
    await wrapper.trigger('keydown', { key: ' ' })

    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('exposes a clickable card as a keyboard-reachable button', () => {
    const wrapper = mountCard({ props: { clickable: true } })

    expect(wrapper.attributes('role')).toBe('button')
    expect(wrapper.attributes('tabindex')).toBe('0')
  })

  it('emits click when a clickable card is clicked', async () => {
    const wrapper = mountCard({ props: { clickable: true } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('emits click when a clickable card is activated with Enter', async () => {
    const wrapper = mountCard({ props: { clickable: true } })

    await wrapper.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('emits click when a clickable card is activated with Space', async () => {
    const wrapper = mountCard({ props: { clickable: true } })

    await wrapper.trigger('keydown', { key: ' ' })

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('leaves the card action to a nested control when it is clicked', async () => {
    // The Save/Remove buttons inside a spell or character card own their own
    // clicks — the card must not navigate as well.
    const wrapper = mountCard({
      props: { clickable: true },
      slots: { default: '<button type="button">Save</button><a href="#detail">Open</a>' },
    })

    await wrapper.get('button').trigger('click')
    await wrapper.get('a').trigger('click')

    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('leaves the card action to a nested control when it is activated by key', async () => {
    const wrapper = mountCard({
      props: { clickable: true },
      slots: { default: '<button type="button">Save</button>' },
    })

    await wrapper.get('button').trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
