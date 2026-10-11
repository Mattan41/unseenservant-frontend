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

/**
 * Characters that a participant owns within a campaign.
 *
 * @param {object} participant
 * @param {Array<object>} characters
 * @returns {Array<object>}
 */
function getParticipantCharacters(participant, characters = []) {
  return (characters || []).filter(
    (character) => String(character.ownerId) === String(participant?.id),
  )
}

/**
 * Campaign summary roster: one `nickname · ROLE · character` label per
 * participant, with a further ` · character` for every additional character
 * they own.
 *
 * A participant who owns no character is still listed, so the roster always
 * shows everyone at the table.
 *
 * @param {Array<object>} participants
 * @param {Array<object>} characters - Characters in the same campaign
 * @returns {Array<{id: (number|string), label: string}>}
 */
export function formatParticipantRoster(participants = [], characters = []) {
  return (participants || []).map((participant) => ({
    id: participant.id,
    label: [
      getParticipantDisplayName(participant),
      participant.role || 'PLAYER',
      ...getParticipantCharacters(participant, characters).map(
        (character) => character.name || 'Unnamed Character',
      ),
    ].join(' · '),
  }))
}
