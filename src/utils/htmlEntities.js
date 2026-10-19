/**
 * Minimal HTML-entity decoder for text that arrives pre-escaped.
 *
 * Third-party content (the Open5e spell API) is delivered with HTML entities
 * baked in — e.g. `aren&#x27;t` or `fire &amp; brimstone` — and nothing in the
 * stack (neither the backend proxy nor this app) decodes them, so they used to
 * render literally. Decode that text once, at the source-normalisation step
 * (`src/systems/dnd5e/spellUtils.js` → `normalizeSpell`), not in templates.
 *
 * Unknown entities are returned untouched, so the function is safe to run over
 * any string, including user-authored text.
 */

/** Named entities that realistically appear in third-party game text. */
const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
}

// `&#123;` (decimal), `&#x1F600;` (hex) and `&amp;` (named).
const ENTITY_PATTERN = /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi

/**
 * Convert a numeric entity body into a character.
 *
 * @param {string} digits Code point digits, without the leading `#`.
 * @param {number} radix 10 for decimal entities, 16 for hex.
 * @returns {string|null} The character, or null when out of range.
 */
function decodeCodePoint(digits, radix) {
  const codePoint = Number.parseInt(digits, radix)
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return null
  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return null
  }
}

/**
 * Decode the HTML entities found in a string.
 *
 * @param {string} text Text that may contain entities.
 * @returns {string} Text with known entities decoded; unknown ones left as-is.
 */
export function decodeHtmlEntities(text) {
  if (!text) return ''
  return String(text).replace(ENTITY_PATTERN, (match, entity) => {
    if (entity.startsWith('#')) {
      const isHex = entity[1] === 'x' || entity[1] === 'X'
      const decoded = decodeCodePoint(isHex ? entity.slice(2) : entity.slice(1), isHex ? 16 : 10)
      return decoded === null ? match : decoded
    }
    const named = NAMED_ENTITIES[entity.toLowerCase()]
    return named === undefined ? match : named
  })
}
