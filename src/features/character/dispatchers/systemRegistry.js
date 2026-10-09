/**
 * System registry — the single place that knows which character systems the
 * app supports. Pure data + pure functions: no Vue, no stores, no UI.
 *
 * Feature views import from here (never from src/systems/** directly), so the
 * "which system" knowledge stays inside features/character/dispatchers/.
 */
import {
  createEmptyDnd5eData,
  normalizeDnd5eData,
  DND5E_SYSTEM_TYPE,
} from '@/systems/dnd5e/constants.js'
import {
  createEmptyOffworldersData,
  normalizeOffworldersData,
  OFFWORLDERS_SYSTEM_TYPE,
} from '@/systems/offworlders/constants.js'

/** System id used when a character has none. */
export const DEFAULT_SYSTEM_TYPE = DND5E_SYSTEM_TYPE

/** Selectable systems, in display order (drives the <select>). */
export const SYSTEM_OPTIONS = [
  { id: DND5E_SYSTEM_TYPE, label: 'Dungeons & Dragons 5e' },
  { id: OFFWORLDERS_SYSTEM_TYPE, label: 'Offworlders' },
]

/** System id → display label. */
export const SYSTEM_LABELS = Object.fromEntries(SYSTEM_OPTIONS.map((o) => [o.id, o.label]))

/** System id → the property key holding that system's data block on a character. */
const SYSTEM_DATA_KEYS = {
  [DND5E_SYSTEM_TYPE]: 'dnd5e',
  [OFFWORLDERS_SYSTEM_TYPE]: 'offworlders',
}

/** Empty data block for a single system. */
export function createEmptyData(systemType) {
  if (systemType === DND5E_SYSTEM_TYPE) return createEmptyDnd5eData()
  if (systemType === OFFWORLDERS_SYSTEM_TYPE) return createEmptyOffworldersData()
  return null
}

/** Normalized data block for a single system. */
export function normalizeData(systemType, raw) {
  if (systemType === DND5E_SYSTEM_TYPE) return normalizeDnd5eData(raw)
  if (systemType === OFFWORLDERS_SYSTEM_TYPE) return normalizeOffworldersData(raw)
  return null
}

/** Every system's empty block, keyed by property name (for the form model). */
export function createEmptyCharacterBlocks() {
  return Object.fromEntries(
    SYSTEM_OPTIONS.map((option) => [SYSTEM_DATA_KEYS[option.id], createEmptyData(option.id)]),
  )
}

/** Every system's normalized block from a fetched character. */
export function normalizeCharacterBlocks(raw) {
  return Object.fromEntries(
    SYSTEM_OPTIONS.map((option) => [
      SYSTEM_DATA_KEYS[option.id],
      normalizeData(option.id, raw?.[SYSTEM_DATA_KEYS[option.id]]),
    ]),
  )
}

/**
 * System-specific validation for the active block.
 * Returns an error message, or null when valid.
 * (The generic "name is required" check stays in the views.)
 */
export function validate(systemType, character) {
  if (systemType === DND5E_SYSTEM_TYPE) {
    if (!character?.dnd5e?.race) return 'You must select a race'
    if (!character?.dnd5e?.characterClass) return 'You must select a class'
    return null
  }
  if (systemType === OFFWORLDERS_SYSTEM_TYPE) {
    // Class is optional: experienced players may ignore classes entirely and
    // build a character from any two skills and any two abilities.
    return null
  }
  return null
}

/** Request payload for the active system ({ name, systemType, notes, <block> }). */
export function buildPayload(systemType, character) {
  const payload = {
    name: character.name,
    systemType: character.systemType,
    notes: character.notes,
  }
  const key = SYSTEM_DATA_KEYS[systemType]
  if (key) payload[key] = character[key]
  return payload
}
