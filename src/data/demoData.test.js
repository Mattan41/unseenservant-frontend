import { describe, it, expect, beforeEach } from 'vitest'
import {
  guestCharacters,
  guestCampaigns,
  guestShips,
  seedGuestStorage,
  clearGuestStorage,
} from '@/data/demoData.js'

const campaignById = (id) => guestCampaigns.find((c) => c.id === id)

const GUEST_KEYS = [
  'guest_user',
  'guest_users',
  'guest_characters',
  'guest_campaigns',
  'guest_ships',
  'guest_messages',
]

describe('demo data integrity', () => {
  it('every character points at an existing campaign (or none)', () => {
    for (const character of guestCharacters) {
      if (character.campaignId) {
        expect(
          campaignById(character.campaignId),
          `${character.name} -> ${character.campaignId}`,
        ).toBeTruthy()
      }
    }
  })

  it("each campaign's roster matches its primary system", () => {
    for (const campaign of guestCampaigns) {
      const roster = guestCharacters.filter((c) => c.campaignId === campaign.id)
      if (campaign.primarySystem === 'OFFWORLDERS') {
        roster.forEach((c) => expect(c.systemType, `${c.name} in ${campaign.name}`).toBe('OFFWORLDERS'))
      } else if (campaign.primarySystem === 'DND5E') {
        roster.forEach((c) => expect(c.systemType, `${c.name} in ${campaign.name}`).toBe('DND5E'))
      }
    }
  })

  it('every ship belongs to an OFFWORLDERS campaign', () => {
    for (const ship of guestShips) {
      expect(campaignById(ship.campaignId)?.primarySystem).toBe('OFFWORLDERS')
    }
  })

  it('the demo user plays Vex in the Offworlders campaign', () => {
    const offworlders = guestCampaigns.filter((c) => c.primarySystem === 'OFFWORLDERS')
    expect(offworlders.length).toBeGreaterThan(0)

    const vex = guestCharacters.find((c) => c.name === 'Vex')
    expect(vex).toBeTruthy()
    expect(vex.systemType).toBe('OFFWORLDERS')
    expect(vex.ownerId).toBe('guest_demo')

    const campaign = campaignById(vex.campaignId)
    expect(campaign.primarySystem).toBe('OFFWORLDERS')
    expect(campaign.participants.some((p) => p.id === 'guest_demo')).toBe(true)
  })
})

describe('guest storage seeding', () => {
  beforeEach(() => clearGuestStorage())

  it('seeds every key, including ships', () => {
    seedGuestStorage()
    for (const key of GUEST_KEYS) {
      expect(localStorage.getItem(key), key).not.toBeNull()
    }
    expect(JSON.parse(localStorage.getItem('guest_ships'))).toHaveLength(guestShips.length)
  })

  it('clearGuestStorage removes every key', () => {
    seedGuestStorage()
    clearGuestStorage()
    for (const key of GUEST_KEYS) {
      expect(localStorage.getItem(key), key).toBeNull()
    }
  })
})
