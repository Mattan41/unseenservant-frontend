/**
 * Generic list-ordering helpers.
 *
 * Kept pure (no stores, no localStorage) so both feature stores and the test
 * suite can share one definition, mirroring `campaignUtils.js`.
 */

/**
 * Order items by when the user last viewed them, most recently viewed first.
 *
 * Items that have never been viewed keep their incoming order — `sort` is
 * stable and the comparison returns `0` for two unviewed items — so an
 * unordered server response stays exactly as the server sent it.
 *
 * The input is never mutated; a new array is returned. Ids are compared as
 * strings, because backend ids are numbers while guest-mode ids are strings.
 *
 * @param {Array<object>} items
 * @param {Object<string, number>} [viewedAt] - `{ [id]: epochMs }` (see `viewHistory.js`)
 * @param {{ getId?: (item: object) => * }} [options]
 * @returns {Array<object>} A re-ordered copy of `items`
 */
export function sortByLastViewed(items, viewedAt = {}, { getId = (item) => item.id } = {}) {
  return [...(items || [])].sort(
    (a, b) => (viewedAt[String(getId(b))] || 0) - (viewedAt[String(getId(a))] || 0),
  )
}
