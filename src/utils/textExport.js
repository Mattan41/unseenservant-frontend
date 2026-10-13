/**
 * Generic plain-text / markdown document renderer for the export feature
 * ("back up my stuff"). Pure — no Vue, no stores, no DOM.
 *
 * A *document* is a small, format-agnostic description of a sheet:
 *
 *   {
 *     title: 'Morsan',
 *     subtitle: 'Offworlders',
 *     sections: [
 *       { heading: 'Vitals', fields: [{ label: 'Class', value: 'Outlaw' }, …] },
 *       { heading: 'Weapons', items: ['Pistol — Light (damage 1D6)', …] },
 *       { heading: 'Notes', text: 'raw **markdown** source' },
 *     ],
 *   }
 *
 * Systems (and the ship sheet) own *only* this structure; this module owns how
 * it renders. Adding a new system therefore never touches the serialisers.
 *
 * Two renderers share the same model:
 *   - 'txt' → `Label: value` lines, `- ` bullets, and long-text fields flattened
 *             through {@link toPlainText} so no `**` markers leak into a `.txt`.
 *   - 'md'  → headings + `- **Label:** value`, and long-text fields emit their
 *             markdown source verbatim (lossless, re-readable).
 */
import { toPlainText } from '@/utils/markdown.js'

/** Supported export formats. */
export const EXPORT_FORMATS = ['md', 'txt']

/** True when `format` is one this module can render. */
export function isExportFormat(format) {
  return EXPORT_FORMATS.includes(format)
}

/** A section renders only when it actually carries content. */
function hasContent(section) {
  if (!section) return false
  if (section.text !== undefined && String(section.text).trim() !== '') return true
  if (Array.isArray(section.fields) && section.fields.length > 0) return true
  if (Array.isArray(section.items) && section.items.length > 0) return true
  return false
}

/** Render the field/item rows of a section as an array of lines. */
function renderSectionBody(section, format) {
  const lines = []
  for (const field of section.fields || []) {
    lines.push(
      format === 'md' ? `- **${field.label}:** ${field.value}` : `${field.label}: ${field.value}`,
    )
  }
  for (const item of section.items || []) {
    lines.push(`- ${item}`)
  }
  return lines
}

/**
 * Render a document's sections (without title/subtitle) for a format.
 * @param {Array<object>} sections
 * @param {'md'|'txt'} [format='txt']
 * @returns {string}
 */
export function renderSections(sections, format = 'txt') {
  return renderDocument({ sections }, format)
}

/**
 * Render a full document to markdown or plain text.
 * @param {{title?: string, subtitle?: string, sections?: Array<object>}} doc
 * @param {'md'|'txt'} [format='txt']
 * @returns {string} A trailing-newline-terminated string.
 */
export function renderDocument(doc, format = 'txt') {
  const md = format === 'md'
  const blocks = []

  if (doc.title) {
    blocks.push(md ? `# ${doc.title}` : `${doc.title}\n${'='.repeat(doc.title.length)}`)
  }
  if (doc.subtitle) {
    blocks.push(md ? `_${doc.subtitle}_` : doc.subtitle)
  }

  for (const section of doc.sections || []) {
    if (!hasContent(section)) continue
    const joiner = md ? '\n\n' : '\n'
    const heading = section.heading
      ? md
        ? `## ${section.heading}`
        : section.heading.toUpperCase()
      : ''
    const hasText = section.text !== undefined && section.text !== ''
    const body = hasText
      ? md
        ? String(section.text)
        : toPlainText(section.text)
      : renderSectionBody(section, format).join('\n')
    const block = [heading, body].filter((part) => part !== '').join(joiner)
    if (block) blocks.push(block)
  }

  return `${blocks.join('\n\n')}\n`
}
