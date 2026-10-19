import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseClampedText from '@/components/base/BaseClampedText.vue'

const SHORT = 'A short note.'
const LONG = '**Bold** start. ' + 'A sentence that runs on and on. '.repeat(20)

// Teleport is stubbed so the dialog stays inside the wrapper tree.
const MOUNT_OPTIONS = { global: { stubs: { teleport: true } } }

const mounted = []
function mountClamped(props) {
  const wrapper = mount(BaseClampedText, { props, ...MOUNT_OPTIONS })
  mounted.push(wrapper)
  return wrapper
}

/** The reveal toggle (not the dialog's close button). */
function revealTrigger(wrapper) {
  return wrapper.findAll('button').find((button) => /read more|show less/i.test(button.text()))
}

afterEach(() => {
  while (mounted.length) mounted.pop().unmount()
})

describe('BaseClampedText', () => {
  it('renders short text without a reveal control', () => {
    const wrapper = mountClamped({ text: SHORT })
    expect(wrapper.text()).toContain('A short note.')
    expect(revealTrigger(wrapper)).toBeUndefined()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('expands and collapses in place in the default inline mode', async () => {
    const wrapper = mountClamped({ text: LONG })
    expect(wrapper.find('.line-clamp-4').exists()).toBe(true)

    await revealTrigger(wrapper).trigger('click')
    expect(wrapper.find('.line-clamp-4').exists()).toBe(false)
    expect(wrapper.text()).toContain('Show less')

    await revealTrigger(wrapper).trigger('click')
    expect(wrapper.find('.line-clamp-4').exists()).toBe(true)
  })

  it('opens the full text in a dialog in modal mode', async () => {
    const wrapper = mountClamped({ text: LONG, mode: 'modal', title: 'Backstory' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await revealTrigger(wrapper).trigger('click')

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.text()).toContain('Backstory')
    expect(dialog.get('.rich-text').text()).toContain('Bold')
    // Body scroll is locked while the dialog is open.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('closes the dialog on the close button and on Escape', async () => {
    const wrapper = mountClamped({ text: LONG, mode: 'modal', title: 'Backstory' })

    await revealTrigger(wrapper).trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    await wrapper.get('[aria-label="Close"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.body.style.overflow).toBe('')

    await revealTrigger(wrapper).trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})
