/**
 * Offworlders game-specific export sections.
 *
 * Pure — no Vue, no store. Returns the neutral section model consumed by
 * `src/utils/textExport.js`, so the sheet's game data can be rendered as
 * markdown or plain text without this module knowing the format.
 */
import {
  OFFWORLDERS_SUPPLY_MAX,
  armorLabel,
  damageForWeaponType,
  isWeaponHeavy,
  offworldersVitals,
} from '@/systems/offworlders/constants.js'

/** Format an attribute/misc value with an explicit sign (`+1`, `0`, `-1`). */
function signed(value) {
  const number = Number(value) || 0
  return number > 0 ? `+${number}` : String(number)
}

/**
 * Build the ordered Offworlders sections for a character's export.
 *
 * Vitals are derived from their sources via {@link offworldersVitals} so the
 * export matches the sheet exactly (abilities' passive bonuses, worn armor,
 * etc.).
 *
 * @param {object} character
 * @returns {Array<object>} sections (see `textExport.js`)
 */
export function offworldersExportSections(character) {
  const data = character?.offworlders || {}
  const vitals = offworldersVitals(data)

  const vitalsFields = [{ label: 'Class', value: data.characterClass || '—' }]
  if (data.species) vitalsFields.push({ label: 'Species', value: data.species })
  vitalsFields.push(
    { label: 'HP', value: `${vitals.currentHealth} / ${vitals.maxHealth}` },
    { label: 'Armor', value: `${vitals.effectiveArmor} (${armorLabel(data.armor)})` },
    { label: 'Supply', value: `${data.supply ?? 0} / ${OFFWORLDERS_SUPPLY_MAX}` },
    { label: 'Credits', value: `${data.credits ?? 0}` },
    { label: 'XP', value: `${data.xp ?? 0}` },
  )

  const weapons = (data.weapons || []).map((weapon) => {
    const name = weapon.description || 'Unnamed weapon'
    const damage = damageForWeaponType(weapon.type)
    const heavy = isWeaponHeavy(weapon.type) ? ' [Heavy]' : ''
    return `${name} — ${weapon.type} (damage ${damage})${heavy}`
  })

  const items = (data.items || []).map((item) =>
    item.description ? `${item.name || 'Unnamed item'} — ${item.description}` : item.name || 'Unnamed item',
  )

  return [
    { heading: 'Vitals', fields: vitalsFields },
    { heading: 'Weapons', items: weapons },
    { heading: 'Items', items },
    {
      heading: 'Attributes',
      fields: [
        { label: 'Strength', value: signed(data.stats?.strength) },
        { label: 'Agility', value: signed(data.stats?.agility) },
        { label: 'Intelligence', value: signed(data.stats?.intelligence) },
        { label: 'Willpower', value: signed(data.stats?.willpower) },
      ],
    },
    { heading: 'Skills', items: (data.skills || []).map((entry) => entry.name).filter(Boolean) },
    { heading: 'Abilities', items: (data.abilities || []).map((entry) => entry.name).filter(Boolean) },
  ]
}
