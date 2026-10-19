/**
 * Campaign presentation helpers.
 *
 * Keeps role/ownership colour decisions, display fallbacks and the fixed party
 * order out of component templates, mirroring the pattern established by
 * `spellUtils.js`. Role/ownership rules themselves live in
 * `campaignPermissions.js` — this module only presents them.
 */

import { GM_ROLE, getParticipantRole, sameId } from './campaignPermissions.js'

/**
 * Map a participant table role to a semantic badge class.
 *
 * @param {string} role - 'GM' | 'PLAYER' | anything else
 * @returns {string} Semantic badge class name
 */
export function getRoleBadgeClass(role) {
  switch (String(role || '').toUpperCase()) {
    case 'GM':
      return 'badge-primary'
    case 'PLAYER':
      return 'badge-secondary'
    default:
      return 'badge-muted'
  }
}

/**
 * Resolve the nickname of the participant who owns a character.
 *
 * @param {object} character
 * @param {Array<{id: (number|string), nickname?: string}>} participants
 * @returns {string}
 */
export function getCharacterOwnerName(character, participants = []) {
  if (!character || character.ownerId === undefined || character.ownerId === null) {
    return 'Unknown'
  }

  const owner = (participants || []).find(
    (participant) => String(participant.id) === String(character.ownerId),
  )

  return owner?.nickname || 'Unknown'
}

/**
 * Human-readable display name for a participant.
 *
 * @param {object} participant
 * @returns {string}
 */
export function getParticipantDisplayName(participant) {
  if (!participant) return 'Unknown'
  return participant.nickname || participant.displayName || participant.username || 'Unknown'
}

/**
 * Campaign summary roster: one `nickname · ROLE` label per participant.
 *
 * Characters are deliberately left out — the roster only answers "who is at
 * this table, and in what role"; each participant's characters are listed in
 * the party preview instead.
 *
 * @param {Array<object>} participants
 * @returns {Array<{id: (number|string), label: string}>}
 */
export function formatParticipantRoster(participants = []) {
  return (participants || []).map((participant) => ({
    id: participant.id,
    label: [getParticipantDisplayName(participant), participant.role || 'PLAYER'].join(' · '),
  }))
}

/**
 * Fixed party order inside a campaign:
 *
 *   1. the viewer's own characters,
 *   2. characters whose owner is a GM at this table,
 *   3. everybody else,
 *
 * — alphabetical by character name within each group (case- and
 * accent-insensitive, so `Doc` and `doc` sort together). Characters with equal
 * names keep their incoming order, since `sort` is stable.
 *
 * The viewer's own characters stay first even when the viewer is the GM, and a
 * character whose owner is not a participant at all falls into the last group.
 * The input is never mutated; a new array is returned.
 *
 * @param {Array<object>} characters - CharacterOutputDTO list for one campaign
 * @param {object|null} campaign - the campaign, for its participant roles
 * @param {number|string|null} currentUserId - the viewer
 * @returns {Array<object>} A re-ordered copy of `characters`
 */
export function sortPartyCharacters(characters = [], campaign = null, currentUserId = null) {
  const rank = (character) => {
    if (sameId(character?.ownerId, currentUserId)) return 1
    return getParticipantRole(campaign, character?.ownerId) === GM_ROLE ? 2 : 3
  }

  const byName = (a, b) =>
    String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })

  return [...(characters || [])].sort((a, b) => rank(a) - rank(b) || byName(a, b))
}
