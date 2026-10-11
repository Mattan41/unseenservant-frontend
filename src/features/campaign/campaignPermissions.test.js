import { describe, it, expect } from 'vitest'
import {
  GM_ROLE,
  PLAYER_ROLE,
  sameId,
  findParticipant,
  getParticipantRole,
  isCampaignOwner,
  isCampaignGm,
  getCampaignPermissions,
  canRemoveCharacter,
  canSeePrivateBackstory,
} from './campaignPermissions.js'

/**
 * Fixture campaigns covering the two independent axes:
 *  - owner who is also GM
 *  - owner who is only a player
 *  - non-owner GM
 *  - non-owner player
 */
const campaign = {
  id: 1,
  ownerId: 10,
  participants: [
    { id: 10, nickname: 'Owner', role: 'PLAYER' },
    { id: 11, nickname: 'Gm', role: 'GM' },
    { id: 12, nickname: 'Player', role: 'PLAYER' },
  ],
}

const ownerIsGmCampaign = {
  id: 2,
  ownerId: 10,
  participants: [
    { id: 10, nickname: 'OwnerGm', role: 'GM' },
    { id: 12, nickname: 'Player', role: 'PLAYER' },
  ],
}

const OWNER = 10
const GM = 11
const PLAYER = 12

describe('sameId', () => {
  it('matches across string and number types', () => {
    expect(sameId(1, '1')).toBe(true)
    expect(sameId('guest_demo', 'guest_demo')).toBe(true)
  })

  it('never matches null or undefined', () => {
    expect(sameId(null, '1')).toBe(false)
    expect(sameId(1, null)).toBe(false)
    expect(sameId(undefined, undefined)).toBe(false)
  })
})

describe('findParticipant / role lookups', () => {
  it('finds the participant regardless of id type', () => {
    expect(findParticipant(campaign, '11')?.nickname).toBe('Gm')
    expect(findParticipant(campaign, 99)).toBeNull()
    expect(findParticipant(null, 10)).toBeNull()
  })

  it('normalizes the role to upper case', () => {
    const lower = { ownerId: 1, participants: [{ id: 5, role: 'gm' }] }
    expect(getParticipantRole(lower, 5)).toBe(GM_ROLE)
    expect(getParticipantRole(campaign, 99)).toBeNull()
  })

  it('defaults a missing role to PLAYER', () => {
    const noRole = { ownerId: 1, participants: [{ id: 5 }] }
    expect(getParticipantRole(noRole, 5)).toBe(PLAYER_ROLE)
  })
})

describe('isCampaignOwner / isCampaignGm', () => {
  it('resolves ownership independently of the table role', () => {
    expect(isCampaignOwner(campaign, OWNER)).toBe(true)
    expect(isCampaignOwner(campaign, GM)).toBe(false)
    expect(isCampaignOwner(null, OWNER)).toBe(false)
  })

  it('resolves GM independently of ownership', () => {
    expect(isCampaignGm(campaign, GM)).toBe(true)
    expect(isCampaignGm(campaign, OWNER)).toBe(false)
    expect(isCampaignGm(ownerIsGmCampaign, OWNER)).toBe(true)
  })
})

describe('getCampaignPermissions — owner who is also GM', () => {
  const permissions = getCampaignPermissions(ownerIsGmCampaign, OWNER)

  it('grants every capability', () => {
    expect(permissions).toMatchObject({
      isOwner: true,
      isGm: true,
      isPlayer: false,
      isParticipant: true,
      canTransferOwnership: true,
      canDeleteCampaign: true,
      canManageParticipants: true,
      canChangeParticipantRoles: true,
      canEditOthersNicknames: true,
      canEditCampaignDetails: true,
      canUploadCampaignImage: true,
      canEditWorldLore: true,
      canSeeGmNotes: true,
      canEditGmNotes: true,
      canChangeOwnNickname: true,
      canImportCharacter: true,
      canViewShip: true,
      canEditShip: true,
    })
  })
})

describe('getCampaignPermissions — owner who is only a player', () => {
  const permissions = getCampaignPermissions(campaign, OWNER)

  it('keeps the ownership (admin) rights', () => {
    expect(permissions.isOwner).toBe(true)
    expect(permissions.isGm).toBe(false)
    expect(permissions.isPlayer).toBe(true)
    expect(permissions.canTransferOwnership).toBe(true)
    expect(permissions.canDeleteCampaign).toBe(true)
    expect(permissions.canManageParticipants).toBe(true)
    expect(permissions.canChangeParticipantRoles).toBe(true)
    expect(permissions.canEditOthersNicknames).toBe(true)
  })

  it('does NOT grant the GM (content) rights', () => {
    expect(permissions.canEditCampaignDetails).toBe(false)
    expect(permissions.canUploadCampaignImage).toBe(false)
    expect(permissions.canEditWorldLore).toBe(false)
    expect(permissions.canSeeGmNotes).toBe(false)
    expect(permissions.canEditGmNotes).toBe(false)
  })

  it('still allows personal and shared capabilities', () => {
    expect(permissions.canChangeOwnNickname).toBe(true)
    expect(permissions.canImportCharacter).toBe(true)
    expect(permissions.canViewShip).toBe(true)
    expect(permissions.canEditShip).toBe(true)
  })
})

