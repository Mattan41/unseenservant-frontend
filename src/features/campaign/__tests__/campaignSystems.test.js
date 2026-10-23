import { describe, it, expect } from 'vitest'
import {
  CAMPAIGN_SYSTEM_LABELS,
  CAMPAIGN_SYSTEM_OPTIONS,
  campaignDefaultImage,
  DEFAULT_CAMPAIGN_IMAGE,
  DND5E_SYSTEM_TYPE,
  OFFWORLDERS_SYSTEM_TYPE,
  isDnd5e,
  isOffworlders,
} from '@/features/campaign/campaignSystems.js'
import { OFFWORLDERS_CAMPAIGN_DEFAULT_IMAGE } from '@/systems/offworlders/constants.js'

describe('campaign systems registry', () => {
  it('offers both character systems as campaign primary systems', () => {
    expect(CAMPAIGN_SYSTEM_OPTIONS.map((option) => option.id)).toEqual([
      DND5E_SYSTEM_TYPE,
      OFFWORLDERS_SYSTEM_TYPE,
    ])
    expect(CAMPAIGN_SYSTEM_LABELS[OFFWORLDERS_SYSTEM_TYPE]).toBe('Offworlders')
  })

  it('identifies the active system', () => {
    expect(isOffworlders('OFFWORLDERS')).toBe(true)
    expect(isOffworlders('DND5E')).toBe(false)
    expect(isOffworlders(null)).toBe(false)
    expect(isDnd5e('DND5E')).toBe(true)
    expect(isDnd5e('OFFWORLDERS')).toBe(false)
  })

  it('gives an Offworlders campaign the sci-fi placeholder art', () => {
    expect(campaignDefaultImage(OFFWORLDERS_SYSTEM_TYPE)).toBe(OFFWORLDERS_CAMPAIGN_DEFAULT_IMAGE)
  })

  it('gives 5e, system-less and unknown campaigns the generic art', () => {
    for (const systemType of [DND5E_SYSTEM_TYPE, null, undefined, '', 'SOMETHING_ELSE']) {
      expect(campaignDefaultImage(systemType)).toBe(DEFAULT_CAMPAIGN_IMAGE)
    }
  })
})
