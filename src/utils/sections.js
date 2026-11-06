/**
 * The `sections` field shared by a ship and a character: small, individually
 * titled plain-text notes that sit beside the free-text `notes` field.
 *
 * Pure — no Vue, no store, no DOM.
 *
 * A section is `{ id, title, body }`:
 *   * `body` is plain text, not markdown — a section is an entry, not a document;
 *   * `id` is generated here when the section is created and is opaque to the
 *     backend, which only stores it. It exists so the UI can address one section
 *     for an inline edit or a delete without relying on its position;
 *   * the order of the array is the order the user arranged the sections in, and
 *     it is what the backend stores, so nothing in this module sorts.
 *
 * `notes` is deliberately not part of this model: it stays a separate markdown
 * field and is never folded into the list.
 */
import { randomToken } from '@/utils/randomId.js'

/** A fresh, opaque section id. */
export function newSectionId() {
  return `section_${randomToken()}`
}

function toText(value) {
  return typeof value === 'string' ? value : ''
}

/**
 * Normalize one section from the API (or a backup) into `{ id, title, body }`.
 *
 * A section that arrived without an id gets a positional one, so the list can
 * always be keyed. The fallback is derived from the index rather than random so
 * that re-normalizing the same list yields the same ids.
 *
 * @param {unknown} section
 * @param {number} [index] position in the list, used only for the id fallback
 * @returns {{id: string, title: string, body: string}|null} null when not a section
 */
export function normalizeSection(section, index = 0) {
  if (!section || typeof section !== 'object') return null
  return {
    id: toText(section.id) || `section_${index}`,
    title: toText(section.title),
    body: toText(section.body),
  }
}

/**
 * Normalize a list of sections, dropping anything that is not a section.
 * The order is preserved exactly as it arrived.
 *
 * @param {unknown} sections
 * @returns {Array<{id: string, title: string, body: string}>}
 */
export function normalizeSections(sections) {
  if (!Array.isArray(sections)) return []
  return sections.map((section, index) => normalizeSection(section, index)).filter(Boolean)
}

/**
 * Build a new section from the add form's title and body.
 *
 * @param {{title?: string, body?: string}} [fields]
 * @returns {{id: string, title: string, body: string}}
 */
export function createSection({ title = '', body = '' } = {}) {
  return { id: newSectionId(), title: toText(title), body: toText(body) }
}
