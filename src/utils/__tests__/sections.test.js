import { describe, expect, it } from 'vitest'
import {
  createSection,
  newSectionId,
  normalizeSection,
  normalizeSections,
} from '@/utils/sections.js'

describe('newSectionId', () => {
  it('returns a distinct id every time', () => {
    expect(newSectionId()).not.toBe(newSectionId())
  })

  it('prefixes the id, so a stored section is recognisable', () => {
    expect(newSectionId()).toMatch(/^section_/)
  })
})

describe('normalizeSections', () => {
  it('keeps the order the sections arrived in', () => {
    const sections = normalizeSections([
      { id: 'c', title: 'Cargo', body: 'Crates.' },
      { id: 'a', title: 'Leads', body: 'A rumour.' },
      { id: 'b', title: 'Log', body: 'Day one.' },
    ])

    expect(sections.map((section) => section.title)).toEqual(['Cargo', 'Leads', 'Log'])
  })

  it('drops anything that is not a section', () => {
    expect(
      normalizeSections([null, 'nope', 42, { id: 'a', title: 'Cargo', body: '' }]),
    ).toHaveLength(1)
  })

  it('answers an empty list for a ship or character that has none', () => {
    expect(normalizeSections(undefined)).toEqual([])
    expect(normalizeSections(null)).toEqual([])
    expect(normalizeSections({})).toEqual([])
  })

  it('fills in missing text fields rather than leaving them undefined', () => {
    expect(normalizeSections([{ id: 'a' }])).toEqual([{ id: 'a', title: '', body: '' }])
  })

  it('gives an id-less section a stable positional id', () => {
    const once = normalizeSections([{ title: 'Cargo', body: 'Crates.' }])
    const twice = normalizeSections([{ title: 'Cargo', body: 'Crates.' }])

    expect(once[0].id).toBe('section_0')
    expect(twice[0].id).toBe(once[0].id)
  })
})

describe('normalizeSection', () => {
  it('returns null for a value that is not a section', () => {
    expect(normalizeSection(null)).toBeNull()
    expect(normalizeSection('Cargo')).toBeNull()
  })
})

describe('createSection', () => {
  it('builds a section with a fresh id and the given text', () => {
    const section = createSection({ title: 'Cargo', body: 'Two crates.' })

    expect(section.title).toBe('Cargo')
    expect(section.body).toBe('Two crates.')
    expect(section.id).toBeTruthy()
  })

  it('defaults both text fields to empty strings', () => {
    expect(createSection()).toEqual({ id: expect.any(String), title: '', body: '' })
  })
})
