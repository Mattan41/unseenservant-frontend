/**
 * The journal's limits, mirroring the backend's properties.
 *
 * The backend is authoritative (`app.journal.max-page-length` and
 * `app.journal.max-pages` in its application.properties) — these values exist
 * only so the editor can warn, block and explain *before* a request is refused.
 * `src/utils/imageUpload.js` mirrors the upload limit in the same way.
 */
export const MAX_PAGE_CHARS = 10000

/** A journal holds at most this many stored pages (the trailing blank is virtual). */
export const MAX_PAGES = 500

/** The character counter appears only once a page gets this close to the limit. */
export const COUNTER_THRESHOLD = 0.9
