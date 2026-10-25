/**
 * The planner's maths and the colour that follows from it.
 *
 * One rule decides everything here: a candidate date's percentage is *yes answers
 * divided by the roster size*, where the roster is the campaign's participants
 * minus those who left the plan. A member who has not answered yet therefore counts
 * against a date, which is what makes green mean "everybody still in can attend" —
 * silence is not consent. `MAYBE` is shown in the roster and never counted as a yes.
 *
 * Pure functions: no Vue, no stores, no UI. Components ask here for a level or a
 * class name instead of deciding a colour themselves, exactly as
 * `spellUtils.js:getSchoolBadgeClass` does for spell schools.
 */
import {
  ATTENDANCE_STATES,
  AVAILABILITY_LEVELS,
  AVAILABILITY_THRESHOLDS,
} from '@/features/planner/plannerConstants.js'

/**
 * The members who count: everybody the plan has, minus those who are out of it.
 * @param {object|null} plan - PlannerPlanDTO
 * @returns {Array<object>} PlannerMemberDTO rows
 */
export function rosterOf(plan) {
  return (plan?.members || []).filter((member) => !member.excluded)
}

/** The members who left or were removed, for the "not in this plan" note. */
export function excludedOf(plan) {
  return (plan?.members || []).filter((member) => member.excluded)
}

/**
 * One member's answer to one date, or `null` when they have not answered.
 * @param {object|null} date - PlannerDateDTO
 * @param {number|string} userId
 * @returns {'YES'|'NO'|'MAYBE'|null}
 */
export function answerOf(date, userId) {
  const entry = (date?.attendances || []).find(
    (attendance) => String(attendance.userId) === String(userId),
  )
  return entry ? entry.state : null
}

/**
 * How many of the roster said yes to one date, and how many did not answer.
 *
 * `rosterSize` is the denominator, `unanswered` is what is described above: the
 * members who said nothing, which is why a date with one yes out of six is not
 * green.
 *
 * @param {object|null} date - PlannerDateDTO
 * @param {Array<object>} roster - from {@link rosterOf}
 * @returns {{ yes: number, no: number, maybe: number, unanswered: number, rosterSize: number, percent: number }}
 */
export function attendanceSummary(date, roster) {
  const counts = { yes: 0, no: 0, maybe: 0 }

  roster.forEach((member) => {
    const answer = answerOf(date, member.userId)
    if (answer === ATTENDANCE_STATES.YES) counts.yes += 1
    else if (answer === ATTENDANCE_STATES.NO) counts.no += 1
    else if (answer === ATTENDANCE_STATES.MAYBE) counts.maybe += 1
  })

  const rosterSize = roster.length

  return {
    ...counts,
    unanswered: rosterSize - counts.yes - counts.no - counts.maybe,
    rosterSize,
    percent: rosterSize === 0 ? 0 : counts.yes / rosterSize,
  }
}

/**
 * The colour level for a summary: green only when everybody in the plan can come,
 * then the orange / yellow / red bands below it.
 *
 * @param {{ rosterSize: number, yes: number }} summary - from {@link attendanceSummary}
 * @returns {'full'|'high'|'medium'|'low'}
 */
export function availabilityLevel(summary) {
  if (summary.rosterSize === 0) return AVAILABILITY_LEVELS.LOW
  if (summary.yes >= summary.rosterSize) return AVAILABILITY_LEVELS.FULL
  if (summary.yes >= summary.rosterSize * AVAILABILITY_THRESHOLDS.HIGH) return AVAILABILITY_LEVELS.HIGH
  if (summary.yes >= summary.rosterSize * AVAILABILITY_THRESHOLDS.MEDIUM) return AVAILABILITY_LEVELS.MEDIUM
  return AVAILABILITY_LEVELS.LOW
}

/** The semantic class a level paints an element with (`.availability-surface-*`). */
export function availabilitySurfaceClass(level) {
  return `availability-surface-${level}`
}

/**
 * Short text for a level, so the marker never relies on colour alone.
 */
export function availabilityLabel(level) {
  const labels = {
    [AVAILABILITY_LEVELS.FULL]: 'Everyone can',
    [AVAILABILITY_LEVELS.HIGH]: 'Most can',
    [AVAILABILITY_LEVELS.MEDIUM]: 'Some can',
    [AVAILABILITY_LEVELS.LOW]: 'Few can',
  }
  return labels[level] || labels[AVAILABILITY_LEVELS.LOW]
}

/**
 * The badge one member's answer to a date wears in the roll-call.
 * @param {string|null} state the member's answer, or null when there is none
 * @returns {string} a `.badge-*` class
 */
