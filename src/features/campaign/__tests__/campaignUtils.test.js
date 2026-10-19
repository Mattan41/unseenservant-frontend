import { describe, it, expect } from 'vitest'
import { formatParticipantRoster, sortPartyCharacters } from '@/features/campaign/campaignUtils.js'

describe('formatParticipantRoster', () => {
  it('lists each participant with their role', () => {
    const participants = [
      { id: 1, nickname: 'Mats', role: 'GM' },
      { id: 2, nickname: 'Player 2', role: 'PLAYER' },
      { id: 3, nickname: 'player 3', role: 'PLAYER' },
    ]

    expect(formatParticipantRoster(participants)).toEqual([
      { id: 1, label: 'Mats · GM' },
      { id: 2, label: 'Player 2 · PLAYER' },
      { id: 3, label: 'player 3 · PLAYER' },
    ])
  })

  it("does not append the participants' characters", () => {
    // Regression: the Campaign Summary roster used to list character names too.
    const participants = [{ id: 1, nickname: 'Mats', role: 'GM' }]

    expect(formatParticipantRoster(participants)).toEqual([{ id: 1, label: 'Mats · GM' }])
  })

  it('keeps the participant id as-is (string or number)', () => {
    const participants = [{ id: '1', nickname: 'Mats', role: 'GM' }]

    expect(formatParticipantRoster(participants)).toEqual([{ id: '1', label: 'Mats · GM' }])
  })

  it('falls back to placeholders for a missing name/role', () => {
    const participants = [{ id: 1 }]

    expect(formatParticipantRoster(participants)).toEqual([{ id: 1, label: 'Unknown · PLAYER' }])
  })

  it('returns an empty roster when the campaign has no participants', () => {
    expect(formatParticipantRoster()).toEqual([])
  })
})

describe('sortPartyCharacters', () => {
  // Owner is a player, one participant is the GM — the shape both the backend
  // and guest mode produce.
  const campaign = {
    ownerId: 10,
    participants: [
      { id: 10, nickname: 'Owner', role: 'PLAYER' },
      { id: 11, nickname: 'Gm', role: 'GM' },
      { id: 12, nickname: 'Player', role: 'PLAYER' },
    ],
  }

  const characters = [
    { id: 1, name: 'Zara', ownerId: 12 },
    { id: 2, name: 'Ada', ownerId: 11 },
    { id: 3, name: 'Bilbo', ownerId: 10 },
    { id: 4, name: 'Mira', ownerId: 12 },
  ]

  const names = (sorted) => sorted.map((character) => character.name)

  it("puts the viewer's own characters first, then a GM's, then the rest alphabetically", () => {
    expect(names(sortPartyCharacters(characters, campaign, 10))).toEqual([
      'Bilbo',
      'Ada',
      'Mira',
      'Zara',
    ])
  })

  it('keeps the viewer first even when the viewer is the GM', () => {
    expect(names(sortPartyCharacters(characters, campaign, 11))).toEqual([
      'Ada',
      'Bilbo',
      'Mira',
      'Zara',
    ])
  })

  it('orders the last group alphabetically, not by owner', () => {
    // Two owners in neither the own nor the GM group.
    const party = [
      { id: 1, name: 'Yara', ownerId: 12 },
      { id: 2, name: 'Bo', ownerId: 13 },
      { id: 3, name: 'Ari', ownerId: 12 },
    ]

    expect(names(sortPartyCharacters(party, campaign, 99))).toEqual(['Ari', 'Bo', 'Yara'])
  })

  it('falls back to the last group when the owner is not a participant', () => {
    const party = [
      { id: 1, name: 'Ghost', ownerId: 404 },
      { id: 2, name: 'Ada', ownerId: 11 },
    ]

    expect(names(sortPartyCharacters(party, campaign, 10))).toEqual(['Ada', 'Ghost'])
  })

  it('sorts guest-mode characters against string ids', () => {
    const guestCampaign = {
      ownerId: 'guest_demo',
      participants: [
        { id: 'guest_demo', nickname: 'You', role: 'GM' },
        { id: 'guest_player_1', nickname: 'User1', role: 'PLAYER' },
      ],
    }
    const party = [
      { id: 'guest_char_1', name: 'Kestrel', ownerId: 'guest_player_1' },
      { id: 'guest_char_2', name: 'Vex', ownerId: 'guest_demo' },
    ]

    expect(names(sortPartyCharacters(party, guestCampaign, 'guest_demo'))).toEqual([
      'Vex',
      'Kestrel',
    ])
    expect(names(sortPartyCharacters(party, guestCampaign, 'guest_player_1'))).toEqual([
      'Kestrel',
      'Vex',
    ])
  })

  it('compares names case-insensitively and keeps equal names in input order', () => {
    const party = [
      { id: 1, name: 'doc', ownerId: 12 },
      { id: 2, name: 'Doc', ownerId: 13 },
      { id: 3, name: 'Ada', ownerId: 14 },
    ]

    expect(names(sortPartyCharacters(party, campaign, 99))).toEqual(['Ada', 'doc', 'Doc'])
  })

  it('handles characters without a name', () => {
    // `name` is required by the API; a nameless character simply sorts as an
    // empty string.
    const party = [
      { id: 1, ownerId: 12 },
      { id: 2, name: 'Ada', ownerId: 13 },
    ]

    expect(names(sortPartyCharacters(party, campaign, 99))).toEqual([undefined, 'Ada'])
  })

  it('leaves the input array untouched', () => {
    const input = [...characters]

    sortPartyCharacters(input, campaign, 10)

    expect(names(input)).toEqual(['Zara', 'Ada', 'Bilbo', 'Mira'])
  })

  it('returns an empty list for a campaign with no characters', () => {
    expect(sortPartyCharacters([], campaign, 10)).toEqual([])
    expect(sortPartyCharacters()).toEqual([])
  })

  it('sorts alphabetically when there is no campaign to read roles from', () => {
    expect(names(sortPartyCharacters(characters, null, null))).toEqual([
      'Ada',
      'Bilbo',
      'Mira',
      'Zara',
    ])
  })
})
