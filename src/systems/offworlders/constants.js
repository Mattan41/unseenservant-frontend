/**
 * Offworlders system constants and helpers.
 * Pure data/functions — no Vue or store dependencies.
 *
 * Offworlders is a rules-light sci-fi RPG. Attributes range from -1 to +3,
 * Armor from 0 to 3, Health is derived as `max(1, 12 + strength + agility)`.
 */

export const OFFWORLDERS_SYSTEM_TYPE = 'OFFWORLDERS'

/** The four playable classes ("roles"). */
export const OFFWORLDERS_CLASSES = ['Geek', 'Outlaw', 'Psychic', 'Warrior']

/** Attribute keys, in the order they appear on the character sheet. */
export const OFFWORLDERS_ATTRIBUTES = ['strength', 'agility', 'intelligence', 'willpower']

export const OFFWORLDERS_ATTRIBUTE_MIN = -1
export const OFFWORLDERS_ATTRIBUTE_MAX = 3
export const OFFWORLDERS_ARMOR_MAX = 3

/**
 * Canonical skill options offered as checkboxes in the form.
 * Players may also add free-text custom skills, so this list is a convenience
 * rather than a closed set.
 */
export const OFFWORLDERS_SKILLS = [
  'Athletics',
  'Brawl',
  'Command',
  'Computers',
  'Engineering',
  'Gunnery',
  'Insight',
  'Investigate',
  'Medicine',
  'Pilot',
  'Science',
  'Sneak',
  'Survival',
  'Tech',
]

/**
 * Class abilities, taken from the Offworlders class write-ups. Offered as
 * checkboxes once a class has been selected; custom abilities are also allowed.
 */
export const OFFWORLDERS_ABILITIES = {
  Geek: ['Analytical', 'Chemist', 'Drone Controller', 'Hijack', 'Medic', 'Polymath'],
  Outlaw: ['Cheap Shot', 'Ghost', 'Reckless', 'Lucky', 'Shoot First', 'Smuggle'],
  Psychic: ['Blast', 'Force Wall', 'Jump', 'Premonition', 'Scanner', 'Telekinesis'],
  Warrior: ['Brute', 'Dead Eye', 'Hardy', 'Heavy Lifting', 'Unstoppable', "Veteran's Instincts"],
}

/**
 * Health is derived from Strength and Agility, with a floor of 1.
 * @param {{strength?: number, agility?: number}|null|undefined} stats
 * @returns {number}
 */
export function deriveHealth(stats) {
  const strength = Number(stats?.strength) || 0
  const agility = Number(stats?.agility) || 0
  return Math.max(1, 12 + strength + agility)
}

/**
 * Build a fresh, valid Offworlders data block for a new character.
 * @returns {object}
 */
export function createEmptyOffworldersData() {
  return {
    characterClass: '',
    species: '',
    look: '',
    xp: 0,
    health: 12,
    armor: 0,
    supply: 0,
    supplyMax: 0,
    stats: {
      strength: 0,
      agility: 0,
      intelligence: 0,
      willpower: 0,
    },
    skills: [],
    abilities: [],
  }
}

/**
 * Normalize an Offworlders data block coming from the API, filling in defaults
 * so the UI never has to deal with missing nested properties.
 * @param {object|null|undefined} data
 * @returns {object}
 */
export function normalizeOffworldersData(data) {
  const empty = createEmptyOffworldersData()
  if (!data) return empty
  return {
    ...empty,
    ...data,
    stats: { ...empty.stats, ...(data.stats || {}) },
    skills: Array.isArray(data.skills) ? [...data.skills] : [],
    abilities: Array.isArray(data.abilities) ? [...data.abilities] : [],
  }
}

/**
 * Add a trimmed value to a string list, ignoring blanks and duplicates.
 * @param {string[]} list
 * @param {string} value
 * @returns {string[]} a new list
 */
export function addListValue(list, value) {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return [...list]
  if (list.includes(trimmed)) return [...list]
  return [...list, trimmed]
}

/**
 * Remove the first occurrence of a value from a string list.
 * @param {string[]} list
 * @param {string} value
 * @returns {string[]} a new list
 */
export function removeListValue(list, value) {
  return list.filter((entry) => entry !== value)
}

/**
 * Toggle a value's membership in a string list.
 * @param {string[]} list
 * @param {string} value
 * @returns {string[]} a new list
 */
export function toggleListValue(list, value) {
  return list.includes(value) ? removeListValue(list, value) : addListValue(list, value)
}