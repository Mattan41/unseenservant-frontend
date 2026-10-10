import { describe, it, expect } from 'vitest'
import {
  CAMPAIGN_SYSTEM_LABELS,
  CAMPAIGN_SYSTEM_OPTIONS,
  DND5E_SYSTEM_TYPE,
  OFFWORLDERS_SYSTEM_TYPE,
  isDnd5e,
  isOffworlders,
} from './campaignSystems.js'

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
})