export function answerBadgeClass(state) {
  const classes = {
    [ATTENDANCE_STATES.YES]: 'badge-primary',
    [ATTENDANCE_STATES.NO]: 'badge-danger',
    [ATTENDANCE_STATES.MAYBE]: 'badge-yellow',
  }
  return classes[state] || 'badge-muted'
}

/** Short text for one member's answer ("Can", "Cannot", "Maybe", "—"). */
export function answerLabel(state) {
  const labels = {
    [ATTENDANCE_STATES.YES]: 'Can',
    [ATTENDANCE_STATES.NO]: 'Cannot',
    [ATTENDANCE_STATES.MAYBE]: 'Maybe',
  }
  return labels[state] || 'No answer'
}

/**
 * Which `BaseButton` variant an answer button wears: the pressed one or the plain
 * one. Kept here rather than in the template, where a comparison would turn into
 * styling logic — the same rule the spell-school badge follows.
 *
 * @param {string} state the answer this button sets
 * @param {string|null} current the caller's answer to that date
 * @returns {'answer'|'answer-selected'}
 */
export function answerVariant(state, current) {
  return state === current ? 'answer-selected' : 'answer'
}

/**
 * The percentage as the badge shows it, rounded to the nearest whole number.
 * @param {{ percent: number }} summary
 * @returns {string}
 */
export function availabilityPercent(summary) {
  return `${Math.round(summary.percent * 100)}%`
}

/** The best-attended candidate date, used for a plan's marker in the list. */
export function bestDate(plan) {
  const roster = rosterOf(plan)
  return (plan?.dates || []).reduce((best, date) => {
    if (!best) return date
    return attendanceSummary(date, roster).yes > attendanceSummary(best, roster).yes ? date : best
  }, null)
}

/** Whether a plan is settled. */
export function isDecided(plan) {
  return plan?.status === 'DECIDED'
}

/**
 * A date as a person reads it: "Sat 14 Mar 2026". Locale-aware — no hardcoded
 * format — and no time when the plan has none.
 * @param {string|object|null} value - ISO date (`2026-03-14`) or Date
 * @returns {string} empty when there is nothing to show
 */
export function formatPlanDate(value) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/**
 * A candidate date's optional window, e.g. "18:00–22:00", or an empty string when
 * the plan has no times for it (a perfectly ordinary plan).
 * @param {{ startTime?: string|null, endTime?: string|null }} date - PlannerDateDTO
 * @returns {string}
 */
export function formatTimeRange(date) {
  const start = timeField(date?.startTime)
  const end = timeField(date?.endTime)
  if (!start) return ''
  return end ? `${start}–${end}` : start
}

/** A time the way `<input type="time">` reads and writes it: `HH:MM`, or empty. */
function timeField(value) {
  return value ? String(value).slice(0, 5) : ''
}

/**
 * The draft both date forms work on: the four fields that describe a candidate day.
 * A fresh object every time, so a caller's draft is never shared state.
 * @returns {{ date: string, startTime: string, endTime: string, note: string }}
 */
export function emptyDateForm() {
  return { date: '', startTime: '', endTime: '', note: '' }
}

/**
 * A draft filled from a candidate date, so editing starts from what is stored.
 * @param {object|null} date - PlannerDateDTO
 * @returns {{ date: string, startTime: string, endTime: string, note: string }}
 */
export function dateFormOf(date) {
  if (!date) return emptyDateForm()
  return {
    date: date.date || '',
    startTime: timeField(date.startTime),
    endTime: timeField(date.endTime),
    note: date.note || '',
  }
}

/**
 * The payload the API takes, from a draft. Empty times and an empty note become
 * `null`, so clearing a field clears it on the server rather than leaving the old
 * value behind.
 * @param {{ date: string, startTime?: string, endTime?: string, note?: string }} form
 * @returns {{ date: string, startTime: string|null, endTime: string|null, note: string|null }}
 */
export function datePayloadOf(form) {
  return {
    date: form.date,
    startTime: form.startTime || null,
    endTime: form.endTime || null,
    note: form.note || null,
  }
}

/**
 * Whether a draft differs from the date it was opened from. This is what decides
 * whether leaving an editor has something to lose, so it compares against the
 * **stored** values — reopening a day and saving it unchanged is not a change.
 * @param {object|null} form
 * @param {object|null} date - the date being edited
 * @returns {boolean}
 */
export function isDateFormDirty(form, date) {
  if (!form || !date) return false
  const stored = dateFormOf(date)
  return (
    form.date !== stored.date ||
    form.startTime !== stored.startTime ||
    form.endTime !== stored.endTime ||
    form.note !== stored.note
  )
}
