/**
 * Campaign presentation helpers.
 *
 * Keeps role/ownership colour decisions and display fallbacks out of component
 * templates, mirroring the pattern established by `spellUtils.js`.
 */

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
