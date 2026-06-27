/**
 * Format a spell level number into a human-readable label.
 * Pure function — no Vue or store dependencies.
 *
 * @param {number|string} level - The spell level (0 = cantrip)
 * @returns {string} Formatted label, e.g. "Cantrip", "1st level", "3rd level"
 */
export function formatSpellLevel(level) {
  if (level === 0 || level === '0' || level === undefined || level === null) return 'Cantrip'
  const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' }
  const suffix = suffixes[level] || 'th'
  return `${level}${suffix} level`
}

/**
 * Resolve a spell's school name from either a string or object form.
 *
 * @param {string|object} school - Raw school value (can be "Evocation" or { name: "Evocation", key: "evocation" })
 * @returns {string} School name string, or empty string if not provided
 */
export function formatSchoolName(school) {
  if (!school) return ''
  return typeof school === 'object' ? school.name || '' : school
}

/**
 * Format a spell's components array into a comma-separated string.
 *
 * @param {Array|string} components - Raw components (e.g. ["V", "S", "M"] or "V, S, M")
 * @returns {string} Comma-separated components string, or empty string if not provided
 */
export function formatComponents(components) {
  if (!components) return ''
  return Array.isArray(components) ? components.join(', ') : components
}

/**
 * Normalize an Open5e v2 spell object into a clean homebrew-ready format.
 * Flattens nested objects (school, document) into top-level strings.
 * Pure function — no Vue or store dependencies.
 *
 * @param {object} rawSpell - Raw spell from Open5e API
 * @returns {object} Normalized spell object
 */
export function normalizeSpell(rawSpell) {
  const docKey = rawSpell.document?.key || rawSpell.documentKey || ''
  const docName = rawSpell.document?.name || rawSpell.documentName || ''

  const sourceMap = {
    'srd-2014': 'SRD 5.1',
    'srd-2024': 'SRD 5.2',
    'a5e-ag': "Adventurer's Guide",
    'a5e-ddg': 'Dungeon Delver',
    'a5e-gpg': 'Game Plan',
    'a5e-mm': 'Monstrous Menagerie',
    bfrd: 'Black Flag',
    ccdx: 'Creature Codex',
    deepm: 'Deep Magic',
    deepmx: 'Deep Magic Expanded',
    kp: 'Kobold Press',
    open5e: 'Open5e',
    tob: 'Tome of Beasts',
    'tob-2023': 'ToB 2023',
    tob2: 'ToB 2',
    tob3: 'ToB 3',
    toh: 'Tome of Heroes',
    vom: 'Vault of Magic',
    wz: 'Wastes of Chaos',
    tdcs: "Tal'Dorei",
    core: 'Core',
    homebrew: 'Homebrew',
  }

  const sourceLabel = sourceMap[docKey] || docName || docKey || 'Unknown'
  const level = rawSpell.level ?? 0
  const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' }
  const levelLabel = level === 0 ? 'Cantrip' : `${level}${suffixes[level] || 'th'} level`
  const school = rawSpell.school?.name || rawSpell.school || ''

  const componentParts = []
  if (rawSpell.verbal) componentParts.push('V')
  if (rawSpell.somatic) componentParts.push('S')
  if (rawSpell.material) componentParts.push('M')

  const components =
    Array.isArray(rawSpell.components) && rawSpell.components.length > 0
      ? rawSpell.components
      : componentParts

  const materialText =
    rawSpell.material_specified || rawSpell.material_text || rawSpell.materialText || ''

  const rawRange = rawSpell.range_text || rawSpell.range
  const range =
    typeof rawRange === 'number' ? (rawRange === 0 ? 'Touch' : `${rawRange} feet`) : rawRange || ''

  return {
    key: rawSpell.key || '',
    name: rawSpell.name || 'Unknown Spell',
    level,
    levelLabel,
    school,
    schoolKey: rawSpell.school?.key || '',
    documentKey: docKey,
    documentName: docName,
    sourceLabel,
    classes: (rawSpell.classes || []).map((c) => c.name || c),
    desc: rawSpell.desc || rawSpell.description || '',
    duration: rawSpell.duration || '',
    casting_time: rawSpell.casting_time || '',
    range,
    components,
    materialText,
    verbal: rawSpell.verbal || false,
    somatic: rawSpell.somatic || false,
    material: !!rawSpell.material,
    ritual: rawSpell.ritual || false,
    concentration: rawSpell.concentration || false,
    higher_level: rawSpell.higher_level || '',
    isHomebrew: false,
  }
}

export const schoolColorMap = {
  abjuration: 'badge-blue',
  conjuration: 'badge-purple',
  divination: 'badge-indigo',
  enchantment: 'badge-pink',
  evocation: 'badge-danger',
  illusion: 'badge-teal',
  necromancy: 'badge-muted',
  transmutation: 'badge-yellow',
}

export function getSchoolBadgeClass(school) {
  return schoolColorMap[(school || '').toLowerCase()] || 'badge-muted'
}
