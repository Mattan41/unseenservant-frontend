/**
 * Browser helpers to save a generated text file to the user's own device.
 *
 * Uses a `Blob` + a temporary `<a download>` — the same client-side pattern the
 * app already uses for image previews (`URL.createObjectURL`). Nothing is
 * uploaded; the file lands in the user's Downloads folder. That local copy is
 * the whole point of the backup feature.
 */

/**
 * Turn a display name into a filesystem-safe slug.
 *
 * Diacritics are folded to ASCII (å → a, é → e) and everything that is not a
 * letter or digit becomes a single dash, so the name is safe on macOS, Linux and
 * Windows alike.
 *
 * @param {string} name
 * @param {string} [fallback='export'] used when the name slugifies to nothing
 * @returns {string}
 */
export function slugifyFileName(name, fallback = 'export') {
  const slug = String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    // The step above collapses every separator run to one dash, so a single
    // dash per edge is all that is left to trim (`-+$` would backtrack).
    .replace(/^-|-$/g, '')
  return slug || fallback
}

/**
 * Local date stamp in `YYYY-MM-DD` form (used in export file names so repeated
 * backups never overwrite each other).
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function dateStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Trigger a client-side download of a text file.
 *
 * Content is written as UTF-8 with LF line endings (native on macOS/Linux) and
 * without a BOM, so å/ä/ö render correctly in any editor and on GitHub.
 *
 * @param {{filename: string, content: string, mime?: string}} options
 */
export function downloadTextFile({ filename, content, mime = 'text/plain' }) {
  if (typeof document === 'undefined') return

  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
