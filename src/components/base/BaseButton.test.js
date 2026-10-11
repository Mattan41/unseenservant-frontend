import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'

describe('BaseButton', () => {
  it('defaults to type="button" so it never submits a form implicitly', () => {
    const wrapper = mount(BaseButton)
    expect(wrapper.get('button').attributes('type')).toBe('button')
  })

  it('keeps type="button" when rendered inside a <form>', () => {
    // Regression: the "Formatting help" disclosure under a markdown field is a
    // BaseButton inside a form; an implicit submit would trigger the form save.
    const Form = defineComponent({
      setup: () => () => h('form', [h(BaseButton, { variant: 'link' }, () => 'Formatting help')]),
    })
    const wrapper = mount(Form)
    expect(wrapper.get('button').attributes('type')).toBe('button')
  })

  it('allows type="submit" to be requested explicitly', () => {
    const wrapper = mount(BaseButton, { props: { type: 'submit' } })
    expect(wrapper.get('button').attributes('type')).toBe('submit')
  })

  it('does not fire the form submit handler when clicked inside a form', async () => {
    const onSubmit = vi.fn((event) => event.preventDefault())
    const Form = defineComponent({
      setup: () => () => h('form', { onSubmit }, [h(BaseButton, () => 'Formatting help')]),
    })
    const wrapper = mount(Form)
    await wrapper.get('button').trigger('click')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('emits click when pressed', async () => {
    const wrapper = mount(BaseButton)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
