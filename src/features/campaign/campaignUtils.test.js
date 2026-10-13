import { describe, it, expect } from 'vitest'
import { formatParticipantRoster } from './campaignUtils.js'

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
