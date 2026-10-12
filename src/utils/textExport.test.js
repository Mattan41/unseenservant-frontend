import { describe, it, expect } from 'vitest'
import { renderDocument, renderSections } from '@/utils/textExport.js'

const doc = {
  title: 'Morsan',
  subtitle: 'Offworlders',
  sections: [
    { heading: 'Vitals', fields: [{ label: 'Class', value: 'Outlaw' }] },
    { heading: 'Weapons', items: ['Pistol — Light (damage 1D6)'] },
  ],
}

describe('renderDocument', () => {
  it('renders markdown with a heading and bold labels', () => {
    const md = renderDocument(doc, 'md')
    expect(md).toContain('# Morsan')
    expect(md).toContain('_Offworlders_')
    expect(md).toContain('## Vitals')
    expect(md).toContain('- **Class:** Outlaw')
    expect(md).toContain('- Pistol — Light (damage 1D6)')
  })

  it('renders plain text with an underlined title and plain labels', () => {
    const txt = renderDocument(doc, 'txt')
    expect(txt).toContain('Morsan\n======')
    expect(txt).toContain('VITALS')
    expect(txt).toContain('Class: Outlaw')
    expect(txt).not.toContain('**')
  })

  it('skips sections that carry no content', () => {
    const txt = renderDocument({ sections: [{ heading: 'Empty', items: [] }] }, 'txt')
    expect(txt).not.toContain('Empty')
  })

  it('flattens markdown source in long-text fields for txt', () => {
    const txt = renderDocument({ sections: [{ heading: 'Notes', text: '**bold** and *italic*' }] }, 'txt')
    expect(txt).toContain('bold and italic')
    expect(txt).not.toContain('*')
  })

  it('keeps markdown source verbatim for long-text fields in md', () => {
    const md = renderDocument({ sections: [{ heading: 'Notes', text: '**bold**' }] }, 'md')
    expect(md).toContain('**bold**')
  })

  it('ends with a single trailing newline', () => {
    expect(renderDocument(doc, 'txt').endsWith('\n')).toBe(true)
  })
})

describe('renderSections', () => {
  it('renders sections without a title or subtitle', () => {
    expect(renderSections([{ heading: 'X', items: ['a'] }], 'txt')).toContain('- a')
  })
})
