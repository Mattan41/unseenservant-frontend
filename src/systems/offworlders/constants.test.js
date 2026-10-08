import { describe, it, expect } from 'vitest'
import {
  createEmptyOffworldersData,
  normalizeOffworldersData,
  deriveHealth,
  addListValue,
  removeListValue,
  toggleListValue,
  OFFWORLDERS_SYSTEM_TYPE,
  OFFWORLDERS_ATTRIBUTES,
  OFFWORLDERS_CLASSES,
  OFFWORLDERS_ABILITIES,
} from '@/systems/offworlders/constants.js'

describe('offworlders constants', () => {
  it('exposes the OFFWORLDERS system type identifier', () => {
    expect(OFFWORLDERS_SYSTEM_TYPE).toBe('OFFWORLDERS')
  })

  it('creates a valid empty data block', () => {
    const data = createEmptyOffworldersData()
    expect(data.health).toBe(12)
    expect(data.armor).toBe(0)
    expect(data.supply).toBe(0)
    expect(data.supplyMax).toBe(0)
    expect(Object.keys(data.stats)).toEqual(OFFWORLDERS_ATTRIBUTES)
    OFFWORLDERS_ATTRIBUTES.forEach((attr) => expect(data.stats[attr]).toBe(0))
    expect(data.skills).toEqual([])
    expect(data.abilities).toEqual([])
  })

  it('returns a fresh object every time (no shared references)', () => {
    const a = createEmptyOffworldersData()
    const b = createEmptyOffworldersData()
    a.stats.strength = 3
    a.skills.push('Pilot')
    expect(b.stats.strength).toBe(0)
    expect(b.skills).toEqual([])
  })

  it('normalizeOffworldersData fills missing nested properties with defaults', () => {
    const normalized = normalizeOffworldersData({ characterClass: 'Outlaw', health: 15 })
    expect(normalized.characterClass).toBe('Outlaw')
    expect(normalized.health).toBe(15)
    expect(normalized.stats.willpower).toBe(0)
    expect(normalized.skills).toEqual([])
  })

  it('normalizeOffworldersData preserves provided values while filling the rest', () => {
    const normalized = normalizeOffworldersData({
      stats: { strength: 2 },
      skills: ['Pilot', 'Sneak'],
    })
    expect(normalized.stats.strength).toBe(2)
    expect(normalized.stats.agility).toBe(0)
    expect(normalized.skills).toEqual(['Pilot', 'Sneak'])
  })

  it('normalizeOffworldersData handles null/undefined input', () => {
    expect(normalizeOffworldersData(null).health).toBe(12)
    expect(normalizeOffworldersData(undefined).stats.strength).toBe(0)
  })

  it('deriveHealth follows max(1, 12 + strength + agility)', () => {
    expect(deriveHealth({ strength: 0, agility: 0 })).toBe(12)
    expect(deriveHealth({ strength: 3, agility: 2 })).toBe(17)
    expect(deriveHealth({ strength: -1, agility: 0 })).toBe(11)
    // The floor of 1 applies if the combined penalty is extreme.
    expect(deriveHealth({ strength: -20, agility: -20 })).toBe(1)
    expect(deriveHealth(null)).toBe(12)
  })

  it('exposes four classes, each with a distinct ability catalog', () => {
    expect(OFFWORLDERS_CLASSES).toHaveLength(4)
    OFFWORLDERS_CLASSES.forEach((className) => {
      expect(OFFWORLDERS_ABILITIES[className]).toBeDefined()
      expect(OFFWORLDERS_ABILITIES[className].length).toBeGreaterThan(0)
    })
  })
})

describe('offworlders list helpers', () => {
  it('addListValue trims, ignores blanks and duplicates', () => {
    expect(addListValue([], '  Pilot  ')).toEqual(['Pilot'])
    expect(addListValue(['Pilot'], '   ')).toEqual(['Pilot'])
    expect(addListValue(['Pilot'], 'Pilot')).toEqual(['Pilot'])
  })

  it('addListValue returns a new array without mutating the input', () => {
    const original = ['Pilot']
    const next = addListValue(original, 'Sneak')
    expect(original).toEqual(['Pilot'])
    expect(next).toEqual(['Pilot', 'Sneak'])
  })

  it('removeListValue removes the matching entry', () => {
    expect(removeListValue(['Pilot', 'Sneak'], 'Pilot')).toEqual(['Sneak'])
    expect(removeListValue(['Pilot'], 'Missing')).toEqual(['Pilot'])
  })

  it('toggleListValue adds when absent and removes when present', () => {
    expect(toggleListValue([], 'Medic')).toEqual(['Medic'])
    expect(toggleListValue(['Medic'], 'Medic')).toEqual([])
  })
})