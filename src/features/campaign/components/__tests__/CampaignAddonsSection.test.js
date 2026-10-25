import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import CampaignAddonsSection from '@/features/campaign/components/CampaignAddonsSection.vue'
import { useAuthStore } from '@/features/auth/authStore.js'

/**
 * The Add-ons block in Campaign Settings.
 *
 * The one thing that must not regress is the guest case: Guest Demo serves no
 * add-on endpoint at all, and an unrouted request answers the generic fallback
 * (`{ data: null }`) rather than an error — so a control that looked live would
 * "succeed" and hand the store nothing. Hence: no control in a guest session, and a
 * note saying why.
 */
const campaignWith = (addons) => ({ id: 1, name: 'Curse of Strahd', addons })

function mountSection({ addons = [], guest = false } = {}) {
  setActivePinia(createPinia())
  useAuthStore().isGuest = guest
  return mount(CampaignAddonsSection, { props: { campaign: campaignWith(addons) } })
}

describe('CampaignAddonsSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('offers the planner as an add-on to add', () => {
    const wrapper = mountSection()

    expect(wrapper.text()).toContain('Planner')
    expect(wrapper.get('button').text()).toContain('Add to campaign')
  })

  it('shows it as added, with the way to take it back off', () => {
    const wrapper = mountSection({ addons: ['planner'] })

    expect(wrapper.text()).toContain('Added')
    expect(wrapper.get('button').text()).toContain('Remove from campaign')
  })

  it('says what the change would be, and lets the view decide what to do with it', async () => {
    const wrapper = mountSection()

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('toggle')[0][0]).toEqual({ addonId: 'planner', enabled: true })
  })

  it('offers no control at all in a guest session, and says why', () => {
    const wrapper = mountSection({ guest: true })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('.guest-notice').exists()).toBe(true)
  })
})
