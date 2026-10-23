/**
 * Pure helpers for the journal: page numbering, jump resolution and the limit
 * checks. No Vue, no stores, no API — the store and the components own the
 * behaviour, this module owns the arithmetic, and the unit tests own the proof.
 *
 * The book's shape follows the backend: `pages` are the stored pages in reading
 * order and their `pageNumber` is their 1-based place. The page after the last
 * stored one is always a blank, **virtual** page — it is never stored, so
 * `lastPageNumber` is always `pageCount + 1` and a journal always has at least
 * one page to write on.
 */
import { COUNTER_THRESHOLD, MAX_PAGE_CHARS } from './journalLimits.js'

/**
 * The number of the trailing blank page.
 * @param {number} pageCount stored pages
 * @returns {number} at least 1
 */
export function lastPageNumber(pageCount) {
  return Math.max(0, Number(pageCount) || 0) + 1
}

/**
 * Clamp a page number into the book.
 * @param {*} value anything number-ish (a string from an input is fine)
 * @param {number} pageCount stored pages
 * @returns {number} 1..lastPageNumber
 */
export function clampPageNumber(value, pageCount) {
  const number = Number.parseInt(String(value ?? ''), 10)
  if (Number.isNaN(number) || number < 1) return 1
  return Math.min(number, lastPageNumber(pageCount))
}

/**
 * Where a typed page number lands.
 *
 * Empty or non-numeric input returns `null`, which means "leave the reader where
 * they are" — an empty box is not a request to jump anywhere. `0` and negative
 * numbers go to the first page, and anything past the last page goes to the last
 * page.
 *
 * @param {*} rawValue what the user typed
 * @param {number} pageCount stored pages
 * @returns {number|null}
 */
export function resolveJump(rawValue, pageCount) {
  const raw = String(rawValue ?? '').trim()
  if (!/^-?\d+$/.test(raw)) return null

  const number = Number.parseInt(raw, 10)
  if (number < 1) return 1

  const last = lastPageNumber(pageCount)
  return Math.min(number, last)
}

/**
 * The page to show after the page at `pageNumber` is deleted: the page that
 * takes its number, or the last page when the deleted one was last.
 * @param {number} pageNumber the deleted page
 * @param {number} pageCountAfter stored pages after the deletion
 * @returns {number}
 */
export function pageNumberAfterRemoval(pageNumber, pageCountAfter) {
  return clampPageNumber(pageNumber, pageCountAfter)
}

/**
 * Whether the text is past the page limit. The editor refuses such a value
 * instead of truncating it, which is why this is a check and not a slice.
 * @param {string} text
 * @returns {boolean}
 */
export function isOverLimit(text) {
  return String(text ?? '').length > MAX_PAGE_CHARS
}

/**
 * Whether the character counter should be shown at all: only near the limit, so
 * an ordinary page stays quiet.
 * @param {string} text
 * @returns {boolean}
 */
export function counterVisible(text) {
  return String(text ?? '').length >= Math.floor(MAX_PAGE_CHARS * COUNTER_THRESHOLD)
}

/**
 * The save state as a semantic class. Colours are decided here rather than in a
 * template (STYLE_GUIDE §3.3), and both classes already exist.
 * @param {'idle'|'dirty'|'saving'|'saved'|'error'} state
 * @returns {string}
 */
export function saveStateClass(state) {
  return state === 'error' ? 'text-warning' : 'text-muted'
}

/**
 * The sentence next to the save state.
 * @param {'idle'|'dirty'|'saving'|'saved'|'error'} state
 * @returns {string}
 */
export function saveStateLabel(state) {
  if (state === 'saving') return 'Saving…'
  if (state === 'saved') return 'Saved'
  if (state === 'error') return 'Could not save'
  if (state === 'dirty') return 'Unsaved changes'
  return ''
}
