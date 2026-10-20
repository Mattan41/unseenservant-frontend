import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseDocumentPage from '@/components/base/BaseDocumentPage.vue'

describe('BaseDocumentPage', () => {
  it('renders the title as the heading and the slot content below it', () => {
    const wrapper = mount(BaseDocumentPage, {
      props: { title: 'Privacy Policy' },
      slots: { default: '<p>Who is responsible</p>' },
    })

    expect(wrapper.get('h1').text()).toBe('Privacy Policy')
    expect(wrapper.get('article').text()).toContain('Who is responsible')
  })

  it('renders the revision date when one is given', () => {
    const wrapper = mount(BaseDocumentPage, {
      props: { title: 'Terms of Service', updated: '17 October 2026' },
    })

    expect(wrapper.text()).toContain('Last updated: 17 October 2026')
  })

  it('omits the revision line when no date is given', () => {
    const wrapper = mount(BaseDocumentPage, { props: { title: 'Terms of Service' } })

    expect(wrapper.text()).not.toContain('Last updated')
  })
})
