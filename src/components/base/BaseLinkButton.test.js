import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import BaseLinkButton from '@/components/base/BaseLinkButton.vue'

const routes = [
  { path: '/', name: 'home', component: { template: '<div />' } },
  { path: '/campaign/:id', name: 'CampaignView', component: { template: '<div />' } },
]

async function mountButton(props, slots) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  // Trigger the initial navigation so `isReady()` resolves.
  router.push('/')
  await router.isReady()
  return mount(BaseLinkButton, { props, slots, global: { plugins: [router] } })
}

describe('BaseLinkButton', () => {
  it('renders an anchor to the resolved route', async () => {
    const wrapper = await mountButton({ to: { name: 'CampaignView', params: { id: 7 } } })
    expect(wrapper.get('a').attributes('href')).toBe('/campaign/7')
  })

  it('applies the base button classes for the variant', async () => {
    const wrapper = await mountButton({ to: '/campaign/7', variant: 'update' })
    const anchor = wrapper.get('a')
    expect(anchor.classes()).toContain('base-btn')
    expect(anchor.classes()).toContain('base-link-btn')
    expect(anchor.classes()).toContain('base-btn-update')
  })

  it('defaults to the default variant', async () => {
    const wrapper = await mountButton({ to: '/campaign/7' })
    expect(wrapper.get('a').classes()).toContain('base-btn-default')
  })

  it('renders a leading icon when one is given', async () => {
    const wrapper = await mountButton({ to: '/campaign/7', icon: 'chevron-right' })
    expect(wrapper.get('a').classes()).toContain('base-btn-with-icon')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('renders the slot label', async () => {
    const wrapper = await mountButton({ to: '/campaign/7' }, { default: 'View campaign' })
    expect(wrapper.text()).toContain('View campaign')
  })
})
