import { describe, it, expect, afterEach, vi } from 'vitest'

/**
 * The module reads localStorage at import time, so every case that seeds storage
 * before it loads needs a fresh module instance (same approach as
 * `viewHistory.test.js`).
 */
async function loadSectionSeen() {
  vi.resetModules()
  return import('@/utils/sectionSeen.js')
}

const PLAYER = 3
const GM = 4
const CAMPAIGN = 7

/** What the module itself persisted, read back straight from localStorage. */
function storedSeen() {
  return JSON.parse(localStorage.getItem('section_seen'))
}

describe('sectionSeen', () => {
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('records a marker per user, campaign and section, and reads it back', async () => {
    const { markSectionSeen, seenMarkers } = await loadSectionSeen()

    markSectionSeen(PLAYER, CAMPAIGN, 'messages', '2026-10-29T10:00:00Z')

    expect(seenMarkers(PLAYER, CAMPAIGN)).toEqual({ messages: '2026-10-29T10:00:00Z' })
    // Nobody else's, and no other campaign's.
    expect(seenMarkers(GM, CAMPAIGN)).toEqual({})
    expect(seenMarkers(PLAYER, 8)).toEqual({})
  })

  it('keeps the sections of one campaign apart', async () => {
    const { markSectionSeen, seenMarkers } = await loadSectionSeen()

    markSectionSeen(PLAYER, CAMPAIGN, 'messages', '2026-10-29T10:00:00Z')
    markSectionSeen(PLAYER, CAMPAIGN, 'lore', '2026-10-28T09:00:00Z')
    markSectionSeen(PLAYER, CAMPAIGN, 'ship', '2')

    expect(seenMarkers(PLAYER, CAMPAIGN)).toEqual({
      messages: '2026-10-29T10:00:00Z',
      lore: '2026-10-28T09:00:00Z',
      ship: '2',
    })
  })

  it('replaces a marker when the same section is marked again', async () => {
    const { markSectionSeen, seenMarkers } = await loadSectionSeen()

    markSectionSeen(PLAYER, CAMPAIGN, 'messages', '2026-10-29T10:00:00Z')
    markSectionSeen(PLAYER, CAMPAIGN, 'messages', '2026-10-30T10:00:00Z')

    expect(seenMarkers(PLAYER, CAMPAIGN)).toEqual({ messages: '2026-10-30T10:00:00Z' })
  })

  it('stores markers as strings, so a numeric marker round-trips', async () => {
    const { markSectionSeen, sectionSeen } = await loadSectionSeen()

    markSectionSeen(PLAYER, CAMPAIGN, 'ship', 12)

    expect(sectionSeen.value[String(PLAYER)][String(CAMPAIGN)].seen.ship).toBe('12')
  })

  it('keys ids as strings, so guest-mode ids and real ids keep apart', async () => {
    const { markSectionSeen, seenMarkers } = await loadSectionSeen()

    markSectionSeen('guest_demo', 'guest_campaign_1', 'messages', 'stamp')

    expect(seenMarkers('guest_demo', 'guest_campaign_1')).toEqual({ messages: 'stamp' })
    expect(seenMarkers('guest_demo', 'guest_campaign_2')).toEqual({})
    expect(seenMarkers('4', 'guest_campaign_1')).toEqual({})
  })

  it('does nothing without a user, a campaign, a section or a marker', async () => {
    const { markSectionSeen, sectionSeen } = await loadSectionSeen()

    markSectionSeen(null, CAMPAIGN, 'messages', 'stamp')
    markSectionSeen(PLAYER, null, 'messages', 'stamp')
    markSectionSeen(PLAYER, CAMPAIGN, '', 'stamp')
    markSectionSeen(PLAYER, CAMPAIGN, 'messages', null)
    markSectionSeen(PLAYER, CAMPAIGN, 'messages', undefined)
    markSectionSeen(PLAYER, CAMPAIGN, 'messages', '')

    expect(sectionSeen.value).toEqual({})
    expect(storedSeen()).toBeNull()
  })

  it('reads an empty map for a user or campaign it has never seen', async () => {
    const { seenMarkers } = await loadSectionSeen()

    expect(seenMarkers(null, CAMPAIGN)).toEqual({})
    expect(seenMarkers(PLAYER, undefined)).toEqual({})
    expect(seenMarkers(PLAYER, CAMPAIGN)).toEqual({})
  })

  it('survives a malformed stored value', async () => {
    localStorage.setItem('section_seen', '{not json')
    const { sectionSeen, seenMarkers } = await loadSectionSeen()

    expect(sectionSeen.value).toEqual({})
    expect(seenMarkers(PLAYER, CAMPAIGN)).toEqual({})
  })

  it('survives a stored value that is not an object', async () => {
    localStorage.setItem('section_seen', '"nope"')
    const { sectionSeen } = await loadSectionSeen()

    expect(sectionSeen.value).toEqual({})
  })

  it('prunes to the 100 most recently marked campaigns', async () => {
    vi.useFakeTimers()
    const { markSectionSeen, seenMarkers, sectionSeen } = await loadSectionSeen()

    for (let i = 1; i <= 105; i += 1) {
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, i))
      markSectionSeen(PLAYER, i, 'messages', 'stamp')
    }

    expect(Object.keys(sectionSeen.value[String(PLAYER)])).toHaveLength(100)
    // The five oldest are gone; the newest one is kept.
    expect(seenMarkers(PLAYER, 5)).toEqual({})
    expect(seenMarkers(PLAYER, 6)).toEqual({ messages: 'stamp' })
    expect(seenMarkers(PLAYER, 105)).toEqual({ messages: 'stamp' })
  })

  it('reads back what a previous session stored', async () => {
    localStorage.setItem(
      'section_seen',
      JSON.stringify({ [PLAYER]: { [CAMPAIGN]: { at: 1, seen: { messages: 'stamp' } } } }),
    )
    const { seenMarkers } = await loadSectionSeen()

    expect(seenMarkers(PLAYER, CAMPAIGN)).toEqual({ messages: 'stamp' })
  })

  it('forgets one user and leaves the others alone', async () => {
    const { markSectionSeen, clearSectionSeen, seenMarkers, sectionSeen } = await loadSectionSeen()

    markSectionSeen(PLAYER, CAMPAIGN, 'messages', 'stamp')
    markSectionSeen(GM, CAMPAIGN, 'messages', 'stamp')
    clearSectionSeen(PLAYER)

    expect(seenMarkers(PLAYER, CAMPAIGN)).toEqual({})
    expect(seenMarkers(GM, CAMPAIGN)).toEqual({ messages: 'stamp' })
    expect(Object.keys(sectionSeen.value)).toEqual([String(GM)])
  })

  it('removes the storage key once the last user is forgotten', async () => {
    const { markSectionSeen, clearSectionSeen } = await loadSectionSeen()

    markSectionSeen(PLAYER, CAMPAIGN, 'messages', 'stamp')
    clearSectionSeen(PLAYER)

    expect(storedSeen()).toBeNull()
    expect(localStorage.getItem('section_seen')).toBeNull()
  })

  it('forgets everybody when called without a user', async () => {
    const { markSectionSeen, clearSectionSeen, sectionSeen } = await loadSectionSeen()

    markSectionSeen(PLAYER, CAMPAIGN, 'messages', 'stamp')
    markSectionSeen(GM, 9, 'lore', 'stamp')
    clearSectionSeen()

    expect(sectionSeen.value).toEqual({})
    expect(localStorage.getItem('section_seen')).toBeNull()
  })
})
