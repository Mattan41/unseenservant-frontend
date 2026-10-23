import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseCarousel from '@/components/base/BaseCarousel.vue'

const mounted = []
function mountCarousel(options) {
  const wrapper = mount(BaseCarousel, options)
  mounted.push(wrapper)
  return wrapper
}

afterEach(() => {
  while (mounted.length) mounted.pop().unmount()
})

const ITEMS = [
  { id: 1, name: 'Aragorn' },
  { id: 2, name: 'Bilbo' },
  { id: 3, name: 'Celeborn' },
]

/**
 * jsdom lays nothing out, so a strip is zero-wide there and the controls stay
 * hidden. Give the track a fake overflow and let the component re-measure, the
 * way a viewport resize does in the browser.
 */
function makeStripScrollable(wrapper, { scrollWidth = 800, clientWidth = 300 } = {}) {
  const track = wrapper.get('ul')
  Object.defineProperty(track.element, 'scrollWidth', { value: scrollWidth, configurable: true })
  Object.defineProperty(track.element, 'clientWidth', { value: clientWidth, configurable: true })
  window.dispatchEvent(new Event('resize'))
  return track
}

describe('BaseCarousel', () => {
  it('renders one item per entry, through the item slot', () => {
    const wrapper = mountCarousel({
      props: { items: ITEMS },
      slots: { item: '<p>{{ params.item.name }}</p>' },
    })

    expect(wrapper.findAll('li')).toHaveLength(3)
    expect(wrapper.text()).toContain('Aragorn')
    expect(wrapper.text()).toContain('Celeborn')
  })

  it('renders nothing inside the strip when there are no items', () => {
    const wrapper = mountCarousel({ props: { items: [] } })

    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  it('names the strip for assistive tech', () => {
    const wrapper = mountCarousel({ props: { items: ITEMS, label: 'Campaigns' } })

    expect(wrapper.get('ul').attributes('aria-label')).toBe('Campaigns')
  })

  it('adds itemClass to every item wrapper', () => {
    const wrapper = mountCarousel({ props: { items: ITEMS, itemClass: 'w-40' } })

    expect(wrapper.findAll('li').every((item) => item.classes().includes('w-40'))).toBe(true)
  })

  it('leaves the controls out while the strip does not overflow', () => {
    const wrapper = mountCarousel({ props: { items: ITEMS } })

    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('offers previous and next once the strip overflows', async () => {
    const wrapper = mountCarousel({ props: { items: ITEMS, label: 'Campaigns' } })

    makeStripScrollable(wrapper)
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('aria-label')).toBe('Previous Campaigns')
    expect(buttons[1].attributes('aria-label')).toBe('Next Campaigns')
    // At the start of the strip only the forward control is usable.
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[1].attributes('disabled')).toBeUndefined()
  })

  it('never renders the controls when they are turned off', async () => {
    const wrapper = mountCarousel({ props: { items: ITEMS, controls: false } })

    makeStripScrollable(wrapper)
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('steps a whole item forward when next is pressed', async () => {
    const wrapper = mountCarousel({ props: { items: ITEMS, label: 'Characters' } })
    const track = makeStripScrollable(wrapper)
    const scrollBy = vi.fn()
    track.element.scrollBy = scrollBy
    vi.spyOn(track.element.firstElementChild, 'getBoundingClientRect').mockReturnValue({
      width: 256,
    })
    await wrapper.vm.$nextTick()

    await wrapper.findAll('button')[1].trigger('click')

    expect(scrollBy).toHaveBeenCalledWith({ left: 256, behavior: 'smooth' })
  })
})
