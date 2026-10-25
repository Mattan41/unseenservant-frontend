/**
 * Campaign add-ons — the optional capabilities a campaign owner can switch on.
 *
 * This registry is the client's half of the contract. The backend knows which keys
 * are valid and stores only the enabled ones (`campaign_addon`, mirrored in
 * `CampaignResponseDTO.addons`); what an add-on is *called*, what it looks like and
 * which campaign section it opens belongs here. The planner is the first entry, and
 * the next one is a row in this list plus its own feature folder — the campaign
 * view already filters its navigation on the section's `addon` key.
 *
 * Guest Demo deliberately serves no add-on endpoint (see docs/ARCHITECTURE.MD →
 * Guest Mode Limitations): a demo campaign carries its add-ons in the seed data, and
 * the settings block renders them read-only.
 *
 * Pure data + pure functions: no Vue, no stores, no UI.
 */

/** The key the backend knows the planner by (its API spelling, lower case). */
export const PLANNER_ADDON = 'planner'

/** Every add-on this client can offer, in the order the settings list shows them. */
export const CAMPAIGN_ADDONS = [
  {
    id: PLANNER_ADDON,
    label: 'Planner',
    icon: 'planner',
    description:
      'Find a date that works for the group: start a plan, offer the days you could meet, and mark who can come.',
  },
]

/**
 * The registry entry for a key, or `null` for a key this client does not know
 * (an add-on a newer backend offers before this build learns about it).
 * @param {string} addonId
 * @returns {{ id: string, label: string, icon: string, description: string }|null}
 */
export function findAddon(addonId) {
  return CAMPAIGN_ADDONS.find((addon) => addon.id === addonId) || null
}

/**
 * Whether an add-on is switched on for a campaign.
 *
 * A campaign that predates the field (or a guest seed without it) simply has none:
 * `addons` is compared as the list of keys it is.
 *
 * @param {object|null} campaign - CampaignResponseDTO
 * @param {string} addonId
 * @returns {boolean}
 */
export function isAddonEnabled(campaign, addonId) {
  return Array.isArray(campaign?.addons) && campaign.addons.includes(addonId)
}
