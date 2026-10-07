/**
 * D&D 5e system constants and helpers.
 * Pure data/functions — no Vue or store dependencies.
 */

export const DND5E_SYSTEM_TYPE = 'DND5E'

export const DND5E_RACES = [
  'Human',
  'Centaur',
  'Elf',
  'Dwarf',
  'Halfling',
  'Gnome',
  'Half-Elf',
  'Half-Orc',
  'Dragonborn',
  'Tiefling',
]

export const DND5E_CLASSES = [
  'Fighter',
  'Wizard',
  'Rogue',
  'Cleric',
  'Ranger',
  'Paladin',
  'Barbarian',
  'Bard',
  'Druid',
  'Monk',
  'Sorcerer',
  'Warlock',
]

export const DND5E_ABILITY_SCORES = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]

/**
 * Build a fresh, valid D&D 5e data block for a new character.
 * @returns {object}
 */
export function createEmptyDnd5eData() {
  return {
    level: 1,
    characterClass: '',
    race: '',
    hitPoints: 0,
    armorClass: 10,
    stats: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
  }
}

/**
 * Normalize a D&D 5e data block coming from the API, filling in defaults so
 * the UI never has to deal with missing nested properties.
 * @param {object|null|undefined} data
 * @returns {object}
 */
export function normalizeDnd5eData(data) {
  const empty = createEmptyDnd5eData()
  if (!data) return empty
  return {
    ...empty,
    ...data,
    stats: { ...empty.stats, ...(data.stats || {}) },
  }
}
