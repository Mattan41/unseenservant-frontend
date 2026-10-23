/**
 * Campaign primary-system registry.
 *
 * Mirrors `features/character/dispatchers/systemRegistry.js` for the
 * campaign-level `primarySystem` field: it is the single place that knows which
 * systems a campaign can be played in and which campaign sub-sections that
 * unlocks (Offworlders -> Ship, 5e -> spell search). Views import from here
 * so they never reach into `src/systems/**` directly.
 *
 * Pure data + pure functions: no Vue, no stores, no UI.
 */
import { DND5E_SYSTEM_TYPE } from '@/systems/dnd5e/constants.js'
import {
  OFFWORLDERS_CAMPAIGN_DEFAULT_IMAGE,
  OFFWORLDERS_SYSTEM_TYPE,
} from '@/systems/offworlders/constants.js'

export { DND5E_SYSTEM_TYPE, OFFWORLDERS_SYSTEM_TYPE }

/** Placeholder art (in `/public`) for a campaign that has no image of its own. */
export const DEFAULT_CAMPAIGN_IMAGE = '/default-campaign.svg'

/** Primary system → the placeholder art (in `/public`) that system's campaigns use. */
const SYSTEM_DEFAULT_IMAGES = {
  [OFFWORLDERS_SYSTEM_TYPE]: OFFWORLDERS_CAMPAIGN_DEFAULT_IMAGE,
}

/**
 * Placeholder art for a campaign played in `systemType` — an Offworlders campaign
 * gets the sci-fi art, everything else (5e, no system, unknown) the generic one.
 * @param {string|null|undefined} systemType
 * @returns {string} a `/public` path
 */
export function campaignDefaultImage(systemType) {
  return SYSTEM_DEFAULT_IMAGES[systemType] || DEFAULT_CAMPAIGN_IMAGE
}

/** Selectable campaign primary systems, in display order (drives the <select>). */
export const CAMPAIGN_SYSTEM_OPTIONS = [
  { id: DND5E_SYSTEM_TYPE, label: '5e' },
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

/** True when a campaign's primary system is 5e. */
export function isDnd5e(systemType) {
  return systemType === DND5E_SYSTEM_TYPE
}
