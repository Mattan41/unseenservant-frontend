import { describe, it, expect } from 'vitest'
import { decodeHtmlEntities } from '@/utils/htmlEntities.js'

describe('decodeHtmlEntities', () => {
  it('returns an empty string for blank input', () => {
    expect(decodeHtmlEntities('')).toBe('')
    expect(decodeHtmlEntities(null)).toBe('')
    expect(decodeHtmlEntities(undefined)).toBe('')
  })

  it('decodes named entities', () => {
    expect(decodeHtmlEntities('fire &amp; brimstone')).toBe('fire & brimstone')
    expect(decodeHtmlEntities('&quot;Aren&quot;')).toBe('"Aren"')
    expect(decodeHtmlEntities('a&nbsp;b')).toBe('a\u00a0b')
  })

  it('decodes decimal and hex code points (Open5e spell text)', () => {
    expect(decodeHtmlEntities('aren&#x27;t')).toBe("aren't")
    expect(decodeHtmlEntities('aren&#39;t')).toBe("aren't")
    expect(decodeHtmlEntities('&#x1F600;')).toBe('😀')
  })

  it('leaves unknown entities and plain text untouched', () => {
    expect(decodeHtmlEntities('&notanentity; & Just text')).toBe('&notanentity; & Just text')
    expect(decodeHtmlEntities('&#xZZ;')).toBe('&#xZZ;')
  })

  it('ignores out-of-range code points', () => {
    expect(decodeHtmlEntities('&#x110000;')).toBe('&#x110000;')
  })
})
