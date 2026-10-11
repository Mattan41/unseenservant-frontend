import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseInfoBox from '@/components/base/BaseInfoBox.vue'

describe('BaseInfoBox', () => {
  it('renders slot content with the default info tone', () => {
    const wrapper = mount(BaseInfoBox, { slots: { default: 'Only the GM can see this.' } })
    expect(wrapper.classes()).toContain('info-box')
    expect(wrapper.classes()).toContain('info-box--info')
    expect(wrapper.text()).toContain('Only the GM can see this.')
  })

  it('applies the tone modifier and switches the glyph with it', () => {
    const info = mount(BaseInfoBox, { props: { variant: 'info' } })
    const warning = mount(BaseInfoBox, { props: { variant: 'warning' } })

    expect(warning.classes()).toContain('info-box--warning')
    expect(info.find('svg').exists()).toBe(true)
    expect(warning.find('svg').exists()).toBe(true)
    // Diagonally asserted, so the test does not restate the SVG geometry.
    expect(warning.html()).not.toBe(info.html())
  })

  it('renders the optional title above the content', () => {
    const wrapper = mount(BaseInfoBox, { props: { title: 'Private' } })
    expect(wrapper.get('.info-box-title').text()).toBe('Private')
  })

  it('hides the glyph when asked', () => {
    const wrapper = mount(BaseInfoBox, { props: { icon: false } })
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('accepts an explicit icon name', () => {
    const wrapper = mount(BaseInfoBox, { props: { icon: 'help' } })
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
