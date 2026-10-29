import { describe, expect, it } from 'vitest'
import {
  answerBadgeClass,
  answerLabel,
  answerOf,
  answerVariant,
  attendanceSummary,
  availabilityLabel,
  availabilityLevel,
  availabilityPercent,
  availabilitySurfaceClass,
  bestDate,
  dateFormOf,
  datePayloadOf,
  emptyDateForm,
  excludedOf,
  formatTimeRange,
  isDateFormDirty,
  rosterOf,
} from '@/features/planner/plannerUtils.js'

/** A roster row as the backend sends one. */
const member = (userId, excluded = false, removedByOwner = false) => ({
  userId,
  nickname: `User${userId}`,
  role: 'PLAYER',
  excluded,
  removedByOwner,
})

/** A candidate date with the answers given as `{ userId: STATE }`. */
const date = (id, answers, day = '2026-03-14') => ({
  id,
  date: day,
  startTime: null,
  endTime: null,
  note: null,
  createdByUserId: 1,
  version: 0,
  attendances: Object.entries(answers).map(([userId, state]) => ({
    userId: Number(userId),
    state,
  })),
})

const FOUR = [member(1), member(2), member(3), member(4)]

describe('planner availability maths', () => {
  it('counts the roster, the answers, and what nobody answered', () => {
    const summary = attendanceSummary(date(1, { 1: 'YES', 2: 'NO', 3: 'MAYBE' }), FOUR)

    expect(summary).toMatchObject({ yes: 1, no: 1, maybe: 1, unanswered: 1, rosterSize: 4 })
    expect(summary.percent).toBeCloseTo(0.25)
  })

  it('counts an unanswered member against the date — silence is not consent', () => {
    const oneOfFour = attendanceSummary(date(1, { 1: 'YES' }), FOUR)
    const allFour = attendanceSummary(date(2, { 1: 'YES', 2: 'YES', 3: 'YES', 4: 'YES' }), FOUR)

    expect(availabilityLevel(oneOfFour)).toBe('low')
    expect(availabilityLevel(allFour)).toBe('full')
  })

  it('turns the four bands into the documented surfaces', () => {
    const cases = [
      {
        answers: { 1: 'YES', 2: 'YES', 3: 'YES', 4: 'YES' },
        level: 'full',
        className: 'availability-surface-full',
      },
      {
        answers: { 1: 'YES', 2: 'YES', 3: 'YES', 4: 'NO' },
        level: 'high',
        className: 'availability-surface-high',
      },
      {
        answers: { 1: 'YES', 2: 'YES', 3: 'NO', 4: 'NO' },
        level: 'medium',
        className: 'availability-surface-medium',
      },
      {
        answers: { 1: 'YES', 2: 'NO', 3: 'NO', 4: 'NO' },
        level: 'low',
        className: 'availability-surface-low',
      },
    ]

    cases.forEach(({ answers, level, className }) => {
      const summary = attendanceSummary(date(1, answers), FOUR)
      expect(availabilityLevel(summary)).toBe(level)
      expect(availabilitySurfaceClass(availabilityLevel(summary))).toBe(className)
    })
  })

  it('never counts a maybe as a yes: three in four with one maybe is not green', () => {
    const summary = attendanceSummary(date(1, { 1: 'YES', 2: 'YES', 3: 'MAYBE', 4: 'NO' }), FOUR)

    expect(summary.yes).toBe(2)
    expect(availabilityLevel(summary)).toBe('medium')
  })

  it('takes a member who left out of the roster AND out of the counts', () => {
    const withOneOut = [...FOUR.filter((row) => row.userId !== 4), member(4, true)]
    const plan = {
      members: withOneOut,
      dates: [date(1, { 1: 'YES', 2: 'YES', 3: 'YES', 4: 'YES' })],
    }

    expect(rosterOf(plan)).toHaveLength(3)
    expect(excludedOf(plan)).toHaveLength(1)
    // Three of three said yes, and the member who left is no longer asked.
    expect(availabilityLevel(attendanceSummary(plan.dates[0], rosterOf(plan)))).toBe('full')
  })

  it('is red when nobody is left in the plan at all', () => {
    const summary = attendanceSummary(date(1, {}), [])

    expect(summary.rosterSize).toBe(0)
    expect(availabilityLevel(summary)).toBe('low')
  })

  it('reads an answer back, and reports none for a member who has not given one', () => {
    const candidate = date(1, { 1: 'YES' })

    expect(answerOf(candidate, 1)).toBe('YES')
    expect(answerOf(candidate, 2)).toBeNull()
    expect(answerOf(null, 1)).toBeNull()
  })

  it('picks the best-attended date for a plan marker', () => {
    const plan = {
      members: FOUR,
      dates: [date(1, { 1: 'YES' }, '2026-03-14'), date(2, { 1: 'YES', 2: 'YES' }, '2026-03-21')],
    }

    expect(bestDate(plan).id).toBe(2)
    expect(bestDate({ members: FOUR, dates: [] })).toBeNull()
  })
})

