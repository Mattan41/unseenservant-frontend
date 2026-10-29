import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import guestAxios from '@/api/lib/guest-axios.js'
import { seedGuestStorage } from '@/data/demoData.js'
import { useAuthStore } from '@/features/auth/authStore.js'

/**
 * Guest mode serves every endpoint the app can reach without a backend. These
 * tests pin the routes it answers, and the admin surface it deliberately does
 * not serve: Settings → Admin is unreachable during a guest session, so the
 * mock has no /api/admin/** routes at all.
 */
describe('guest-axios admin surface (removed from guest mode)', () => {
  beforeEach(startGuestSession)

  it('does not serve the admin endpoints at all', async () => {
    await expect(guestAxios.get('api/admin/users')).resolves.toEqual({ data: null })
    await expect(guestAxios.get('api/admin/whitelist')).resolves.toEqual({ data: null })
    await expect(guestAxios.post('api/admin/whitelist', { email: 'a@b.se' })).resolves.toEqual({
      data: null,
    })
    await expect(
      guestAxios.patch('api/admin/users/guest_player_1/role', { role: 'ADMIN' }),
    ).resolves.toEqual({ data: null })
    await expect(
      guestAxios.patch('api/admin/whitelist/guest_whitelist_2', { active: true }),
    ).resolves.toEqual({ data: null })
    await expect(guestAxios.delete('api/admin/whitelist/guest_whitelist_2')).resolves.toEqual({
      data: { deleted: false },
    })
  })

  it('seeds no whitelist, and nothing can write one', async () => {
    expect(localStorage.getItem('guest_whitelist')).toBeNull()

    await guestAxios.post('api/admin/whitelist', { email: 'new@demo.local', role: 'ADMIN' })

    expect(localStorage.getItem('guest_whitelist')).toBeNull()
    expect(JSON.parse(localStorage.getItem('guest_user')).role).toBe('USER')
  })
})

// ============================================================================
// Route coverage
// ============================================================================

/** Storage readers — the seeded demo data is the source of truth below. */
const read = (key) => JSON.parse(localStorage.getItem(key))
const campaigns = () => read('guest_campaigns')
const characters = () => read('guest_characters')
const ships = () => read('guest_ships')
const messages = () => read('guest_messages')

/**
 * A campaign the guest neither owns nor plays, for the 403 cases. Appended to
 * the seeds rather than replacing them, so the other routes keep working.
 */
function seedForeignCampaign() {
  const foreign = {
    id: 'guest_campaign_9',
    name: 'Not Yours',
    primarySystem: 'OFFWORLDERS',
    ownerId: 'guest_player_1',
    participants: [{ id: 'guest_player_1', nickname: 'User1', role: 'GM' }],
  }
  localStorage.setItem('guest_campaigns', JSON.stringify([...campaigns(), foreign]))
  return foreign
}

/** Guest session with the demo data seeded. */
function startGuestSession() {
  setActivePinia(createPinia())
  localStorage.clear()
  seedGuestStorage()
  useAuthStore().isGuest = true
}

