/**
 * Async bridge that gathers any system-specific extras needed for a character
 * export.
 *
 * Kept out of `systemRegistry.js` (which stays pure data/functions) so the one
 * place a *store* call is dispatched by system lives here, mirroring how
 * `SystemSheetRouter` / `SystemFormRouter` dispatch system *components*.
 */
import { DND5E_SYSTEM_TYPE } from '@/systems/dnd5e/constants.js'
import { useDnd5eSpellStore } from '@/systems/dnd5e/dnd5eSpellStore.js'

/**
 * Fetch the system-specific extras for an export, best-effort.
 *
 * For 5e that is the character's saved spells (they live in their own table
 * and are not part of the character object). Any other system has no extras.
 * Errors are swallowed: an export should still succeed without the extras.
 *
 * @param {string} systemType
 * @param {number|string} characterId
 * @returns {Promise<{spells: Array<object>}>}
 */
export async function fetchExportExtras(systemType, characterId) {
  if (systemType !== DND5E_SYSTEM_TYPE) return { spells: [] }
  try {
    const spells = await useDnd5eSpellStore().fetchCharacterSpells(characterId)
    return { spells: Array.isArray(spells) ? spells : [] }
  } catch {
    return { spells: [] }
  }
}
