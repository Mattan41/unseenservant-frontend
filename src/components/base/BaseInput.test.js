import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseInput from '@/components/base/BaseInput.vue'

describe('BaseInput', () => {
  it('binds the label to the input via an auto-generated id', () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '', label: 'Display Name' } })
    const input = wrapper.get('input')
    expect(input.attributes('id')).toBeTruthy()
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
  })

  it('emits strings for text inputs', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '', label: 'Name' } })
    await wrapper.get('input').setValue('Vex')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Vex']])
  })

  it('emits numbers for type="number" and keeps a blank field blank', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: 0, type: 'number', label: 'XP' } })
    const input = wrapper.get('input')
    await input.setValue('42')
    await input.setValue('')
    expect(wrapper.emitted('update:modelValue')).toEqual([[42], ['']])
  })

  it('describes the input with the hint, then swaps it for the error', async () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '', label: 'Current HP', hint: 'Running total.' },
    })
    const input = wrapper.get('input')
    expect(input.attributes('aria-describedby')).toBe(`${input.attributes('id')}-message`)
    expect(input.attributes('aria-invalid')).toBeUndefined()
    expect(wrapper.text()).toContain('Running total.')

    await wrapper.setProps({ error: 'Must be a number.' })
    expect(wrapper.text()).toContain('Must be a number.')
    expect(wrapper.text()).not.toContain('Running total.')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
  })

  it('passes numeric bounds through and disables the input when asked', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: 1, type: 'number', min: -1, max: 3, disabled: true },
    })
    const input = wrapper.get('input')
    expect(input.attributes('min')).toBe('-1')
    expect(input.attributes('max')).toBe('3')
    expect(input.attributes('disabled')).toBeDefined()
  })
})
