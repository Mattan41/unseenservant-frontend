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
  'guest_ship_crew',
  'guest_messages',
  'guest_journals',
  'guest_journal_pages',
]

describe('demo data integrity', () => {
  it('every character points at an existing campaign (or none)', () => {
    const dangling = guestCharacters
      .filter((character) => character.campaignId)
      .filter((character) => !campaignById(character.campaignId))
      .map((character) => `${character.name} -> ${character.campaignId}`)

    expect(dangling).toEqual([])
  })

  it("each campaign's roster matches its primary system", () => {
    const labelledSystems = ['OFFWORLDERS', 'DND5E']
    const mismatched = []

    for (const campaign of guestCampaigns) {
      if (!labelledSystems.includes(campaign.primarySystem)) continue

      for (const character of guestCharacters) {
        if (character.campaignId !== campaign.id) continue
        if (character.systemType !== campaign.primarySystem) {
          mismatched.push(`${character.name} in ${campaign.name}`)
        }
      }
    }

    expect(mismatched).toEqual([])
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

    const missing = GUEST_KEYS.filter((key) => localStorage.getItem(key) === null)
    expect(missing).toEqual([])
    expect(JSON.parse(localStorage.getItem('guest_ships'))).toHaveLength(guestShips.length)
  })

  it('clearGuestStorage removes every key', () => {
    seedGuestStorage()
    clearGuestStorage()

    const leftover = GUEST_KEYS.filter((key) => localStorage.getItem(key) !== null)
    expect(leftover).toEqual([])
  })
})
