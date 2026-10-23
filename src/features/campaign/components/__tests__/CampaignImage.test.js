import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CampaignImage from '@/features/campaign/components/CampaignImage.vue'
import { DEFAULT_CAMPAIGN_IMAGE } from '@/features/campaign/campaignSystems.js'
import { OFFWORLDERS_CAMPAIGN_DEFAULT_IMAGE } from '@/systems/offworlders/constants.js'

const mountImage = (props) => mount(CampaignImage, { props })

describe('CampaignImage', () => {
  it('shows the generic art for a campaign with no image', () => {
    const wrapper = mountImage({ src: '' })

    expect(wrapper.attributes('src')).toBe(DEFAULT_CAMPAIGN_IMAGE)
  })

  it('chooses the placeholder by the campaign primary system', () => {
    const wrapper = mountImage({ src: '', systemType: 'OFFWORLDERS' })

    expect(wrapper.attributes('src')).toBe(OFFWORLDERS_CAMPAIGN_DEFAULT_IMAGE)
  })

  it("keeps a caller's placeholder above the system's own", () => {
    // The ship art and the crew gallery are not campaigns, so they pass their own.
    const wrapper = mountImage({
      src: '',
      systemType: 'OFFWORLDERS',
      defaultSrc: '/defaultShip.svg',
    })

    expect(wrapper.attributes('src')).toBe('/defaultShip.svg')
  })

  it('falls back to the system art when a real image fails to load', async () => {
    const wrapper = mountImage({
      src: 'https://example.test/broken.png',
      systemType: 'OFFWORLDERS',
    })

    await wrapper.trigger('error')

    expect(wrapper.attributes('src')).toBe(OFFWORLDERS_CAMPAIGN_DEFAULT_IMAGE)
  })
})
