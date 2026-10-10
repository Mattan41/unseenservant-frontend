import { describe, it, expect } from 'vitest'
import {
  createEmptyOffworldersData,
  createEmptyOffworldersWeapon,
  normalizeOffworldersWeapon,
  createEmptyOffworldersItem,
  normalizeOffworldersItem,
  migrateLegacyOffworldersGear,
  damageForWeaponType,
  weaponTypeForDamage,
  normalizeWeaponCategory,
  isWeaponHeavy,
  clampArmor,
  armorLabel,
  effectiveArmor,
  abilityVitalsBonus,
  createEmptyOffworldersEntry,
  normalizeOffworldersEntry,
  resolveEntryDescription,
  toggleEntry,
  addEntry,
  removeEntry,
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
  OFFWORLDERS_ABILITY_EFFECTS,
  OFFWORLDERS_ATTRIBUTE_DESCRIPTIONS,
  OFFWORLDERS_CLASS_INFO,
  OFFWORLDERS_STANDARD_ARRAY,
  OFFWORLDERS_SUPPLY_MAX,
  OFFWORLDERS_STARTING_SUPPLY,
  OFFWORLDERS_STARTING_CREDITS,
  OFFWORLDERS_WEAPON_TYPES,
  OFFWORLDERS_WEAPON_CATEGORIES,
  OFFWORLDERS_ARMOR_TYPES,
  OFFWORLDERS_ARMOR_OPTIONS,
  OFFWORLDERS_ARMOR_MAX,
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
    expect(data.weapons).toEqual([])
    expect(data.items).toEqual([])
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
    expect(normalized.skills).toEqual([
      { name: 'Pilot', description: '' },
      { name: 'Sneak', description: '' },
    ])
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
    expect(OFFWORLDERS_WEAPON_CATEGORIES).toEqual(['Light', 'Medium', 'Heavy'])
    expect(OFFWORLDERS_ARMOR_TYPES.map((armor) => armor.rating)).toEqual([1, 2, 3])
    expect(OFFWORLDERS_ARMOR_OPTIONS.map((option) => option.value)).toEqual([0, 1, 2, 3])
    expect(OFFWORLDERS_ARMOR_OPTIONS.map((option) => option.label)).toEqual([
      'None',
      'Light',
      'Heavy',
      'Assault',
    ])
  })

  it('derives weapon damage and heavy from the type', () => {
    expect(damageForWeaponType('Light')).toBe('1D6')
    expect(damageForWeaponType('Medium')).toBe('1D6+1')
    expect(damageForWeaponType('Heavy')).toBe('1D6+2')
    expect(damageForWeaponType('')).toBe('')
    expect(damageForWeaponType('Unknown')).toBe('')
    expect(isWeaponHeavy('Heavy')).toBe(true)
    expect(isWeaponHeavy('Light')).toBe(false)
    expect(isWeaponHeavy('Medium')).toBe(false)
  })

  it('normalizeWeaponCategory falls back to Light', () => {
    expect(normalizeWeaponCategory('Medium')).toBe('Medium')
    expect(normalizeWeaponCategory('Unarmed')).toBe('Light')
    expect(normalizeWeaponCategory('')).toBe('Light')
    expect(normalizeWeaponCategory(null)).toBe('Light')
  })

  it('clampArmor / armorLabel map a value to 0..OFFWORLDERS_ARMOR_MAX', () => {
    expect(clampArmor(9)).toBe(OFFWORLDERS_ARMOR_MAX)
    expect(clampArmor(-4)).toBe(0)
    expect(clampArmor('2')).toBe(2)
    expect(clampArmor(null)).toBe(0)
    expect(armorLabel(0)).toBe('None')
    expect(armorLabel(1)).toBe('Light')
    expect(armorLabel(3)).toBe('Assault')
    expect(armorLabel(99)).toBe('Assault')
  })

  it('creates a fresh, empty weapon and item', () => {
    expect(createEmptyOffworldersWeapon()).toEqual({ type: 'Light', description: '' })
    expect(createEmptyOffworldersWeapon('Heavy')).toEqual({ type: 'Heavy', description: '' })
    expect(createEmptyOffworldersItem()).toEqual({ name: '', description: '' })
    const other = createEmptyOffworldersItem()
    other.name = 'X'
    expect(createEmptyOffworldersItem().name).toBe('')
  })

  it('normalize weapon/item entries fill missing fields', () => {
    expect(normalizeOffworldersWeapon({ type: 'Heavy' })).toEqual({
      type: 'Heavy',
      description: '',
    })
    expect(normalizeOffworldersWeapon({ type: 'Bogus' }).type).toBe('Light')
    expect(normalizeOffworldersWeapon(null)).toEqual({ type: 'Light', description: '' })
    // Legacy weapon entries map name -> description.
    expect(normalizeOffworldersWeapon({ name: 'Blaster' })).toEqual({
      type: 'Light',
      description: 'Blaster',
    })
    expect(normalizeOffworldersItem({ name: 'Rope' })).toEqual({ name: 'Rope', description: '' })
    expect(normalizeOffworldersItem({ name: 'Rope', notes: 'coil' })).toEqual({
      name: 'Rope',
      description: 'coil',
    })
    expect(normalizeOffworldersItem(null)).toEqual({ name: '', description: '' })
  })
})

