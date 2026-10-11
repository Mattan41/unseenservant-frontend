import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseMarkdownField from '@/components/base/BaseMarkdownField.vue'

/** The Write and Preview toggle buttons, in DOM order. */
function tabs(wrapper) {
  return wrapper.findAll('.field-tab')
}

describe('BaseMarkdownField', () => {
  it('binds the label to the textarea via an auto-generated id', () => {
    const wrapper = mount(BaseMarkdownField, { props: { modelValue: '', label: 'Backstory' } })
    const textarea = wrapper.get('textarea')
    expect(textarea.attributes('id')).toBeTruthy()
    expect(wrapper.get('label').attributes('for')).toBe(textarea.attributes('id'))
  })

  it('emits the typed text', async () => {
    const wrapper = mount(BaseMarkdownField, { props: { modelValue: '' } })
    await wrapper.get('textarea').setValue('**Aren**')
    expect(wrapper.emitted('update:modelValue')).toEqual([['**Aren**']])
  })

  it('describes the field with the hint, then swaps it for the error', async () => {
    const wrapper = mount(BaseMarkdownField, {
      props: { modelValue: '', label: 'Notes', hint: 'Only you can see this.' },
    })
    const textarea = wrapper.get('textarea')
    expect(textarea.attributes('aria-describedby')).toBe(`${textarea.attributes('id')}-message`)
    expect(wrapper.text()).toContain('Only you can see this.')

    await wrapper.setProps({ error: 'Too long.' })
    expect(wrapper.text()).toContain('Too long.')
    expect(wrapper.text()).not.toContain('Only you can see this.')
    expect(wrapper.get('textarea').attributes('aria-invalid')).toBe('true')
  })

  it('switches to a markdown preview without touching the value', async () => {
    const wrapper = mount(BaseMarkdownField, { props: { modelValue: '**Aren**' } })
    const textarea = wrapper.get('textarea')
    expect(textarea.element.style.display).not.toBe('none')
    expect(wrapper.find('.rich-text').exists()).toBe(false)

    await tabs(wrapper)[1].trigger('click')

    expect(wrapper.find('.rich-text').exists()).toBe(true)
    expect(wrapper.get('strong').text()).toBe('Aren')
    // `v-show` keeps the textarea in the DOM (caret and scroll survive the
    // round-trip) but hides it, so assert on the display it applies.
    expect(wrapper.get('textarea').element.style.display).toBe('none')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('toggles back to write mode', async () => {
    const wrapper = mount(BaseMarkdownField, { props: { modelValue: 'text' } })
    await tabs(wrapper)[1].trigger('click')
    await tabs(wrapper)[0].trigger('click')
    expect(wrapper.get('textarea').element.style.display).not.toBe('none')
    expect(wrapper.find('.rich-text').exists()).toBe(false)
  })

  it('shows the empty message when previewing a blank field', async () => {
    const wrapper = mount(BaseMarkdownField, { props: { modelValue: '' } })
    await tabs(wrapper)[1].trigger('click')
    expect(wrapper.text()).toContain('Nothing to preview yet.')
  })

  it('keeps the formatting cheat sheet collapsed until asked', async () => {
    const wrapper = mount(BaseMarkdownField, { props: { modelValue: 'text' } })
    // The raw `**bold** · *italic* · - list …` hint line is gone: the syntax
    // lives behind a disclosure instead, so compact forms stay quiet.
    const trigger = wrapper.get('.markdown-help button')
    expect(trigger.text()).toContain('Formatting help')
    expect(wrapper.find('.markdown-help-panel').exists()).toBe(false)

    await trigger.trigger('click')

    expect(wrapper.get('.markdown-help-panel').exists()).toBe(true)
    // Source snippet *and* a live rendering, both from the shared renderer.
    expect(wrapper.get('.markdown-help-source').text()).toBe('**bold**')
    expect(wrapper.get('.markdown-help-result strong').text()).toBe('bold')
  })

  it('disables the textarea when asked', () => {
    const wrapper = mount(BaseMarkdownField, { props: { modelValue: '', disabled: true } })
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined()
  })

  it('passes a hard character cap through to the textarea', () => {
    const wrapper = mount(BaseMarkdownField, { props: { modelValue: '', maxlength: 10000 } })
    expect(wrapper.get('textarea').attributes('maxlength')).toBe('10000')
  })
})
