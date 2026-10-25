/**
 * Backend timestamps, in one place.
 *
 * Every `createdAt` / `updatedAt` the API sends is a **UTC** wall clock in
 * ISO-8601 local form — `2026-05-29T09:00:00`, with no `Z` and no offset (the
 * backend documents this in its INTEGRATION_CONTRACT). JavaScript parses a
 * date-time string *without* a zone as **local** time, so `new Date(createdAt)`
 * silently moves the instant by the reader's offset: a CET reader saw 09:00 for
 * a row written at 11:00 their time. These helpers add the missing `Z` before
 * parsing, so one rule covers every call site.
 *
 * Kept pure (no stores, no i18n setup) so the test suite can share them, and
 * deliberately tolerant of a value that already carries a zone — guest mode and
 * the demo data write `toISOString()`, which ends in `Z`.
 */

/** An ISO-8601 local date-time: the form the backend sends. */
const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/

/**
 * Parse a backend timestamp into a `Date`, reading a zone-less value as UTC.
 *
 * @param {string|Date|null|undefined} value
 * @returns {Date|null} `null` for a missing or unparseable value, so a caller can
 *   decide what to show instead of rendering "Invalid Date".
 */
export function parseUtcTimestamp(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value !== 'string') return null

  const text = value.trim()
  if (!text) return null

  const date = new Date(LOCAL_DATE_TIME.test(text) ? `${text}Z` : text)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * A backend timestamp as a date in the reader's zone.
 *
 * @param {string|Date|null|undefined} value
 * @returns {string} The localized date, or `''` when there is no usable value.
 */
export function formatUtcDate(value) {
  const date = parseUtcTimestamp(value)
  return date ? date.toLocaleDateString() : ''
}

/**
 * A backend timestamp as a date and time in the reader's zone.
 *
 * @param {string|Date|null|undefined} value
 * @returns {string} The localized date and time, or `''` when there is no usable
 *   value.
 */
export function formatUtcDateTime(value) {
  const date = parseUtcTimestamp(value)
  return date ? date.toLocaleString() : ''
}
