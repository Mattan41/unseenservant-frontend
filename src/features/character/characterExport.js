/**
 * Character sheet export: markdown, plain text, and a lossless JSON backup.
 *
 * Pure — no Vue, no store, no DOM (the caller downloads the returned strings).
 *
 * Layout (see `src/utils/textExport.js`): title → generic identity (name +
 * system) → game-specific sections (from `systemRegistry.exportSectionsFor`) →
 * long-text footer (appearance, notes, backstory, private backstory). Every
 * long free-text field is markdown source: markdown export keeps it verbatim,
 * plain-text export flattens it.
 *
 * The JSON backup is deliberately *portable*: runtime/relational fields
 * (`id`, `ownerId`, `campaignId`, `avatarUrl`, timestamps) are dropped so an
 * imported file always creates a fresh character owned by the current user. The
 * user attaches it to a campaign afterwards via the existing import flow. Images
 * are out of scope for every format.
 */
import { renderDocument } from '@/utils/textExport.js'
import {
  DEFAULT_SYSTEM_TYPE,
  SYSTEM_LABELS,
  exportSectionsFor,
  normalizeCharacterBlocks,
  systemDataKey,
} from '@/features/character/dispatchers/systemRegistry.js'

export const CHARACTER_BACKUP_APP = 'unseenservant'
export const CHARACTER_BACKUP_KIND = 'character'
export const CHARACTER_BACKUP_SCHEMA_VERSION = 1

/** The character's long free-text fields, as export sections (footer order). */
function longTextSections(character) {
  const sections = []
  if (character.appearance) sections.push({ heading: 'Appearance', text: character.appearance })
  if (character.notes) sections.push({ heading: 'Notes', text: character.notes })
  if (character.backstory) sections.push({ heading: 'Backstory', text: character.backstory })
  if (character.privateBackstory) {
    sections.push({ heading: 'Private backstory', text: character.privateBackstory })
  }
  return sections
}

/**
 * Render a character sheet to markdown or plain text.
 *
 * @param {object} character
 * @param {{format?: 'md'|'txt', spells?: Array<object>}} [options]
 * @returns {string}
 */
export function buildCharacterExport(character, { format = 'txt', spells = [] } = {}) {
  const systemLabel = SYSTEM_LABELS[character.systemType] || character.systemType || ''
  return renderDocument(
    {
      title: character.name || 'Character',
      subtitle: systemLabel,
      sections: [
        ...exportSectionsFor(character.systemType, character, { spells }),
        ...longTextSections(character),
      ],
    },
    format,
  )
}

/**
 * Build a portable JSON backup envelope for a character.
 *
 * @param {object} character
 * @returns {object} envelope `{ app, kind, schemaVersion, exportedAt, character }`
 */
export function buildCharacterBackup(character) {
  const payload = {
    name: character.name || '',
    systemType: character.systemType || '',
    notes: character.notes || '',
    appearance: character.appearance || '',
    backstory: character.backstory || '',
    privateBackstory: character.privateBackstory || '',
  }
  const key = systemDataKey(character.systemType)
  if (key) payload[key] = character[key]

  return {
    app: CHARACTER_BACKUP_APP,
    kind: CHARACTER_BACKUP_KIND,
    schemaVersion: CHARACTER_BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    character: payload,
  }
}

/**
 * Parse and validate a character backup file's text.
 *
 * @param {string} text
 * @returns {object} the portable character payload (name/systemType + fields)
 * @throws {Error} with a user-readable message when the file is not usable
 */
export function parseCharacterBackup(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }

  const character = parsed?.character
  if (!character || typeof character !== 'object') {
    throw new Error('This file does not look like a character backup.')
  }
  if (parsed.kind && parsed.kind !== CHARACTER_BACKUP_KIND) {
    throw new Error(`This backup is for a "${parsed.kind}", not a character.`)
  }
  if (Number(parsed.schemaVersion) > CHARACTER_BACKUP_SCHEMA_VERSION) {
    throw new Error('This backup was made by a newer version of the app.')
  }
  if (!character.name || !character.systemType) {
    throw new Error('The backup is missing the character name or game system.')
  }

  return character
}

/**
 * Turn a parsed backup payload into the form-model character object that
 * `CreateCharacter.vue` binds. Each system block is run through its normaliser
 * so legacy blocks upgrade exactly like a fetched character, and relational
 * fields (owner/campaign/id) are never carried over — the create step always
 * makes a fresh character owned by the current user.
 *
 * @param {object} backup a payload from {@link parseCharacterBackup}
 * @returns {object} `{ name, systemType, notes, appearance, backstory, privateBackstory, <block> }`
 */
export function characterFromBackup(backup) {
  return {
    name: backup.name,
    systemType: backup.systemType || DEFAULT_SYSTEM_TYPE,
    notes: backup.notes || '',
    appearance: backup.appearance || '',
    backstory: backup.backstory || '',
    privateBackstory: backup.privateBackstory || '',
    ...normalizeCharacterBlocks(backup),
  }
}
