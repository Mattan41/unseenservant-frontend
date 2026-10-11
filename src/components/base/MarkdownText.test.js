import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MarkdownText from '@/components/base/MarkdownText.vue'

describe('MarkdownText', () => {
  it('renders markdown structure with the shared rich-text class', () => {
    const wrapper = mount(MarkdownText, { props: { text: '**Aren**\n\n- one\n- two' } })
    expect(wrapper.classes()).toContain('rich-text')
    expect(wrapper.get('strong').text()).toBe('Aren')
    expect(wrapper.findAll('li')).toHaveLength(2)
  })

  it('escapes HTML instead of rendering it', () => {
    const wrapper = mount(MarkdownText, { props: { text: '<script>alert(1)</script>' } })
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.text()).toContain('<script>alert(1)</script>')
  })

  it('renders nothing for an empty value', () => {
    const wrapper = mount(MarkdownText)
    expect(wrapper.text()).toBe('')
    expect(wrapper.classes()).toContain('rich-text')
  })
})