describe('guest-axios GET routes', () => {
  beforeEach(startGuestSession)

  it('returns the profile for both spellings the app uses', async () => {
    const expected = read('guest_user')

    await expect(guestAxios.get('api/users/me')).resolves.toEqual({ data: expected })
    await expect(guestAxios.get('api/me')).resolves.toEqual({ data: expected })
  })

  it('keeps the profile route matching exactly the same URLs', async () => {
    const expected = read('guest_user')

    // One URL per alternative of the pattern: `users/me`, the `api/me`
    // substring (`api/messages…` satisfies it as well) and a path ending in
    // `/me`. Grouping the alternation must not change a single one of them.
    const profileUrls = [
      'api/users/me',
      'api/me',
      'api/users/5/me',
      'api/users/me/roles',
      'api/messages',
      'api/messages/guest_msg_5',
    ]
    for (const url of profileUrls) {
      await expect(guestAxios.get(url)).resolves.toEqual({ data: expected })
    }

    // The neighbours keep reaching their own handlers.
    const search = await guestAxios.get('api/users/search?query=user1')
    expect(search.data.map((user) => user.id)).toEqual(['guest_player_1'])

    await expect(guestAxios.get('api/characters/me')).resolves.toEqual({
      data: characters().filter((character) => character.ownerId === 'guest_demo'),
    })
    await expect(guestAxios.get('api/campaigns')).resolves.toEqual({ data: campaigns() })
  })

  it('searches the seeded players by username and email', async () => {
    const byUsername = await guestAxios.get('api/users/search?query=user3')
    expect(byUsername.data.map((user) => user.id)).toEqual(['guest_player_3'])

    const byEmail = await guestAxios.get('api/users/search?query=user5@demo.local')
    expect(byEmail.data.map((user) => user.id)).toEqual(['guest_player_5'])

    const none = await guestAxios.get('api/users/search?query=nobody')
    expect(none.data).toEqual([])
  })

  it("lists the demo user's own characters for characters/me", async () => {
    const { data } = await guestAxios.get('api/characters/me')

    expect(data).toEqual(characters().filter((character) => character.ownerId === 'guest_demo'))
  })

  it('returns one character by id, and null for an unknown one', async () => {
    const { data } = await guestAxios.get('api/characters/guest_char_2')
    expect(data.name).toBe('Frodo')

    await expect(guestAxios.get('api/characters/guest_char_404')).resolves.toEqual({ data: null })
  })

  it('shows the private backstory to its owner and a GM, and strips it otherwise', async () => {
    // guest_char_1 belongs to guest_player_1 in campaign 1, where the demo is GM.
    const asGm = await guestAxios.get('api/characters/guest_char_1')
    expect(asGm.data.privateBackstory).toBeTruthy()

    // Campaign 3 is the one campaign where the demo user is a plain player.
    const patchCharacter = (patch) =>
      localStorage.setItem(
        'guest_characters',
        JSON.stringify(
          characters().map((character) =>
            character.id === 'guest_char_1' ? { ...character, ...patch } : character,
          ),
        ),
      )

    patchCharacter({ campaignId: 'guest_campaign_3' })
    const asPlayer = await guestAxios.get('api/characters/guest_char_1')
    expect(asPlayer.data.privateBackstory).toBeUndefined()
    expect(asPlayer.data.backstory).toBe(asGm.data.backstory)

    patchCharacter({ campaignId: 'guest_campaign_3', ownerId: 'guest_demo' })
    const asOwner = await guestAxios.get('api/characters/guest_char_1')
    expect(asOwner.data.privateBackstory).toBeTruthy()
  })

  it('filters by campaign, and lists the detached characters without one', async () => {
    const { data: inCampaign } = await guestAxios.get('api/characters?campaignId=guest_campaign_1')
    expect(inCampaign.map((character) => character.id)).toEqual([
      'guest_char_1',
      'guest_char_2',
      'guest_char_3',
    ])

    const { data: detached } = await guestAxios.get('api/characters/without-campaign')
    expect(detached).toEqual(characters().filter((character) => !character.campaignId))
  })

  it("returns a character's spells, and an empty list for one that has none", async () => {
    const stored = characters().find((character) => character.id === 'guest_char_4')

    const { data } = await guestAxios.get('api/characters/guest_char_4/spells')
    expect(data).toEqual(stored.spells)

    const empty = await guestAxios.get('api/characters/guest_char_2/spells')
    expect(empty.data).toEqual([])
  })

  it('falls back to every character for a characters URL it does not recognise', async () => {
    const { data } = await guestAxios.get('api/characters/export/all')

    expect(data).toEqual(characters())
  })

  it('returns every campaign for the list and for the current-user list', async () => {
    const expected = campaigns()

    await expect(guestAxios.get('api/campaigns')).resolves.toEqual({ data: expected })
    // Guest Demo has a single user, so "mine" is the same list as "all".
    await expect(guestAxios.get('api/campaigns/me')).resolves.toEqual({ data: expected })
  })

  it('returns one campaign by id, and null for an unknown one', async () => {
    const { data } = await guestAxios.get('api/campaigns/guest_campaign_3')
    expect(data.name).toBe('Gears of War')

    await expect(guestAxios.get('api/campaigns/guest_campaign_404')).resolves.toEqual({
      data: null,
    })
  })

  it('returns a ship, and 404s for a campaign that has none', async () => {
    const { data } = await guestAxios.get('api/campaigns/guest_campaign_4/ship')
    expect(data).toEqual(ships()[0])

    await expect(guestAxios.get('api/campaigns/guest_campaign_1/ship')).rejects.toMatchObject({
      response: {
        status: 404,
        data: { message: 'Ship not found for campaign: guest_campaign_1' },
      },
    })
  })

  it('answers every api/messages URL with the profile, the pre-existing prefix quirk', async () => {
    // The profile branch tests `url.includes('api/me')`, which `api/messages`
    // satisfies as well, so the messages branches below are shadowed. Kept
    // deliberately: this refactor must not change a single response.
    const profile = read('guest_user')
    const urls = [
      'api/messages',
      'api/messages/guest_msg_5',
      'api/messages/campaign/guest_campaign_1',
    ]

    for (const url of urls) {
      await expect(guestAxios.get(url)).resolves.toEqual({ data: profile })
    }
  })

  it('answers an unknown URL with null, and nothing at all outside guest mode', async () => {
    await expect(guestAxios.get('api/nope')).resolves.toEqual({ data: null })

    useAuthStore().isGuest = false
    await expect(guestAxios.get('api/campaigns')).resolves.toEqual({ data: null })
  })
})