describe('legacy gear -> 1.6 gear migration', () => {
  it('migrateLegacyOffworldersGear converts a Step-1 gear block', () => {
    const gear = migrateLegacyOffworldersGear({
      gear: {
        primaryWeapon: 'Snubnosed revolver',
        secondaryWeapon: 'Butterfly knife',
        armorType: 'Heavy',
        notes: 'Band t-shirts',
      },
    })
    expect(gear.weapons).toEqual([
      { type: 'Light', description: 'Snubnosed revolver' },
      { type: 'Light', description: 'Butterfly knife' },
    ])
    expect(gear.armor).toBe(2)
    expect(gear.items).toEqual([{ name: 'Gear notes', description: 'Band t-shirts' }])
  })

  it('migrateLegacyOffworldersGear uses the legacy weapon type', () => {
    const gear = migrateLegacyOffworldersGear({
      gear: {
        primaryWeapon: 'Rifle',
        primaryWeaponType: 'Medium',
        secondaryWeapon: 'Cannon',
        secondaryWeaponType: 'Heavy',
      },
    })
    expect(gear.weapons).toEqual([
      { type: 'Medium', description: 'Rifle' },
      { type: 'Heavy', description: 'Cannon' },
    ])
  })

  it('migrateLegacyOffworldersGear converts a 1.5 items list', () => {
    const gear = migrateLegacyOffworldersGear({
      items: [
        { name: 'Blaster', kind: 'weapon', damage: '1D6+2' },
        { name: 'Light armor', kind: 'armor', armorRating: 1 },
        { name: 'Rope', kind: 'item', notes: '50 ft' },
      ],
    })
    expect(gear.weapons).toEqual([{ type: 'Heavy', description: 'Blaster' }])
    expect(gear.armor).toBe(1)
    expect(gear.items).toEqual([{ name: 'Rope', description: '50 ft' }])
  })

  it('weaponTypeForDamage reverse-maps legacy damage, defaulting to Light', () => {
    expect(weaponTypeForDamage('1D6')).toBe('Light')
    expect(weaponTypeForDamage('1D6+1')).toBe('Medium')
    expect(weaponTypeForDamage('1D6+2')).toBe('Heavy')
    expect(weaponTypeForDamage('2D8')).toBe('Light')
    expect(weaponTypeForDamage('')).toBe('Light')
  })

  it('migrateLegacyOffworldersGear handles empty input', () => {
    expect(migrateLegacyOffworldersGear(null)).toEqual({ weapons: [], armor: 0, items: [] })
    expect(migrateLegacyOffworldersGear({})).toEqual({ weapons: [], armor: 0, items: [] })
  })

  it('armorRatingForType maps legacy armor names to ratings', () => {
    expect(armorRatingForType('Light')).toBe(1)
    expect(armorRatingForType('Heavy')).toBe(2)
    expect(armorRatingForType('Assault')).toBe(3)
    expect(armorRatingForType('Unknown')).toBe(0)
  })

  it('normalizeOffworldersData migrates a legacy gear block', () => {
    const normalized = normalizeOffworldersData({
      characterClass: 'Outlaw',
      gear: { primaryWeapon: 'Revolver', armorType: 'Light' },
    })
    expect(normalized.weapons).toEqual([{ type: 'Light', description: 'Revolver' }])
    expect(normalized.armor).toBe(1)
    expect(normalized.items).toEqual([])
    expect(normalized.gear).toBeUndefined()
  })

  it('normalizeOffworldersData normalizes the 1.6 gear shape', () => {
    const normalized = normalizeOffworldersData({
      armor: 7,
      weapons: [{ type: 'Heavy', description: 'Cannon' }, { type: 'Bogus' }],
      items: [{ name: 'Rope', notes: 'coil' }],
    })
    expect(normalized.armor).toBe(3)
    expect(normalized.weapons).toEqual([
      { type: 'Heavy', description: 'Cannon' },
      { type: 'Light', description: '' },
    ])
    expect(normalized.items).toEqual([{ name: 'Rope', description: 'coil' }])
  })
})

