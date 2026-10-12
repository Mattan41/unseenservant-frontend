/**
 * D&D 5e game-specific export sections.
 *
 * Pure — no Vue, no store. Returns the neutral section model consumed by
 * `src/utils/textExport.js`. Deliberately thin today (the system carries little
 * data yet); when items/classes/monsters land, they extend this file only.
 */
import { DND5E_ABILITY_SCORES } from '@/systems/dnd5e/constants.js'

/** Capitalise a stat key (`strength` → `Strength`). */
function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** One line per saved spell: `Fireball (3rd level, Evocation)`. */
function formatSpellLine(spell) {
  const level = spell.levelLabel || (Number(spell.level) === 0 ? 'Cantrip' : `Level ${spell.level}`)
  const school = spell.school ? `, ${spell.school}` : ''
  return `${spell.name} (${level}${school})`
}

/**
 * Build the ordered D&D 5e sections for a character's export.
 *
 * @param {object} character
 * @param {Array<object>} [spells] normalized spells (owner/GM view only)
 * @returns {Array<object>} sections (see `textExport.js`)
 */
export function dnd5eExportSections(character, spells = []) {
  const data = character?.dnd5e || {}

  const vitals = [
    { label: 'Race', value: data.race || '—' },
    { label: 'Class', value: data.characterClass || '—' },
    { label: 'Level', value: `${data.level ?? 1}` },
    { label: 'Hit Points', value: `${data.hitPoints ?? 0}` },
    { label: 'Armor Class', value: `${data.armorClass ?? 10}` },
  ]

  const stats = DND5E_ABILITY_SCORES.map((stat) => ({
    label: titleCase(stat),
    value: `${data.stats?.[stat] ?? ''}`,
  }))

  const sections = [
    { heading: 'Vitals', fields: vitals },
    { heading: 'Ability Scores', fields: stats },
  ]

  if (Array.isArray(spells) && spells.length > 0) {
    sections.push({ heading: 'Spells', items: spells.map(formatSpellLine) })
  }

  return sections
}