describe('guest-axios POST routes', () => {
  beforeEach(startGuestSession)

  it('creates a character owned by the demo user, detached from any campaign', async () => {
    const { data } = await guestAxios.post('api/characters', { name: 'Nyr', systemType: null })

    expect(data).toMatchObject({
      name: 'Nyr',
      systemType: null,
      ownerId: 'guest_demo',
      campaignId: null,
    })
    expect(data.id).toMatch(/^guest_/)
    expect(characters().map((character) => character.id)).toContain(data.id)
  })

  it('creates a campaign, and an Offworlders campaign gets its default ship', async () => {
    const { data } = await guestAxios.post('api/campaigns', {
      name: 'Mine',
      primarySystem: 'OFFWORLDERS',
    })

    expect(data).toMatchObject({
      name: 'Mine',
      description: '',
      worldLore: null,
      privateDescription: null,
      imageUrl: '/default-campaign.svg',
      ownerId: 'guest_demo',
      participants: [{ id: 'guest_demo', nickname: 'You (DM)', role: 'GM' }],
    })

    const ship = ships().find((entry) => entry.campaignId === data.id)
    expect(ship).toMatchObject({ hull: 15, hullMax: 15, damage: '1D6', driveFuel: 4, version: 0 })
  })

  it('creates a message as the demo user', async () => {
    const { data } = await guestAxios.post('api/messages', {
      campaignId: 'guest_campaign_1',
      messageBody: 'Hello table',
    })

    expect(data).toMatchObject({ campaignId: 'guest_campaign_1', userId: 'guest_demo' })
    expect(data.messageBody).toBe('Hello table')
  })

  it('returns a placeholder avatar for a character image upload', async () => {
    await expect(guestAxios.post('api/characters/guest_char_6/image', {})).resolves.toEqual({
      data: { avatarUrl: '/defaultCharacter.svg' },
    })
  })

  it('returns a placeholder campaign image for a GM, and refuses a plain player', async () => {
    const { data } = await guestAxios.post('api/campaigns/guest_campaign_1/image', {})
    expect(data.imageUrl).toContain('unsplash.com')

    // Campaign 3 is the one where the demo user is only a player.
    await expect(guestAxios.post('api/campaigns/guest_campaign_3/image', {})).rejects.toMatchObject(
      {
        response: {
          status: 403,
          data: { message: 'You do not have permission to change the campaign image.' },
        },
      },
    )
  })

  it('mocks the ship image upload, and lets it answer the gallery URL too', async () => {
    const { data: profile } = await guestAxios.post('api/campaigns/guest_campaign_4/ship/image', {})
    expect(profile.imageUrl).toContain('unsplash.com')
    expect(profile.version).toBe(1)

    // `/ship/images` contains `/ship/image`, so the profile branch answers first
    // and POST cannot fill the gallery. Pre-existing quirk; kept as it is.
    const { data: gallery } = await guestAxios.post(
      'api/campaigns/guest_campaign_4/ship/images',
      {},
    )
    expect(gallery.imageUrls).toEqual([])
    expect(gallery.imageUrl).toContain('unsplash.com')
    expect(gallery.version).toBe(2)

    // A campaign without a ship has nothing to upload to.
    await expect(guestAxios.post('api/campaigns/guest_campaign_1/ship/image', {})).resolves.toEqual(
      {
        data: null,
      },
    )
  })

  it('appends a gallery image to a character, 404ing for an unknown one', async () => {
    // The crew's ship view reads the campaign's characters, so a crew image is
    // the character's gallery image.
    const before = characters().find((character) => character.id === 'guest_char_8')

    const { data } = await guestAxios.post('api/characters/guest_char_8/images', {})

    expect(data.id).toBe('guest_char_8')
    expect(data.imageUrls).toHaveLength(before.imageUrls.length + 1)
    expect(
      characters().find((character) => character.id === 'guest_char_8').imageUrls,
    ).toHaveLength(before.imageUrls.length + 1)

    await expect(guestAxios.post('api/characters/guest_char_404/images', {})).rejects.toMatchObject(
      {
        response: {
          status: 404,
          data: { message: 'Character not found with id: guest_char_404' },
        },
      },
    )
  })

  it('saves a spell once and returns the stored spell on a repeat', async () => {
    const payload = { key: 'test_spell', name: 'Test Spell' }

    const { data: first } = await guestAxios.post('api/characters/guest_char_6/spells', payload)
    expect(first).toMatchObject({ key: 'test_spell', name: 'Test Spell', isHomebrew: false })

    const { data: again } = await guestAxios.post('api/characters/guest_char_6/spells', payload)
    expect(again).toEqual(first)

    const stored = characters().find((character) => character.id === 'guest_char_6')
    expect(stored.spells.filter((spell) => spell.key === 'test_spell')).toHaveLength(1)

    // An unknown character cannot receive a spell.
    await expect(
      guestAxios.post('api/characters/guest_char_404/spells', { key: 'x' }),
    ).resolves.toEqual({ data: null })
  })

  it('answers an unknown URL with null, and nothing at all outside guest mode', async () => {
    await expect(guestAxios.post('api/nope', {})).resolves.toEqual({ data: null })

    useAuthStore().isGuest = false
    await expect(guestAxios.post('api/campaigns', { name: 'X' })).resolves.toEqual({ data: null })
  })
})

