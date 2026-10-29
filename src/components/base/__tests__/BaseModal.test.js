import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseModal from '@/components/base/BaseModal.vue'

const mounted = []
function mountModal(options) {
  const wrapper = mount(BaseModal, options)
  mounted.push(wrapper)
  return wrapper
}

/** The dialog element itself — which *is* the modal, not a wrapper around one. */
function dialogEl(wrapper) {
  return wrapper.get('dialog')
}

afterEach(() => {
  while (mounted.length) mounted.pop().unmount()
})

describe('BaseModal', () => {
  it('renders its slot content', () => {
    const wrapper = mountModal({ slots: { default: '<p>Hello</p>' } })
    expect(wrapper.text()).toContain('Hello')
  })

  it('is a native dialog, open while mounted', () => {
    const wrapper = mountModal()

    expect(dialogEl(wrapper).element.tagName).toBe('DIALOG')
    // A browser opens it with `showModal()`; jsdom has no dialog implementation,
    // so there the `open` attribute is what marks it open (see BaseModal).
    expect(dialogEl(wrapper).attributes('open')).toBeDefined()
  })

  it('locks body scroll while mounted and releases it on unmount', () => {
    // Mounted outside the shared cleanup so the release can be observed here.
    const wrapper = mount(BaseModal)
    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('asks the caller to close on Escape', async () => {
    const wrapper = mountModal()

    await dialogEl(wrapper).trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('keeps the platform from closing it behind the caller', () => {
    const wrapper = mountModal()
    // The platform's own Escape handling arrives as `cancel`; it is suppressed,
    // so the `close` event above is the only way out (the caller's state).
    const cancel = new Event('cancel', { cancelable: true })

    dialogEl(wrapper).element.dispatchEvent(cancel)

    expect(cancel.defaultPrevented).toBe(true)
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('closes when the click lands on the dimming area', async () => {
    const wrapper = mountModal()

    await dialogEl(wrapper).trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not close when the click lands on the panel', async () => {
    const wrapper = mountModal({ slots: { default: '<div class="panel">panel</div>' } })
    await wrapper.get('.panel').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('puts the caller’s attributes on the dialog, which carries its name', () => {
    const wrapper = mountModal({ attrs: { 'aria-label': 'Page preview' } })

    expect(dialogEl(wrapper).attributes('aria-label')).toBe('Page preview')
    // Not on a panel inside it: a role or a name there would be redundant.
    expect(dialogEl(wrapper).attributes('role')).toBeUndefined()
  })

  it('keeps the caller’s stacking order, for dialogs stacked on each other', () => {
    const wrapper = mountModal({ props: { zIndex: 'z-[100]' } })

    expect(dialogEl(wrapper).classes()).toContain('base-modal')
    expect(dialogEl(wrapper).classes()).toContain('z-[100]')
  })

  it('gives the keyboard back to whatever opened it', async () => {
    const harness = mount(
      {
        components: { BaseModal },
        template: `
          <div>
            <button class="opener" @click="open = true">Open</button>
            <BaseModal v-if="open" @close="open = false"><p>Panel</p></BaseModal>
          </div>`,
        data: () => ({ open: false }),
      },
      { attachTo: document.body },
    )
    mounted.push(harness)

    // jsdom does not focus a button on click, and has no `showModal()` to move
    // focus into the dialog, so both are done by hand: the point is that the
    // opener is remembered and focused again when the dialog goes away.
    harness.get('.opener').element.focus()
    await harness.get('.opener').trigger('click')
    harness.get('dialog').element.focus()

    harness.vm.open = false
    await nextTick()

    expect(document.activeElement).toBe(harness.get('.opener').element)
  })
})
