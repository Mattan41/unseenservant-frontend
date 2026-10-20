import { describe, it, expect } from 'vitest'
import { renderMarkdown, toPlainText } from '@/utils/markdown.js'

describe('renderMarkdown', () => {
  it('returns an empty string for blank input', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown(undefined)).toBe('')
  })

  it('formats emphasis, code and headings', () => {
    const html = renderMarkdown('**Aren** and *Kalos* and `rifle`\n\n# Heading')
    expect(html).toContain('<strong>Aren</strong>')
    expect(html).toContain('<em>Kalos</em>')
    expect(html).toContain('<code>rifle</code>')
    expect(html).toContain('<h1>Heading</h1>')
  })

  it('turns a single newline into a line break (the pre-line behaviour)', () => {
    expect(renderMarkdown('line one\nline two')).toContain('<br>')
  })

  it('renders lists and blockquotes', () => {
    const html = renderMarkdown('- blaster\n- medkit\n\n> quoted')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>blaster</li>')
    expect(html).toContain('<blockquote>')
  })

  it('linkifies bare URLs and renders markdown links', () => {
    expect(renderMarkdown('see https://example.com')).toContain('<a href="https://example.com"')
    expect(renderMarkdown('[docs](https://example.org)')).toContain('>docs</a>')
  })

  it('escapes raw HTML instead of injecting it', () => {
    const html = renderMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes an event-handler payload', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('rejects javascript: link targets', () => {
    const html = renderMarkdown('[click](javascript:alert(1))')
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('click')
  })

  it('never renders images, even a markdown image', () => {
    expect(renderMarkdown('![tracking](https://evil.example/pixel.png)')).not.toContain('<img')
  })

  it('keeps punctuation literal (typographer off)', () => {
    expect(renderMarkdown('"quoted" -- text')).toContain('&quot;quoted&quot;')
  })
})

describe('toPlainText', () => {
  it('returns an empty string for blank input', () => {
    expect(toPlainText('')).toBe('')
    expect(toPlainText(null)).toBe('')
  })

  it('strips markdown syntax and collapses whitespace', () => {
    expect(toPlainText('**Aren**  \n*Kalos*')).toBe('Aren Kalos')
  })

  it('drops heading and list markers, keeping the words', () => {
    expect(toPlainText('# Title\n\n- one\n- two')).toBe('Title one two')
  })

  it('never leaves a marker behind, so a later truncation stays readable', () => {
    const plain = toPlainText('**A very long bold sentence** that keeps going')
    expect(plain.startsWith('A very long bold sentence')).toBe(true)
    expect(plain).not.toContain('*')
  })

  it('keeps characters the renderer escapes readable', () => {
    expect(toPlainText('fire & brimstone')).toBe('fire & brimstone')
    expect(toPlainText('5 < 6')).toBe('5 < 6')
  })

  it('strips tags from links, inline code and blockquotes', () => {
    expect(toPlainText('see [docs](https://example.org)')).toBe('see docs')
    expect(toPlainText('`code <b> x`')).toBe('code <b> x')
    expect(toPlainText('> quoted')).toBe('quoted')
  })

  it('stays correct and fast on long adversarial inputs', () => {
    // A raw `<` is escaped to `&lt;` by the renderer, so no tag run is built.
    expect(toPlainText('<'.repeat(30000))).toBe('<'.repeat(30000))
    // Many real tags: exercises the tag strip across the whole document.
    expect(toPlainText('**a** '.repeat(20000))).toBe('a '.repeat(20000).trim())
  })
})
