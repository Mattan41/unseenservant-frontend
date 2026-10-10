/**
 * Campaign primary-system registry.
 *
 * Mirrors `features/character/dispatchers/systemRegistry.js` for the
 * campaign-level `primarySystem` field: it is the single place that knows which
 * systems a campaign can be played in and which campaign sub-sections that
 * unlocks (Offworlders -> Ship, D&D 5e -> spell search). Views import from here
 * so they never reach into `src/systems/**` directly.
 *
 * Pure data + pure functions: no Vue, no stores, no UI.
 */
import { DND5E_SYSTEM_TYPE } from '@/systems/dnd5e/constants.js'
import { OFFWORLDERS_SYSTEM_TYPE } from '@/systems/offworlders/constants.js'

export { DND5E_SYSTEM_TYPE, OFFWORLDERS_SYSTEM_TYPE }

/** Selectable campaign primary systems, in display order (drives the <select>). */
export const CAMPAIGN_SYSTEM_OPTIONS = [
  { id: DND5E_SYSTEM_TYPE, label: 'Dungeons & Dragons 5e' },
  { id: OFFWORLDERS_SYSTEM_TYPE, label: 'Offworlders' },
]

/** System id -> display label. */
export const CAMPAIGN_SYSTEM_LABELS = Object.fromEntries(
  CAMPAIGN_SYSTEM_OPTIONS.map((option) => [option.id, option.label]),
)

/** True when a campaign's primary system is Offworlders. */
export function isOffworlders(systemType) {
  return systemType === OFFWORLDERS_SYSTEM_TYPE
}

/** True when a campaign's primary system is Dungeons & Dragons 5e. */
export function isDnd5e(systemType) {
  return systemType === DND5E_SYSTEM_TYPE
}
