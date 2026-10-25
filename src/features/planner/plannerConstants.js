/**
 * Planner constants.
 *
 * The limits mirror the backend's `app.planner.*` properties, exactly as
 * `journalLimits.js` mirrors the journal's: the server is authoritative and answers
 * 400 with the limit it applied, while these keep the client from offering an input
 * that cannot be saved.
 *
 * Pure data: no Vue, no stores, no UI.
 */

/** A plan is open while it is being filled in, and decided once the group picks a day. */
export const PLAN_STATUSES = {
  OPEN: 'OPEN',
  DECIDED: 'DECIDED',
}

/** One member's answer to one candidate date. No answer is the absence of a state. */
export const ATTENDANCE_STATES = {
  YES: 'YES',
  NO: 'NO',
  MAYBE: 'MAYBE',
}

/** The answer buttons, in the order they are offered; the labels are UI copy. */
export const ATTENDANCE_OPTIONS = [
  { state: ATTENDANCE_STATES.YES, label: 'Can attend', icon: 'check' },
  { state: ATTENDANCE_STATES.MAYBE, label: 'Not sure', icon: 'help' },
  { state: ATTENDANCE_STATES.NO, label: 'Cannot', icon: 'close' },
]

/** A plan title (`app.planner.max-title-length`). */
export const MAX_TITLE_LENGTH = 200

/** A plan description, markdown source (`app.planner.max-description-length`). */
export const MAX_DESCRIPTION_LENGTH = 10000

/** The note on one candidate date (`app.planner.max-note-length`). */
export const MAX_NOTE_LENGTH = 500

/**
 * The four colour levels a candidate date can be marked with.
 *
 * The names are the semantic classes this app paints them with
 * (`.availability-surface-*` in `main.css`) — the planner never names a colour
 * itself.
 */
export const AVAILABILITY_LEVELS = {
  FULL: 'full',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

/**
 * Where the levels start, as a fraction of the roster that has said yes.
 *
 * `full` is 100 % on purpose: green means everybody still in the plan can attend,
 * and an unanswered member counts against a date rather than being ignored.
 */
export const AVAILABILITY_THRESHOLDS = {
  FULL: 1,
  HIGH: 0.7,
  MEDIUM: 0.4,
}