describe('planner presentation helpers', () => {
  it('names the level so the marker is never colour-only', () => {
    expect(availabilityLabel('full')).toBe('Everyone can')
    expect(availabilityLabel('nonsense')).toBe('Few can')
  })

  it('shows the percentage rounded, with the counts', () => {
    expect(availabilityPercent({ percent: 0.666 })).toBe('67%')
  })

  it('picks the answer button variant', () => {
    expect(answerVariant('YES', 'YES')).toBe('answer-selected')
    expect(answerVariant('YES', 'NO')).toBe('answer')
    expect(answerVariant('YES', null)).toBe('answer')
  })

  it('picks the roll-call badge and label for an answer', () => {
    expect(answerBadgeClass('YES')).toBe('badge-primary')
    expect(answerBadgeClass('NO')).toBe('badge-danger')
    expect(answerBadgeClass(null)).toBe('badge-muted')
    expect(answerLabel('MAYBE')).toBe('Maybe')
    expect(answerLabel(null)).toBe('No answer')
  })

  it('picks the surface the element wears for a level', () => {
    expect(availabilitySurfaceClass('full')).toBe('availability-surface-full')
    expect(availabilitySurfaceClass('low')).toBe('availability-surface-low')
  })

  it('formats an optional time window, and nothing when there is none', () => {
    expect(formatTimeRange({ startTime: '18:00:00', endTime: '22:30:00' })).toBe('18:00–22:30')
    expect(formatTimeRange({ startTime: '18:00:00', endTime: null })).toBe('18:00')
    expect(formatTimeRange({})).toBe('')
  })
})

describe('planner date drafts', () => {
  it('starts empty, and fills from a date the way a time input wants it', () => {
    expect(emptyDateForm()).toEqual({ date: '', startTime: '', endTime: '', note: '' })

    expect(
      dateFormOf({
        date: '2026-03-14',
        startTime: '18:00:00',
        endTime: '22:30:00',
        note: 'Bring dice',
      }),
    ).toEqual({
      date: '2026-03-14',
      startTime: '18:00',
      endTime: '22:30',
      note: 'Bring dice',
    })

    // A day with no window and no note is a perfectly ordinary date.
    expect(dateFormOf({ date: '2026-03-14' })).toEqual({
      date: '2026-03-14',
      startTime: '',
      endTime: '',
      note: '',
    })
  })

  it('sends cleared fields as null, so the server clears them too', () => {
    expect(datePayloadOf({ date: '2026-03-14', startTime: '', endTime: '', note: '' })).toEqual({
      date: '2026-03-14',
      startTime: null,
      endTime: null,
      note: null,
    })
  })

  it('knows when there is something to lose, and when saving would change nothing', () => {
    const stored = { date: '2026-03-14', startTime: '18:00:00', endTime: null, note: 'Bring dice' }
    const untouched = dateFormOf(stored)

    expect(isDateFormDirty(untouched, stored)).toBe(false)
    expect(isDateFormDirty({ ...untouched, note: 'Bring dice and snacks' }, stored)).toBe(true)
    expect(isDateFormDirty({ ...untouched, startTime: '' }, stored)).toBe(true)
    expect(isDateFormDirty({ ...untouched, date: '2026-03-21' }, stored)).toBe(true)

    // Nothing open means nothing pending.
    expect(isDateFormDirty({ date: '' }, null)).toBe(false)
  })
})