describe('guest-axios PUT routes', () => {
  beforeEach(startGuestSession)

  it('updates a ship, creates a missing one, and 409s on a stale version', async () => {
    const { data: updated } = await guestAxios.put('api/campaigns/guest_campaign_4/ship', {
      name: 'Renamed',
      version: 0,
    })
    expect(updated).toMatchObject({ name: 'Renamed', version: 1 })

    await expect(
      guestAxios.put('api/campaigns/guest_campaign_4/ship', { name: 'Stale', version: 0 }),
    ).rejects.toMatchObject({
      response: {
        status: 409,
        data: { message: 'The ship was updated by someone else. Reload and try again.' },
      },
    })

    // A campaign without a ship gets one on the first save.
    const { data: created } = await guestAxios.put('api/campaigns/guest_campaign_1/ship', {
      name: 'Fresh',
    })
    expect(created).toMatchObject({ name: 'Fresh', campaignId: 'guest_campaign_1', version: 0 })
  })

  it('merges the campaign payload, creating the ship when the system turns Offworlders', async () => {
    const { data } = await guestAxios.put('api/campaigns/guest_campaign_1', { name: 'Renamed' })
    expect(data).toMatchObject({ id: 'guest_campaign_1', name: 'Renamed', primarySystem: 'DND5E' })

    const { data: offworlders } = await guestAxios.put('api/campaigns/guest_campaign_1', {
      primarySystem: 'OFFWORLDERS',
    })
    expect(offworlders.primarySystem).toBe('OFFWORLDERS')
    expect(ships().some((ship) => ship.campaignId === 'guest_campaign_1')).toBe(true)

    await expect(
      guestAxios.put('api/campaigns/guest_campaign_404', { name: 'x' }),
    ).resolves.toEqual({ data: null })
  })

  it('answers an unknown URL with null, and nothing at all outside guest mode', async () => {
    await expect(guestAxios.put('api/nope', {})).resolves.toEqual({ data: null })

    useAuthStore().isGuest = false
    await expect(guestAxios.put('api/campaigns/guest_campaign_1', {})).resolves.toEqual({
      data: null,
    })
  })
})

