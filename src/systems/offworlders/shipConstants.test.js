import { describe, it, expect } from 'vitest'
import {
  OFFWORLDERS_SHIP_DAMAGE_DEFAULT,
  OFFWORLDERS_SHIP_HULL_DEFAULT,
  OFFWORLDERS_SHIP_MAX_DRIVE_FUEL_DEFAULT,
  OFFWORLDERS_SHIP_UPGRADES,
  addShipUpgrade,
  canAddShipUpgrade,
  createEmptyShipData,
  normalizeShipData,
  removeShipUpgrade,
  shipUpgradeCount,
  shipUpgradeMaxCount,
  toggleShipUpgrade,
} from './shipConstants.js'

describe('createEmptyShipData', () => {
  it('uses the rulebook defaults (p.13)', () => {
    const ship = createEmptyShipData()
    expect(ship.hull).toBe(OFFWORLDERS_SHIP_HULL_DEFAULT)
    expect(ship.hullMax).toBe(OFFWORLDERS_SHIP_HULL_DEFAULT)
    expect(ship.armor).toBe(0)
    expect(ship.damage).toBe(OFFWORLDERS_SHIP_DAMAGE_DEFAULT)
    expect(ship.driveFuel).toBe(OFFWORLDERS_SHIP_MAX_DRIVE_FUEL_DEFAULT)
    expect(ship.maxDriveFuel).toBe(OFFWORLDERS_SHIP_MAX_DRIVE_FUEL_DEFAULT)
    expect(ship.upgrades).toEqual([])
    expect(ship.notes).toBe('')
  })
})

describe('ship upgrade catalog', () => {
  it('marks exactly the two repeatable (asterisked) upgrades', () => {
    const repeatable = OFFWORLDERS_SHIP_UPGRADES.filter((u) => u.repeatable).map((u) => u.name)
    expect(repeatable).toEqual(['Additional Armor', 'More Powerful Weapons'])
  })

  it('caps repeatable upgrades at 2 and the rest at 1', () => {
    expect(shipUpgradeMaxCount('Additional Armor')).toBe(2)
    expect(shipUpgradeMaxCount('MedBay')).toBe(1)
    expect(shipUpgradeMaxCount('Not a real upgrade')).toBe(0)
  })
})

describe('ship upgrade helpers', () => {
  it('adds, counts and removes upgrades', () => {
    let list = []
    list = addShipUpgrade(list, 'MedBay')
    expect(shipUpgradeCount(list, 'MedBay')).toBe(1)
    expect(canAddShipUpgrade(list, 'MedBay')).toBe(false)
    list = addShipUpgrade(list, 'MedBay') // no-op at the cap
    expect(shipUpgradeCount(list, 'MedBay')).toBe(1)
    list = removeShipUpgrade(list, 'MedBay')
    expect(list).toEqual([])
  })

  it('allows a repeatable upgrade to be taken twice', () => {
    let list = []
    list = addShipUpgrade(list, 'Additional Armor')
    list = addShipUpgrade(list, 'Additional Armor')
    expect(shipUpgradeCount(list, 'Additional Armor')).toBe(2)
    expect(canAddShipUpgrade(list, 'Additional Armor')).toBe(false)
  })

  it('toggles an upgrade on and off', () => {
    let list = toggleShipUpgrade([], 'Fuel Tanks')
    expect(list).toEqual(['Fuel Tanks'])
    list = toggleShipUpgrade(list, 'Fuel Tanks')
    expect(list).toEqual([])
  })

  it('ignores unknown upgrade names', () => {
    expect(addShipUpgrade([], 'Made Up')).toEqual([])
  })
})

describe('normalizeShipData', () => {
  it('fills defaults for missing data', () => {
    expect(normalizeShipData(null)).toEqual(createEmptyShipData())
  })

  it('coerces numbers and drops non-string upgrades', () => {
    const ship = normalizeShipData({
      hull: '7',
      armor: '',
      stamina: 99,
      upgrades: ['Fuel Tanks', 3, null],
      notes: null,
    })
    expect(ship.hull).toBe(7)
    expect(ship.armor).toBe(0)
    expect(ship.upgrades).toEqual(['Fuel Tanks'])
    expect(ship.notes).toBe('')
  })

  it('keeps a valid damage string and caps negatives at zero', () => {
    const ship = normalizeShipData({ damage: '2D6', hull: -5 })
    expect(ship.damage).toBe('2D6')
    expect(ship.hull).toBe(0)
  })

  it('keeps only string image URLs', () => {
    const ship = normalizeShipData({ imageUrl: '/b.png', imageUrls: ['/a.png', 5, null] })
    expect(ship.imageUrl).toBe('/b.png')
    expect(ship.imageUrls).toEqual(['/a.png'])
  })
})