describe('skill/ability entries', () => {
  it('createEmptyOffworldersEntry / normalizeOffworldersEntry', () => {
    expect(createEmptyOffworldersEntry()).toEqual({ name: '', description: '' })
    expect(normalizeOffworldersEntry('Pilot')).toEqual({ name: 'Pilot', description: '' })
    expect(normalizeOffworldersEntry(null)).toEqual({ name: '', description: '' })
    expect(normalizeOffworldersEntry({ name: 'X', description: 'd' })).toEqual({
      name: 'X',
      description: 'd',
    })
  })

  it('resolveEntryDescription prefers the custom description then the catalog', () => {
    expect(resolveEntryDescription({ name: 'X', description: 'custom' }, { X: 'catalog' })).toBe(
      'custom',
    )
    expect(resolveEntryDescription({ name: 'X', description: '' }, { X: 'catalog' })).toBe('catalog')
    expect(resolveEntryDescription({ name: 'X' }, {})).toBe('')
    expect(resolveEntryDescription(null, {})).toBe('')
  })

  it('toggleEntry adds and removes by name', () => {
    expect(toggleEntry([], 'Pilot')).toEqual([{ name: 'Pilot', description: '' }])
    expect(toggleEntry([{ name: 'Pilot', description: '' }], 'Pilot')).toEqual([])
  })

  it('addEntry adds a custom entry with a description, ignoring blanks/duplicates', () => {
    expect(addEntry([], 'Homebrew', 'does stuff')).toEqual([
      { name: 'Homebrew', description: 'does stuff' },
    ])
    expect(addEntry([], '   ')).toEqual([])
    expect(addEntry([{ name: 'X', description: '' }], 'X', 'd')).toEqual([
      { name: 'X', description: '' },
    ])
  })

  it('removeEntry removes by name', () => {
    expect(removeEntry([{ name: 'X', description: '' }], 'X')).toEqual([])
    expect(removeEntry([{ name: 'X', description: '' }], 'Y')).toEqual([
      { name: 'X', description: '' },
    ])
  })

  it('normalizeOffworldersData upgrades legacy string skills/abilities to entries', () => {
    const normalized = normalizeOffworldersData({ skills: ['Pilot'], abilities: ['Lucky'] })
    expect(normalized.skills).toEqual([{ name: 'Pilot', description: '' }])
    expect(normalized.abilities).toEqual([{ name: 'Lucky', description: '' }])
  })
})

describe('effectiveArmor', () => {
  it('returns the single chosen armor value', () => {
    expect(effectiveArmor(0)).toBe(0)
    expect(effectiveArmor(2)).toBe(2)
    expect(effectiveArmor(null)).toBe(0)
  })

  it('clamps to 0..OFFWORLDERS_ARMOR_MAX and ignores junk', () => {
    expect(effectiveArmor(9)).toBe(OFFWORLDERS_ARMOR_MAX)
    expect(effectiveArmor(-4)).toBe(0)
    expect(effectiveArmor('2')).toBe(2)
  })

  it('folds the passive ability bonus in, still clamped to 0..OFFWORLDERS_ARMOR_MAX', () => {
    expect(effectiveArmor(1, 1)).toBe(2)
    expect(effectiveArmor(3, 1)).toBe(OFFWORLDERS_ARMOR_MAX)
    expect(effectiveArmor(0, 1)).toBe(1)
    expect(effectiveArmor(0, 0)).toBe(0)
  })
})

describe('derived Vitals with modifiers', () => {
  it('deriveHealth adds the manual modifier', () => {
    expect(deriveHealth({ strength: 1, agility: 0 }, 4)).toBe(17)
    expect(deriveHealth({ strength: 1, agility: 0 }, -1)).toBe(12)
    // The floor of 1 still applies.
    expect(deriveHealth({ strength: -20, agility: -20 }, -5)).toBe(1)
  })

  it('createEmptyOffworldersData includes the health-tracking fields', () => {
    const data = createEmptyOffworldersData()
    expect(data.currentHealth).toBe(12)
    expect(data.healthModifier).toBe(0)
  })

  it('exposes a description for every attribute', () => {
    OFFWORLDERS_ATTRIBUTES.forEach((attr) => {
      expect(OFFWORLDERS_ATTRIBUTE_DESCRIPTIONS[attr]).toBeTruthy()
    })
  })
})

describe('ability Vitals bonuses', () => {
  it('sums the passive bonuses from Hardy and Unstoppable', () => {
    const bonus = abilityVitalsBonus([{ name: 'Hardy' }, { name: 'Unstoppable' }])
    expect(bonus.health).toBe(4)
    expect(bonus.armor).toBe(1)
    expect(bonus.healthSources).toEqual(['Hardy'])
    expect(bonus.armorSources).toEqual(['Unstoppable'])
  })

  it('ignores situational abilities and custom entries', () => {
    expect(abilityVitalsBonus([{ name: 'Lucky' }, { name: 'Homebrew' }])).toEqual({
      health: 0,
      armor: 0,
      healthSources: [],
      armorSources: [],
    })
    expect(abilityVitalsBonus(null)).toEqual({
      health: 0,
      armor: 0,
      healthSources: [],
      armorSources: [],
    })
  })

  it('only lists effects for real catalog abilities', () => {
    const catalog = Object.values(OFFWORLDERS_ABILITIES).flat()
    Object.keys(OFFWORLDERS_ABILITY_EFFECTS).forEach((name) => {
      expect(catalog).toContain(name)
    })
  })
})
