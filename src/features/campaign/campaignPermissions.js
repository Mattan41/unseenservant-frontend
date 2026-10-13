/**
 * Campaign permission model — the single source of truth for who may do what.
 *
 * Rights live on **two independent axes**:
 *
 *   1. Ownership  — `isOwner` (the campaign's `ownerId` matches the user).
 *                   Owns administration: transfer, delete, roster, roles.
 *   2. Table role — `isGm` (a participant entry with role `GM`), else player.
 *                   Owns world-building: details, image, lore, GM notes.
 *
 * The two are deliberately orthogonal: an owner may be a player, and a GM may
 * be a non-owner. Keeping the checks here (pure functions, no store access)
 * mirrors `campaignUtils.js` and lets the UI and the test-suite share one
 * definition — components must never re-derive these rules inline again.
 */

/** Table role that grants world-building rights. */
export const GM_ROLE = 'GM'

/** Table role that grants no special content rights. */
export const PLAYER_ROLE = 'PLAYER'

/**
 * Compare two ids that may arrive as a number (backend Long) or a string
 * (guest-mode/localStorage). `null`/`undefined` never match anything.
 *
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
export function sameId(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false
  return String(a) === String(b)
}

/**
 * The current user's participant entry in a campaign, or `null`.
 *
 * @param {object|null} campaign - CampaignResponseDTO
 * @param {number|string|null} userId
 * @returns {{ id: number|string, nickname?: string, role?: string }|null}
 */
export function findParticipant(campaign, userId) {
  if (
    !campaign ||
    !Array.isArray(campaign.participants) ||
    userId === null ||
    userId === undefined
  ) {
    return null
  }
  return campaign.participants.find((participant) => sameId(participant.id, userId)) || null
}

/**
 * The current user's table role in a campaign, or `null` when they are not a
 * participant. Role comparison is case-insensitive.
 *
 * @param {object|null} campaign
 * @param {number|string|null} userId
 * @returns {string|null}
 */
export function getParticipantRole(campaign, userId) {
  const participant = findParticipant(campaign, userId)
  return participant ? String(participant.role || PLAYER_ROLE).toUpperCase() : null
}

/**
 * Whether the user owns the campaign.
 *
 * @param {object|null} campaign
 * @param {number|string|null} userId
 * @returns {boolean}
 */
export function isCampaignOwner(campaign, userId) {
  if (!campaign || userId === null || userId === undefined) return false
  return sameId(campaign.ownerId, userId)
}

/**
 * Whether the user is a GM (table role) in the campaign.
 *
 * @param {object|null} campaign
 * @param {number|string|null} userId
 * @returns {boolean}
 */
export function isCampaignGm(campaign, userId) {
  return getParticipantRole(campaign, userId) === GM_ROLE
}

/**
 * Resolve the full capability set for a user against a campaign.
 *
 * @param {object|null} campaign - CampaignResponseDTO (or `null` while loading)
 * @param {number|string|null} currentUserId
 * @returns {{
 *   isOwner: boolean, isGm: boolean, isPlayer: boolean, isParticipant: boolean,
 *   canTransferOwnership: boolean, canDeleteCampaign: boolean,
 *   canManageParticipants: boolean, canChangeParticipantRoles: boolean,
 *   canEditOthersNicknames: boolean,
 *   canEditCampaignDetails: boolean, canUploadCampaignImage: boolean,
 *   canEditWorldLore: boolean, canSeeGmNotes: boolean, canEditGmNotes: boolean,
 *   canChangeOwnNickname: boolean, canImportCharacter: boolean,
 *   canViewShip: boolean, canEditShip: boolean,
 * }}
 */
export function getCampaignPermissions(campaign, currentUserId) {
  const isOwner = isCampaignOwner(campaign, currentUserId)
  const isGm = isCampaignGm(campaign, currentUserId)
  const isParticipant = findParticipant(campaign, currentUserId) !== null
  const isPlayer = isParticipant && !isGm
  // Authorized readers include the owner even if they are somehow not listed as
  // a participant (the backend treats ownership as authorization).
  const isMember = isParticipant || isOwner

  return {
    isOwner,
    isGm,
    isPlayer,
    isParticipant,

    // Ownership axis — administration (owner only).
    canTransferOwnership: isOwner,
    canDeleteCampaign: isOwner,
    canManageParticipants: isOwner,
    canChangeParticipantRoles: isOwner,
    canEditOthersNicknames: isOwner,

    // Table-role axis — world-building (GM only).
    canEditCampaignDetails: isGm,
    canUploadCampaignImage: isGm,
    canEditWorldLore: isGm,
    canSeeGmNotes: isGm,
    canEditGmNotes: isGm,

    // Personal — any participant (their own nickname / characters).
    canChangeOwnNickname: isParticipant,
    canImportCharacter: isMember,

    // Shared at the table — every participant may view and edit the ship.
    canViewShip: isMember,
    canEditShip: isMember,
  }
}

/**
 * Whether the user may remove a character from its campaign: the campaign
 * owner, a campaign GM, or the character's own owner.
 *
 * @param {object|null} character
 * @param {object|null} campaign
 * @param {number|string|null} currentUserId
 * @returns {boolean}
 */
export function canRemoveCharacter(character, campaign, currentUserId) {
  if (!character) return false
  return (
    isCampaignOwner(campaign, currentUserId) ||
    isCampaignGm(campaign, currentUserId) ||
    sameId(character.ownerId, currentUserId)
  )
}

/**
 * Whether the user may read a character's private backstory — its owner or a
 * campaign GM (mirrors the backend's visibility rule).
 *
 * @param {object|null} character
 * @param {object|null} campaign
 * @param {number|string|null} currentUserId
 * @returns {boolean}
 */
export function canSeePrivateBackstory(character, campaign, currentUserId) {
  if (!character) return false
  return sameId(character.ownerId, currentUserId) || isCampaignGm(campaign, currentUserId)
}