describe('getCampaignPermissions — non-owner GM', () => {
  const permissions = getCampaignPermissions(campaign, GM)

  it('grants the GM (content) rights', () => {
    expect(permissions.isOwner).toBe(false)
    expect(permissions.isGm).toBe(true)
    expect(permissions.canEditCampaignDetails).toBe(true)
    expect(permissions.canUploadCampaignImage).toBe(true)
    expect(permissions.canEditWorldLore).toBe(true)
    expect(permissions.canSeeGmNotes).toBe(true)
    expect(permissions.canEditGmNotes).toBe(true)
  })

  it('does NOT grant the ownership (admin) rights', () => {
    expect(permissions.canTransferOwnership).toBe(false)
    expect(permissions.canDeleteCampaign).toBe(false)
    expect(permissions.canManageParticipants).toBe(false)
    expect(permissions.canChangeParticipantRoles).toBe(false)
    expect(permissions.canEditOthersNicknames).toBe(false)
  })
})

describe('getCampaignPermissions — non-owner player', () => {
  const permissions = getCampaignPermissions(campaign, PLAYER)

  it('grants only personal and shared capabilities', () => {
    expect(permissions).toMatchObject({
      isOwner: false,
      isGm: false,
      isPlayer: true,
      isParticipant: true,
      canChangeOwnNickname: true,
      canImportCharacter: true,
      canViewShip: true,
      canEditShip: true,
    })
  })

  it('denies every admin, content and naming capability', () => {
    expect(permissions.canTransferOwnership).toBe(false)
    expect(permissions.canDeleteCampaign).toBe(false)
    expect(permissions.canManageParticipants).toBe(false)
    expect(permissions.canChangeParticipantRoles).toBe(false)
    expect(permissions.canEditOthersNicknames).toBe(false)
    expect(permissions.canEditCampaignDetails).toBe(false)
    expect(permissions.canUploadCampaignImage).toBe(false)
    expect(permissions.canEditWorldLore).toBe(false)
    expect(permissions.canSeeGmNotes).toBe(false)
    expect(permissions.canEditGmNotes).toBe(false)
  })
})

describe('getCampaignPermissions — edge cases', () => {
  it('denies everything while the campaign is still loading', () => {
    const permissions = getCampaignPermissions(null, OWNER)
    expect(permissions.isOwner).toBe(false)
    expect(permissions.isGm).toBe(false)
    expect(permissions.isParticipant).toBe(false)
    expect(permissions.canEditCampaignDetails).toBe(false)
    expect(permissions.canTransferOwnership).toBe(false)
    expect(permissions.canViewShip).toBe(false)
    expect(permissions.canChangeOwnNickname).toBe(false)
  })

  it('denies everything when no user is signed in', () => {
    const permissions = getCampaignPermissions(campaign, null)
    expect(permissions.isOwner).toBe(false)
    expect(permissions.isParticipant).toBe(false)
    expect(permissions.canViewShip).toBe(false)
  })

  it('treats a non-participant, non-owner as having no access', () => {
    const permissions = getCampaignPermissions(campaign, 999)
    expect(permissions.isParticipant).toBe(false)
    expect(permissions.isPlayer).toBe(false)
    expect(permissions.canChangeOwnNickname).toBe(false)
    expect(permissions.canImportCharacter).toBe(false)
    expect(permissions.canViewShip).toBe(false)
  })

  it('matches guest ids (strings) across the axes', () => {
    const guestCampaign = {
      id: 'guest_campaign_1',
      ownerId: 'guest_demo',
      participants: [
        { id: 'guest_demo', nickname: 'You - Guest', role: 'GM' },
        { id: 'guest_player_1', nickname: 'User1', role: 'PLAYER' },
      ],
    }
    const guestOwner = getCampaignPermissions(guestCampaign, 'guest_demo')
    expect(guestOwner.isOwner).toBe(true)
    expect(guestOwner.isGm).toBe(true)
    expect(guestOwner.canDeleteCampaign).toBe(true)
    expect(guestOwner.canEditWorldLore).toBe(true)

    const guestPlayer = getCampaignPermissions(guestCampaign, 'guest_player_1')
    expect(guestPlayer.isOwner).toBe(false)
    expect(guestPlayer.isGm).toBe(false)
    expect(guestPlayer.canEditWorldLore).toBe(false)
  })
})

describe('canRemoveCharacter', () => {
  const character = { id: 100, ownerId: PLAYER }

  it('allows the campaign owner, a GM, and the character owner', () => {
    expect(canRemoveCharacter(character, campaign, OWNER)).toBe(true)
    expect(canRemoveCharacter(character, campaign, GM)).toBe(true)
    expect(canRemoveCharacter(character, campaign, PLAYER)).toBe(true)
  })

  it('denies an unrelated player', () => {
    const other = { id: 200, ownerId: 42 }
    expect(canRemoveCharacter(other, campaign, PLAYER)).toBe(false)
  })

  it('denies when there is no character', () => {
    expect(canRemoveCharacter(null, campaign, OWNER)).toBe(false)
  })
})

describe('canSeePrivateBackstory', () => {
  const character = { id: 100, ownerId: PLAYER }

  it('allows the character owner and a campaign GM', () => {
    expect(canSeePrivateBackstory(character, campaign, PLAYER)).toBe(true)
    expect(canSeePrivateBackstory(character, campaign, GM)).toBe(true)
  })

  it('denies an unrelated player and the non-GM owner', () => {
    expect(canSeePrivateBackstory(character, campaign, 42)).toBe(false)
    expect(canSeePrivateBackstory(character, campaign, OWNER)).toBe(false)
  })
})
