import { describe, it, expect } from 'vitest'
import { formatParticipantRoster } from './campaignUtils.js'

describe('formatParticipantRoster', () => {
  const characters = [
    { id: 10, name: 'Character1', ownerId: 1 },
    { id: 11, name: 'character2', ownerId: 2 },
    { id: 12, name: 'character3', ownerId: 3 },
    { id: 13, name: 'Character4', ownerId: 3 },
  ]

  it('lists each participant with their role and characters', () => {
    const participants = [
      { id: 1, nickname: 'Mats', role: 'GM' },
      { id: 2, nickname: 'Player 2', role: 'PLAYER' },
      { id: 3, nickname: 'player 3', role: 'PLAYER' },
    ]

    expect(formatParticipantRoster(participants, characters)).toEqual([
      { id: 1, label: 'Mats · GM · Character1' },
      { id: 2, label: 'Player 2 · PLAYER · character2' },
      { id: 3, label: 'player 3 · PLAYER · character3 · Character4' },
    ])
  })

  it('still lists a participant who owns no character', () => {
    const participants = [{ id: 9, nickname: 'Solo', role: 'PLAYER' }]

    expect(formatParticipantRoster(participants, characters)).toEqual([
      { id: 9, label: 'Solo · PLAYER' },
    ])
  })

  it('only includes the characters owned by each participant', () => {
    const participants = [{ id: 1, nickname: 'Mats', role: 'GM' }]

    expect(formatParticipantRoster(participants, characters)).toEqual([
      { id: 1, label: 'Mats · GM · Character1' },
    ])
  })

  it('matches owner and participant ids across string/number types', () => {
    const participants = [{ id: '1', nickname: 'Mats', role: 'GM' }]

    expect(formatParticipantRoster(participants, characters)).toEqual([
      { id: '1', label: 'Mats · GM · Character1' },
    ])
  })

  it('falls back to placeholders for a missing name/role', () => {
    const participants = [{ id: 1 }]
    const unnamed = [{ id: 10, ownerId: 1 }]

    expect(formatParticipantRoster(participants, unnamed)).toEqual([
      { id: 1, label: 'Unknown · PLAYER · Unnamed Character' },
    ])
  })

  it('returns an empty roster when the campaign has no participants', () => {
    expect(formatParticipantRoster()).toEqual([])
  })
})