describe('guest-axios PATCH routes', () => {
  beforeEach(startGuestSession)

  it('updates my own display name, and protects the rest of the profile', async () => {
    const { data } = await guestAxios.patch('api/users/guest_demo', { displayName: 'Nyr' })
    expect(data.displayName).toBe('Nyr')
    expect(read('guest_user').displayName).toBe('Nyr')

    await expect(
      guestAxios.patch('api/users/guest_player_1', { displayName: 'Nope' }),
    ).rejects.toMatchObject({
      response: { status: 403, data: { message: 'You may only update your own profile.' } },
    })

    await expect(
      guestAxios.patch('api/users/guest_demo', { email: 'new@demo.local' }),
    ).rejects.toMatchObject({
      response: { status: 400, data: { message: 'Only the display name can be changed here.' } },
    })
  })

  it('patches a character, and links it to a campaign', async () => {
    const { data } = await guestAxios.patch('api/characters/guest_char_6', { name: 'Strider' })
    expect(data.name).toBe('Strider')

    const { data: linked } = await guestAxios.patch('api/characters/guest_char_6/campaign', {
      campaignId: 'guest_campaign_4',
    })
    expect(linked.campaignId).toBe('guest_campaign_4')
  })

  it('updates campaign details for a GM and refuses a plain player', async () => {
    const { data } = await guestAxios.patch('api/campaigns/guest_campaign_1', { name: 'Renamed' })
    expect(data.name).toBe('Renamed')

    await expect(
      guestAxios.patch('api/campaigns/guest_campaign_3', { name: 'Nope' }),
    ).rejects.toMatchObject({
      response: {
        status: 403,
        data: { message: 'You do not have permission to edit this campaign.' },
      },
    })
  })

  it('lets a participant rename themselves, the owner rename anyone, and refuses a stranger', async () => {
    // Campaign 3 is where the demo user plays as an ordinary participant.
    const { data: self } = await guestAxios.patch(
      'api/campaigns/guest_campaign_3/participants/guest_demo/nickname',
      'Me',
    )
    expect(self.participants.find((participant) => participant.id === 'guest_demo').nickname).toBe(
      'Me',
    )

    // Campaign 1 is owned by the demo user, so anybody's nickname is fair game.
    const { data: other } = await guestAxios.patch(
      'api/campaigns/guest_campaign_1/participants/guest_player_2/nickname',
      'Renamed',
    )
    expect(
      other.participants.find((participant) => participant.id === 'guest_player_2').nickname,
    ).toBe('Renamed')

    seedForeignCampaign()
    await expect(
      guestAxios.patch('api/campaigns/guest_campaign_9/participants/guest_player_1/nickname', 'No'),
    ).rejects.toMatchObject({
      response: {
        status: 403,
        data: { message: 'You do not have permission to change this nickname.' },
      },
    })
  })

  it('reads a literal "null" participant id as the current user', async () => {
    const { data } = await guestAxios.patch(
      'api/campaigns/guest_campaign_3/participants/null/nickname',
      'Still Me',
    )

    expect(data.participants.find((participant) => participant.id === 'guest_demo').nickname).toBe(
      'Still Me',
    )
  })

  it('changes participant roles for the owner, and refuses a stranger', async () => {
    const { data } = await guestAxios.patch(
      'api/campaigns/guest_campaign_1/participants/guest_player_2/role',
      'GM',
    )
    expect(data.participants.find((participant) => participant.id === 'guest_player_2').role).toBe(
      'GM',
    )

    seedForeignCampaign()
    await expect(
      guestAxios.patch('api/campaigns/guest_campaign_9/participants/guest_player_1/role', 'PLAYER'),
    ).rejects.toMatchObject({
      response: {
        status: 403,
        data: { message: 'You do not have permission to change participant roles.' },
      },
    })
  })

  it('adds and removes participants for the owner, and refuses a stranger', async () => {
    const { data: added } = await guestAxios.patch('api/campaigns/guest_campaign_2/participants', {
      participantsToAdd: [{ id: 'guest_player_3' }],
      participantIdsToRemove: [],
    })
    expect(
      added.participants.find((participant) => participant.id === 'guest_player_3'),
    ).toMatchObject({ nickname: 'User3', role: 'PLAYER' })

    const { data: removed } = await guestAxios.patch(
      'api/campaigns/guest_campaign_2/participants',
      {
        participantsToAdd: [],
        participantIdsToRemove: ['guest_player_1'],
      },
    )
    expect(removed.participants.some((participant) => participant.id === 'guest_player_1')).toBe(
      false,
    )

    seedForeignCampaign()
    await expect(
      guestAxios.patch('api/campaigns/guest_campaign_9/participants', { participantsToAdd: [] }),
    ).rejects.toMatchObject({
      response: {
        status: 403,
        data: { message: 'You do not have permission to manage participants.' },
      },
    })
  })

  it('transfers ownership for the owner', async () => {
    const { data } = await guestAxios.patch('api/campaigns/guest_campaign_1/owner', {
      newOwnerId: 'guest_player_1',
    })

    expect(data.ownerId).toBe('guest_player_1')
  })

  it('answers an unknown URL with null, and nothing at all outside guest mode', async () => {
    await expect(guestAxios.patch('api/nope', {})).resolves.toEqual({ data: null })
    await expect(guestAxios.patch('api/characters/guest_char_404', {})).resolves.toEqual({
      data: null,
    })

    useAuthStore().isGuest = false
    await expect(guestAxios.patch('api/users/guest_demo', {})).resolves.toEqual({ data: null })
  })
})

