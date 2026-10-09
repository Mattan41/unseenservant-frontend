import { describe, it, expect } from 'vitest'
import {
  createEmptyOffworldersData,
  createEmptyOffworldersGear,
  normalizeOffworldersData,
  deriveHealth,
  standardArrayUsage,
  suggestedSkillsForClass,
  armorRatingForType,
  addListValue,
  removeListValue,
  toggleListValue,
  OFFWORLDERS_SYSTEM_TYPE,
  OFFWORLDERS_ATTRIBUTES,
  OFFWORLDERS_CLASSES,
  OFFWORLDERS_ABILITIES,
  OFFWORLDERS_SKILLS,
  OFFWORLDERS_SKILL_DESCRIPTIONS,
  OFFWORLDERS_ABILITY_DESCRIPTIONS,
  OFFWORLDERS_CLASS_INFO,
  OFFWORLDERS_STANDARD_ARRAY,
  OFFWORLDERS_SUPPLY_MAX,
  OFFWORLDERS_STARTING_SUPPLY,
  OFFWORLDERS_STARTING_CREDITS,
  OFFWORLDERS_WEAPON_TYPES,
  OFFWORLDERS_ARMOR_TYPES,
} from '@/systems/offworlders/constants.js'

describe('offworlders constants', () => {
  it('exposes the OFFWORLDERS system type identifier', () => {
    expect(OFFWORLDERS_SYSTEM_TYPE).toBe('OFFWORLDERS')
  })

  it('creates a valid empty data block', () => {
    const data = createEmptyOffworldersData()
    expect(data.health).toBe(12)
    expect(data.armor).toBe(0)
    expect(data.supply).toBe(OFFWORLDERS_STARTING_SUPPLY)
    expect(data.supplyMax).toBe(OFFWORLDERS_SUPPLY_MAX)
    expect(data.credits).toBe(OFFWORLDERS_STARTING_CREDITS)
    expect(Object.keys(data.stats)).toEqual(OFFWORLDERS_ATTRIBUTES)
    OFFWORLDERS_ATTRIBUTES.forEach((attr) => expect(data.stats[attr]).toBe(0))
    expect(data.skills).toEqual([])
    expect(data.abilities).toEqual([])
    expect(data.gear).toEqual(createEmptyOffworldersGear())
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

  it('normalizeOffworldersData enforces the supply maximum of 3', () => {
    const normalized = normalizeOffworldersData({ supply: 4, supplyMax: 5 })
    expect(normalized.supplyMax).toBe(OFFWORLDERS_SUPPLY_MAX)
    expect(normalized.supply).toBe(4)
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

describe('offworlders catalogs (PDF audit)', () => {
  it('exposes the eight canonical skills', () => {
    expect(OFFWORLDERS_SKILLS).toEqual([
      'Athletics',
      'Culture',
      'Manipulation',
      'Pilot',
      'Science',
      'Sneak',
      'Survival',
      'Tech',
    ])
  })

  it('describes every skill', () => {
    OFFWORLDERS_SKILLS.forEach((skill) => {
      expect(OFFWORLDERS_SKILL_DESCRIPTIONS[skill]).toBeTruthy()
    })
  })

  it('describes every ability across all classes', () => {
    Object.values(OFFWORLDERS_ABILITIES)
      .flat()
      .forEach((ability) => {
        expect(OFFWORLDERS_ABILITY_DESCRIPTIONS[ability]).toBeTruthy()
      })
  })

  it('gives every class a blurb and in-catalog suggested skills', () => {
    OFFWORLDERS_CLASSES.forEach((className) => {
      expect(OFFWORLDERS_CLASS_INFO[className].blurb).toBeTruthy()
      expect(OFFWORLDERS_CLASS_INFO[className].suggestedSkills.length).toBeGreaterThan(0)
      suggestedSkillsForClass(className).forEach((skill) => {
        expect(OFFWORLDERS_SKILLS).toContain(skill)
      })
    })
    expect(suggestedSkillsForClass('Unknown')).toEqual([])
  })
})

describe('offworlders gear + attribute helpers', () => {
  it('exposes the standard attribute array +2/+1/0/-1', () => {
    expect(OFFWORLDERS_STANDARD_ARRAY).toEqual([2, 1, 0, -1])
  })

  it('standardArrayUsage counts how many array entries are matched', () => {
    expect(
      standardArrayUsage({ strength: 2, agility: 1, intelligence: 0, willpower: -1 }),
    ).toEqual({ used: 4, total: 4 })
    // -1 is duplicated, so only three of the four entries are matched.
    expect(
      standardArrayUsage({ strength: 2, agility: 1, intelligence: -1, willpower: -1 }),
    ).toEqual({ used: 3, total: 4 })
    // Four zeroes only match the single 0 in the array.
    expect(standardArrayUsage(null)).toEqual({ used: 1, total: 4 })
  })

  it('armorRatingForType maps armor names to ratings', () => {
    expect(armorRatingForType('Light')).toBe(1)
    expect(armorRatingForType('Heavy')).toBe(2)
    expect(armorRatingForType('Assault')).toBe(3)
    expect(armorRatingForType('')).toBe(0)
    expect(armorRatingForType('Unknown')).toBe(0)
  })

  it('exposes the weapon and armor reference tables from the PDF', () => {
    expect(OFFWORLDERS_WEAPON_TYPES.map((weapon) => weapon.name)).toEqual([
      'Unarmed',
      'Light',
      'Medium',
      'Heavy',
    ])
    expect(OFFWORLDERS_ARMOR_TYPES.map((armor) => armor.rating)).toEqual([1, 2, 3])
  })

  it('creates a fresh gear block defaulting to a light primary weapon', () => {
    const gear = createEmptyOffworldersGear()
    expect(gear.primaryWeaponType).toBe('Light')
    expect(gear.armorType).toBe('')
    const other = createEmptyOffworldersGear()
    other.primaryWeapon = 'X'
    expect(gear.primaryWeapon).toBe('')
  })
})