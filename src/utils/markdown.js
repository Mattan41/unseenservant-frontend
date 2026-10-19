/**
 * Markdown pipeline for long free-text fields (notes, descriptions,
 * backstories, ship notes, messages).
 *
 * One shared `markdown-it` instance so every surface renders identical output —
 * the character sheet, the campaign lore block, the ship sheet and the message
 * board all go through `renderMarkdown`.
 *
 * Configuration, and why:
 *  - `html: false`        → raw HTML typed by a user is escaped, never injected.
 *  - `linkify: true`      → bare URLs become links.
 *  - `breaks: true`       → a single newline becomes `<br>`, matching the
 *                           `whitespace-pre-line` behaviour users already know.
 *  - `typographer: false` → punctuation stays literal (no smart quotes).
 *
 * Images (`![alt](url)`) are disabled deliberately: a remote image in someone
 * else's sheet would leak that reader's IP address to a third party (tracking
 * pixel). Player uploads go through the campaign image pipeline instead.
 *
 * With `html: false` and markdown-it's built-in link validation (`javascript:`,
 * `vbscript:`, `file:` and `data:` targets are rejected) the output is safe to
 * bind with `v-html` — no DOM sanitiser is needed. `<MarkdownText>` is the only
 * component allowed to do that.
 */
import MarkdownIt from 'markdown-it'
import { decodeHtmlEntities } from '@/utils/htmlEntities.js'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
})

// See the module docblock: no external images.
markdown.disable('image')

/**
 * Render markdown source to HTML.
 *
 * @param {string} text Markdown source.
 * @returns {string} HTML string, or '' for blank input.
 */
export function renderMarkdown(text) {
  if (!text) return ''
  return markdown.render(String(text)).trim()
}

/**
 * Render markdown source as plain text.
 *
 * Used where the text is measured or cut — `<BaseClampedText>` decides whether
 * to offer "Read more" by character count, and `CampaignList` truncates its
 * preview. Stripping the syntax first keeps a clip from landing inside a
 * marker (e.g. `**bolds…`).
 *
 * @param {string} text Markdown source.
 * @returns {string} Whitespace-collapsed plain text.
 */
export function toPlainText(text) {
  if (!text) return ''
  const html = markdown.render(String(text))
  // `[^<>]`, not `[^>]`: the scan stops at the next `<` or `>`, so a stray `<`
  // fails at once instead of re-scanning the rest of the document.
  return decodeHtmlEntities(html.replace(/<[^<>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}
