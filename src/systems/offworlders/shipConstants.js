/**
 * Offworlders ship constants and helpers.
 * Pure data/functions — no Vue or store dependencies.
 *
 * Mirrors the printed ship sheet (p.26) and the ship rules (p.13):
 *   * a blank-slate ship does 1D6 damage and has 15 Hull, 0 Armor and
 *     4 Max Drive Fuel (starting fully fueled);
 *   * the players pick from a fixed catalog of 11 upgrades at creation;
 *   * `Additional Armor` and `More Powerful Weapons` (marked * in the book)
 *     may each be taken twice.
 *
 * The catalog is small and closed, so upgrades are simply stored as an array
 * of names (repeatable ones may appear twice).
 */

export const OFFWORLDERS_SHIP_HULL_DEFAULT = 15
export const OFFWORLDERS_SHIP_ARMOR_DEFAULT = 0
export const OFFWORLDERS_SHIP_DAMAGE_DEFAULT = '1D6'
export const OFFWORLDERS_SHIP_MAX_DRIVE_FUEL_DEFAULT = 4

/** The rules let the players choose this many upgrades when making the ship. */
export const OFFWORLDERS_SHIP_STARTING_UPGRADES = 2

/** Repeatable upgrades (asterisked in the book) may be taken twice. */
export const OFFWORLDERS_SHIP_UPGRADE_MAX_REPEATABLE = 2

/**
 * The full ship-upgrade catalog (p.26), in sheet order.
 * `repeatable` entries may be taken twice (cumulative bonus).
 */
export const OFFWORLDERS_SHIP_UPGRADES = [
  { name: 'Additional Armor', description: '+1 armor.', repeatable: true },
  {
    name: 'Advanced Electronics',
    description: 'High-end scanners, communicators, sensors, etc.',
    repeatable: false,
  },
  {
    name: 'Advanced Drive',
    description:
      'For each interstellar trip, take either half the time or half the amount of fuel. Round up.',
    repeatable: false,
  },
  {
    name: 'Afterburners',
    description:
      'Spend 1 Drive Fuel for +1 to a single roll to evade, outrun, or maneuver while piloting.',
    repeatable: false,
  },
  { name: 'Fuel Tanks', description: 'Max drive fuel +2.', repeatable: false },
  {
    name: 'High Maneuverability',
    description:
      'Count as having the Pilot skill when maneuverability matters; if you already have it, reroll both dice instead of one.',
    repeatable: false,
  },
  {
    name: 'Luxury Passenger Quarters',
    description: 'Gourmet nutrition and fine decor — attracts a wealthier class of clientele.',
    repeatable: false,
  },
  {
    name: 'Massive Cargo Hold',
    description: 'Large enough to transport smaller vehicles or a huge amount of goods.',
    repeatable: false,
  },
  {
    name: 'MedBay',
    description:
      'Automated medical equipment. Resting overnight heals all HP instead of half; at 0 HP it can stabilise a character.',
    repeatable: false,
  },
  { name: 'More Powerful Weapons', description: '+1 damage.', repeatable: true },
  {
    name: 'Shuttle Bay',
    description:
      'Comes with a small shuttle that can fly independently, but cannot travel between stars on its own.',
    repeatable: false,
  },
]

function toInt(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : fallback
}

function toNonNegativeInt(value, fallback) {
  return Math.max(0, toInt(value, fallback))
}

/**
 * Build a fresh ship data block with the rulebook defaults.
 * @returns {object}
 */
export function createEmptyShipData() {
  return {
    name: '',
    hull: OFFWORLDERS_SHIP_HULL_DEFAULT,
    hullMax: OFFWORLDERS_SHIP_HULL_DEFAULT,
    armor: OFFWORLDERS_SHIP_ARMOR_DEFAULT,
    damage: OFFWORLDERS_SHIP_DAMAGE_DEFAULT,
    driveFuel: OFFWORLDERS_SHIP_MAX_DRIVE_FUEL_DEFAULT,
    maxDriveFuel: OFFWORLDERS_SHIP_MAX_DRIVE_FUEL_DEFAULT,
    upgrades: [],
    notes: '',
  }
}

/** Catalog entry for a name, or null. */
export function shipUpgrade(name) {
  return OFFWORLDERS_SHIP_UPGRADES.find((upgrade) => upgrade.name === name) || null
}

/** How many times an upgrade may be taken (0 for unknown names). */
export function shipUpgradeMaxCount(name) {
  const upgrade = shipUpgrade(name)
  if (!upgrade) return 0
  return upgrade.repeatable ? OFFWORLDERS_SHIP_UPGRADE_MAX_REPEATABLE : 1
}

/** How many times the given upgrade appears in the list. */
export function shipUpgradeCount(upgrades, name) {
  return (upgrades || []).filter((entry) => entry === name).length
}

/** True when another copy of the upgrade may still be added. */
export function canAddShipUpgrade(upgrades, name) {
  const max = shipUpgradeMaxCount(name)
  return max > 0 && shipUpgradeCount(upgrades, name) < max
}

/** Add one copy of the upgrade (no-op when the cap is already reached). */
export function addShipUpgrade(upgrades, name) {
  const list = upgrades || []
  return canAddShipUpgrade(list, name) ? [...list, name] : [...list]
}

/** Remove the first copy of the upgrade. */
export function removeShipUpgrade(upgrades, name) {
  const list = [...(upgrades || [])]
  const index = list.indexOf(name)
  if (index !== -1) list.splice(index, 1)
  return list
}

/** Toggle the upgrade on/off, respecting the repeatable cap. */
export function toggleShipUpgrade(upgrades, name) {
  return shipUpgradeCount(upgrades, name) > 0
    ? removeShipUpgrade(upgrades, name)
    : addShipUpgrade(upgrades, name)
}

/**
 * Normalize a ship data block coming from the API, filling in defaults so the
 * UI never has to deal with missing properties.
 * @param {object|null|undefined} data
 * @returns {object}
 */
export function normalizeShipData(data) {
  const empty = createEmptyShipData()
  if (!data) return empty

  return {
    ...empty,
    ...data,
    name: typeof data.name === 'string' ? data.name : '',
    hull: toNonNegativeInt(data.hull, empty.hull),
    hullMax: toNonNegativeInt(data.hullMax, empty.hullMax),
    armor: toNonNegativeInt(data.armor, empty.armor),
    damage: typeof data.damage === 'string' && data.damage ? data.damage : empty.damage,
    driveFuel: toNonNegativeInt(data.driveFuel, empty.driveFuel),
    maxDriveFuel: toNonNegativeInt(data.maxDriveFuel, empty.maxDriveFuel),
    upgrades: Array.isArray(data.upgrades)
      ? data.upgrades.filter((entry) => typeof entry === 'string')
      : [],
    notes: typeof data.notes === 'string' ? data.notes : '',
  }
}

