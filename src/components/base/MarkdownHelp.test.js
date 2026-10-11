import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MarkdownHelp from '@/components/base/MarkdownHelp.vue'

describe('MarkdownHelp', () => {
  it('starts collapsed behind a labelled trigger', () => {
    const wrapper = mount(MarkdownHelp)
    const trigger = wrapper.get('button')
    expect(trigger.text()).toBe('Formatting help')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.markdown-help-panel').exists()).toBe(false)
  })

  it('reveals the cheat sheet on click and hides it again', async () => {
    const wrapper = mount(MarkdownHelp)

    await wrapper.get('button').trigger('click')
    expect(wrapper.get('.markdown-help-panel').exists()).toBe(true)
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')

    await wrapper.get('button').trigger('click')
    expect(wrapper.find('.markdown-help-panel').exists()).toBe(false)
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })

  it('documents every snippet with a live rendering of it', async () => {
    const wrapper = mount(MarkdownHelp)
    await wrapper.get('button').trigger('click')

    const rows = wrapper.findAll('.markdown-help-row')
    expect(rows.length).toBeGreaterThan(0)

    // Each row shows the source *and* what the shared renderer makes of it, so
    // the cheat sheet cannot drift from the real output.
    expect(rows[0].get('.markdown-help-source').text()).toBe('**bold**')
    expect(rows[0].get('.markdown-help-result strong').text()).toBe('bold')
  })

  it('lets the trigger text be overridden', () => {
    const wrapper = mount(MarkdownHelp, { props: { label: 'How do I format this?' } })
    expect(wrapper.get('button').text()).toBe('How do I format this?')
  })
})
