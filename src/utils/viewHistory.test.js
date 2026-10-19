import { describe, it, expect, afterEach, vi } from 'vitest'

/**
 * The module reads localStorage at import time, so every case that seeds
 * storage before it loads needs a fresh module instance (same approach as
 * `environment.test.js`).
 */
async function loadViewHistory() {
  vi.resetModules()
  return import('@/utils/viewHistory.js')
}

const STUDENT = 3
const GM = 4

/** What the module itself persisted, read back straight from localStorage. */
function storedHistory() {
  return JSON.parse(localStorage.getItem('view_history'))
}

describe('viewHistory', () => {
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('records a view per user, and reads it back', async () => {
    const { recordView, viewedAt, viewedAtByUser } = await loadViewHistory()

    recordView('campaign', 7, STUDENT)

    expect(viewedAt('campaign', 7, STUDENT)).toBeGreaterThan(0)
    expect(viewedAtByUser('campaign', STUDENT)).toEqual({ 7: expect.any(Number) })
    // The same record for somebody else is still unviewed.
    expect(viewedAt('campaign', 7, GM)).toBe(0)
    expect(viewedAtByUser('campaign', GM)).toEqual({})
  })

  it('isolates the two kinds from each other', async () => {
    const { recordView, viewedAt } = await loadViewHistory()

    recordView('character', 7, STUDENT)

    expect(viewedAt('character', 7, STUDENT)).toBeGreaterThan(0)
    expect(viewedAt('campaign', 7, STUDENT)).toBe(0)
  })

  it('keys ids and users as strings, so 4 and "4" are the same record', async () => {
    const { recordView, viewedAt, viewedAtByUser, viewHistory } = await loadViewHistory()

    recordView('campaign', 4, 4)

    expect(viewedAt('campaign', '4', '4')).toBeGreaterThan(0)
    expect(Object.keys(viewHistory.value)).toEqual(['4'])
    expect(Object.keys(viewedAtByUser('campaign', 4))).toEqual(['4'])
  })

  it('keeps the newest timestamp when a record is viewed twice', async () => {
    vi.useFakeTimers()
    const { recordView, viewedAt } = await loadViewHistory()

    vi.setSystemTime(new Date('2024-01-01T10:00:00Z'))
    recordView('campaign', 1, STUDENT)
    vi.setSystemTime(new Date('2024-01-01T11:00:00Z'))
    recordView('campaign', 1, STUDENT)

    expect(viewedAt('campaign', 1, STUDENT)).toBe(new Date('2024-01-01T11:00:00Z').getTime())
  })

  it('does nothing without an id or a viewer, since the profile loads late', async () => {
    const { recordView, viewHistory } = await loadViewHistory()

    recordView('campaign', null, STUDENT)
    recordView('campaign', undefined, STUDENT)
    recordView('campaign', 1, null)

    expect(viewHistory.value).toEqual({})
    expect(storedHistory()).toBeNull()
  })

  it('survives a malformed stored value', async () => {
    localStorage.setItem('view_history', '{not json')
    const { viewHistory, viewedAtByUser } = await loadViewHistory()

    expect(viewHistory.value).toEqual({})
    expect(viewedAtByUser('campaign', STUDENT)).toEqual({})
  })

  it('survives a stored value that is not an object', async () => {
    localStorage.setItem('view_history', '"nope"')
    const { viewHistory } = await loadViewHistory()

    expect(viewHistory.value).toEqual({})
  })

  it('prunes to the 100 most recent entries per kind', async () => {
    vi.useFakeTimers()
    const { recordView, viewedAt, viewedAtByUser } = await loadViewHistory()

    for (let i = 1; i <= 105; i += 1) {
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, i))
      recordView('campaign', i, STUDENT)
    }

    const entries = viewedAtByUser('campaign', STUDENT)
    expect(Object.keys(entries)).toHaveLength(100)
    // The five oldest are gone, the newest one is kept.
    expect(viewedAt('campaign', 5, STUDENT)).toBe(0)
    expect(viewedAt('campaign', 6, STUDENT)).toBeGreaterThan(0)
    expect(viewedAt('campaign', 105, STUDENT)).toBeGreaterThan(0)
  })

  it('reads back what a previous session stored', async () => {
    localStorage.setItem('view_history', JSON.stringify({ [STUDENT]: { campaign: { 9: 1234 } } }))
    const { viewedAt, viewHistory } = await loadViewHistory()

    expect(viewedAt('campaign', 9, STUDENT)).toBe(1234)
    expect(viewHistory.value).toEqual({ [STUDENT]: { campaign: { 9: 1234 } } })
  })

  it('forgets one user and leaves the others alone', async () => {
    const { recordView, clearViewHistory, viewedAt, viewHistory } = await loadViewHistory()

    recordView('campaign', 1, STUDENT)
    recordView('campaign', 2, GM)
    clearViewHistory(STUDENT)

    expect(viewedAt('campaign', 1, STUDENT)).toBe(0)
    expect(viewedAt('campaign', 2, GM)).toBeGreaterThan(0)
    expect(Object.keys(viewHistory.value)).toEqual([String(GM)])
  })

  it('removes the storage key once the last user is forgotten', async () => {
    const { recordView, clearViewHistory } = await loadViewHistory()

    recordView('campaign', 1, STUDENT)
    clearViewHistory(STUDENT)

    expect(storedHistory()).toBeNull()
    expect(localStorage.getItem('view_history')).toBeNull()
  })

  it('forgets everybody when called without a user', async () => {
    const { recordView, clearViewHistory, viewHistory } = await loadViewHistory()

    recordView('campaign', 1, STUDENT)
    recordView('character', 2, GM)
    clearViewHistory()

    expect(viewHistory.value).toEqual({})
    expect(localStorage.getItem('view_history')).toBeNull()
  })
})