describe('guest-axios DELETE routes', () => {
  beforeEach(startGuestSession)

  it('removes a spell from a character, and reports a miss', async () => {
    await expect(
      guestAxios.delete('api/characters/guest_char_4/spells/deepm_unseen-strangler'),
    ).resolves.toEqual({ data: { success: true } })
    expect(characters().find((character) => character.id === 'guest_char_4').spells).toEqual([])

    await expect(guestAxios.delete('api/characters/guest_char_404/spells/x')).resolves.toEqual({
      data: { success: false },
    })
  })

  it('detaches a character from its campaign, and refuses a stranger', async () => {
    // The demo user owns campaign 1, so another player's character may be detached.
    await expect(guestAxios.delete('api/characters/guest_char_1/campaign')).resolves.toEqual({
      data: { success: true },
    })
    expect(characters().find((character) => character.id === 'guest_char_1').campaignId).toBeNull()

    // A character of somebody else, in a campaign the demo user has no rights in.
    const foreign = seedForeignCampaign()
    const foreignCharacter = {
      id: 'guest_char_99',
      ownerId: 'guest_player_1',
      campaignId: foreign.id,
      name: 'Theirs',
      systemType: 'OFFWORLDERS',
    }
    localStorage.setItem('guest_characters', JSON.stringify([...characters(), foreignCharacter]))

    await expect(guestAxios.delete('api/characters/guest_char_99/campaign')).rejects.toMatchObject({
      response: {
        status: 403,
        data: { message: 'You may not remove this character from its campaign.' },
      },
    })
  })

  it('deletes a character', async () => {
    await expect(guestAxios.delete('api/characters/guest_char_6')).resolves.toEqual({
      data: { deleted: true },
    })
    expect(characters().some((character) => character.id === 'guest_char_6')).toBe(false)
  })

  it('removes a gallery image from a character, then a ship gallery image', async () => {
    // Upload one first, so there is something to remove. Kestrel is seeded with a
    // gallery image of her own, which the removal must leave alone.
    const { data: withUpload } = await guestAxios.post('api/characters/guest_char_8/images', {})
    const added = withUpload.imageUrls.at(-1)

    const { data: afterCharacter } = await guestAxios.delete(
      `api/characters/guest_char_8/images?url=${encodeURIComponent(added)}`,
    )
    expect(afterCharacter.imageUrls).not.toContain(added)
    expect(afterCharacter.imageUrls).toContain('/default-scifi-campaign.svg')

    // The gallery image is seeded directly, because POST cannot add one.
    const galleryUrl = 'https://example.test/gallery.png'
    localStorage.setItem(
      'guest_ships',
      JSON.stringify(ships().map((ship) => ({ ...ship, imageUrls: [galleryUrl] }))),
    )

    const { data: afterShip } = await guestAxios.delete(
      `api/campaigns/guest_campaign_4/ship/images?url=${encodeURIComponent(galleryUrl)}`,
    )
    expect(afterShip.imageUrls).toEqual([])
    expect(ships()[0].imageUrls).toEqual([])
  })

  it('deletes a campaign with its ship and detaches its characters, and refuses a stranger', async () => {
    await expect(guestAxios.delete('api/campaigns/guest_campaign_4')).resolves.toEqual({
      data: { deleted: true },
    })
    expect(campaigns().some((campaign) => campaign.id === 'guest_campaign_4')).toBe(false)
    expect(ships().some((ship) => ship.campaignId === 'guest_campaign_4')).toBe(false)
    expect(characters().filter((character) => character.campaignId === 'guest_campaign_4')).toEqual(
      [],
    )

    seedForeignCampaign()
    await expect(guestAxios.delete('api/campaigns/guest_campaign_9')).rejects.toMatchObject({
      response: {
        status: 403,
        data: { message: 'You do not have permission to delete this campaign.' },
      },
    })
  })

  it('lets only the sender delete a message', async () => {
    await expect(guestAxios.delete('api/messages/guest_msg_3')).resolves.toEqual({
      data: { deleted: true },
    })
    expect(messages().some((message) => message.id === 'guest_msg_3')).toBe(false)

    await expect(guestAxios.delete('api/messages/guest_msg_1')).rejects.toMatchObject({
      response: {
        status: 403,
        data: { message: 'You do not have permission to delete this message.' },
      },
    })
  })

  it('answers deleted:false for an unknown URL, and nothing at all outside guest mode', async () => {
    await expect(guestAxios.delete('api/nope')).resolves.toEqual({ data: { deleted: false } })
    // An id that does not exist is still reported as deleted — the mock trusts
    // the URL, exactly as the branches above do.
    await expect(guestAxios.delete('api/characters/guest_char_404')).resolves.toEqual({
      data: { deleted: true },
    })

    useAuthStore().isGuest = false
    await expect(guestAxios.delete('api/campaigns/guest_campaign_1')).resolves.toEqual({
      data: { deleted: false },
    })
  })
})
