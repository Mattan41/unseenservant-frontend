import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SlideOverDrawer from '@/components/base/SlideOverDrawer.vue'

const mounted = []
function mountDrawer(props) {
  const wrapper = mount(SlideOverDrawer, { props })
  mounted.push(wrapper)
  return wrapper
}

afterEach(() => {
  while (mounted.length) mounted.pop().unmount()
  // The drawer teleports into <body>; clear what is left of the DOM.
  document.body.innerHTML = ''
})

/** The teleported dimming layer (outside the wrapper's own element tree). */
function backdrop() {
  return document.querySelector('.slide-over-backdrop')
}

describe('SlideOverDrawer', () => {
  it('renders nothing while it is closed', () => {
    mountDrawer({ modelValue: false })

    expect(backdrop()).toBeNull()
    expect(document.querySelector('.slide-over-panel')).toBeNull()
  })

  it('offers the dimming layer as a labelled native button', async () => {
    mountDrawer({ modelValue: true, label: 'Main menu' })
    await nextTick()

    const element = backdrop()

    // A real button, so Enter/Space activation is native behaviour; nothing
    // removes it from the tab order.
    expect(element.tagName).toBe('BUTTON')
    expect(element.getAttribute('type')).toBe('button')
    expect(element.getAttribute('aria-label')).toBe('Close Main menu')
    expect(element.getAttribute('tabindex')).toBeNull()
  })

  it('closes on a backdrop click', async () => {
    const wrapper = mountDrawer({ modelValue: true })
    await nextTick()

    backdrop().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('closes on Escape when it is already open at mount', async () => {
    const wrapper = mountDrawer({ modelValue: true })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('locks body scroll while open and releases it when it unmounts', () => {
    const wrapper = mountDrawer({ modelValue: true })
    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('leaves the body alone when it is mounted closed', () => {
    // The lock belongs to the overlays that are actually open; a drawer that
    // never opened must not release someone else's lock.
    document.body.style.overflow = 'hidden'

    mountDrawer({ modelValue: false })

    expect(document.body.style.overflow).toBe('hidden')
    document.body.style.overflow = ''
  })
})
