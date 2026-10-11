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

afterEach(() => {
  while (mounted.length) mounted.pop().unmount()
})

describe('BaseModal', () => {
  it('renders its slot content', () => {
    const wrapper = mountModal({ slots: { default: '<p>Hello</p>' } })
    expect(wrapper.text()).toContain('Hello')
  })

  it('locks body scroll while mounted and releases it on unmount', () => {
    // Mounted outside the shared cleanup so the release can be observed here.
    const wrapper = mount(BaseModal)
    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('emits close on Escape', async () => {
    const wrapper = mountModal()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the backdrop itself is clicked', async () => {
    const wrapper = mountModal()
    await wrapper.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not close when the click lands on the panel', async () => {
    const wrapper = mountModal({ slots: { default: '<div class="panel">panel</div>' } })
    await wrapper.get('.panel').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
