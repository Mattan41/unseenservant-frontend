import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseNumberStepper from '@/components/base/BaseNumberStepper.vue'

describe('BaseNumberStepper', () => {
  it('renders the value and both buttons when editable', () => {
    const wrapper = mount(BaseNumberStepper, { props: { modelValue: 2 } })
    expect(wrapper.text()).toContain('2')
    expect(wrapper.findAll('button')).toHaveLength(2)
  })

  it('emits modelValue minus step when decreasing', async () => {
    const wrapper = mount(BaseNumberStepper, { props: { modelValue: 2 } })
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1])
  })

  it('emits modelValue plus step when increasing', async () => {
    const wrapper = mount(BaseNumberStepper, { props: { modelValue: 2 } })
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3])
  })

  it('disables the decrease button at the minimum', () => {
    const wrapper = mount(BaseNumberStepper, { props: { modelValue: 0, min: 0 } })
    expect(wrapper.findAll('button')[0].attributes('disabled')).toBeDefined()
  })

  it('disables the increase button at the maximum', () => {
    const wrapper = mount(BaseNumberStepper, { props: { modelValue: 3, max: 3 } })
    expect(wrapper.findAll('button')[1].attributes('disabled')).toBeDefined()
  })

  it('has no upper cap when max is not given', async () => {
    const wrapper = mount(BaseNumberStepper, { props: { modelValue: 99 } })
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([100])
  })

  it('renders only the value when not editable', () => {
    const wrapper = mount(BaseNumberStepper, { props: { modelValue: 5, editable: false } })
    expect(wrapper.text()).toContain('5')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('disables both buttons while disabled', () => {
    const wrapper = mount(BaseNumberStepper, { props: { modelValue: 2, disabled: true } })
    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
  })
})
