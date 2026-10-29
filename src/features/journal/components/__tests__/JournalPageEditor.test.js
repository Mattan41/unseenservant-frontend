import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JournalPageEditor from '@/features/journal/components/JournalPageEditor.vue'

/** The editor's own Preview button — the field renders no tabs at all. */
function previewButton(wrapper) {
  return wrapper.findAll('button').find((button) => button.text() === 'Preview')
}

function closeButton(wrapper) {
  return wrapper.findAll('button').find((button) => button.text() === 'Close')
}

/** The preview dialog: `BaseModal` renders a native `<dialog>` element. */
function dialog(wrapper) {
  return wrapper.find('dialog')
}

const PAGE = {
  modelValue: '# Session 1\n\nWe met **Old Man Winters** at the docks.',
  charCount: 48,
}

describe('JournalPageEditor', () => {
  it('writes without a Write/Preview toggle', () => {
    const wrapper = mount(JournalPageEditor, { props: PAGE })

    expect(wrapper.findAll('.field-tab')).toHaveLength(0)
    expect(wrapper.get('textarea').isVisible()).toBe(true)
  })

  it('still emits what is typed', async () => {
    const wrapper = mount(JournalPageEditor, { props: { modelValue: '' } })

    await wrapper.get('textarea').setValue('hello')

    expect(wrapper.emitted('update:modelValue')).toEqual([['hello']])
  })

  it('announces losing focus, so the caller can save what is pending', async () => {
    const wrapper = mount(JournalPageEditor, { props: PAGE })

    // The editor listens for `focusout`, which bubbles out of the textarea.
    await wrapper.get('textarea').trigger('focusout')

    expect(wrapper.emitted('blur')).toHaveLength(1)
  })

  it('previews the rendered page in a dialog on demand', async () => {
    const wrapper = mount(JournalPageEditor, { props: PAGE })
    expect(dialog(wrapper).exists()).toBe(false)

    await previewButton(wrapper).trigger('click')

    expect(wrapper.get('.modal-title').text()).toBe('Page preview')
    expect(dialog(wrapper).get('.rich-text strong').text()).toBe('Old Man Winters')
    // Reading never touches the value the editor is bound to.
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('says so when a blank page is previewed', async () => {
    const wrapper = mount(JournalPageEditor, { props: { modelValue: '   ' } })

    await previewButton(wrapper).trigger('click')

    expect(dialog(wrapper).text()).toContain('Nothing on this page yet.')
    expect(dialog(wrapper).find('.rich-text').exists()).toBe(false)
  })

  it('closes the preview again', async () => {
    const wrapper = mount(JournalPageEditor, { props: PAGE })
    await previewButton(wrapper).trigger('click')

    await closeButton(wrapper).trigger('click')

    expect(dialog(wrapper).exists()).toBe(false)
  })
})
