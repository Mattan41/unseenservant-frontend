import { describe, it, expect } from 'vitest'
import { parseUtcTimestamp, formatUtcDate, formatUtcDateTime } from '@/utils/timestampUtils.js'

describe('parseUtcTimestamp', () => {
  it('reads a zone-less backend value as UTC, not as local time', () => {
    // toISOString is zone-independent, so this holds wherever the suite runs:
    // `new Date('2026-05-29T09:00:00')` alone would give 07:00Z in CEST.
    expect(parseUtcTimestamp('2026-05-29T09:00:00').toISOString()).toBe('2026-05-29T09:00:00.000Z')
  })

  it('leaves a value that already carries a zone alone', () => {
    expect(parseUtcTimestamp('2026-05-29T09:00:00Z').toISOString()).toBe('2026-05-29T09:00:00.000Z')
    expect(parseUtcTimestamp('2026-05-29T11:00:00+02:00').toISOString()).toBe(
      '2026-05-29T09:00:00.000Z',
    )
  })

  it('accepts the shorter and fractional-second forms the backend may send', () => {
    expect(parseUtcTimestamp('2026-05-29T09:00').toISOString()).toBe('2026-05-29T09:00:00.000Z')
    expect(parseUtcTimestamp('2026-05-29T09:00:00.123').toISOString()).toBe(
      '2026-05-29T09:00:00.123Z',
    )
  })

  it('returns null for a missing or unparseable value', () => {
    expect(parseUtcTimestamp(null)).toBeNull()
    expect(parseUtcTimestamp(undefined)).toBeNull()
    expect(parseUtcTimestamp('')).toBeNull()
    expect(parseUtcTimestamp('   ')).toBeNull()
    expect(parseUtcTimestamp('not a date')).toBeNull()
    expect(parseUtcTimestamp(new Date('nonsense'))).toBeNull()
  })

  it('passes a usable Date through', () => {
    const date = new Date('2026-05-29T09:00:00Z')

    expect(parseUtcTimestamp(date)).toBe(date)
  })
})

describe('formatUtcDate / formatUtcDateTime', () => {
  it('renders in the reader zone', () => {
    const local = new Date('2026-05-29T09:00:00Z')

    expect(formatUtcDate('2026-05-29T09:00:00')).toBe(local.toLocaleDateString())
    expect(formatUtcDateTime('2026-05-29T09:00:00')).toBe(local.toLocaleString())
  })

  it('returns an empty string when there is nothing to show', () => {
    expect(formatUtcDate(null)).toBe('')
    expect(formatUtcDateTime(undefined)).toBe('')
    expect(formatUtcDate('not a date')).toBe('')
  })
})
