import { describe, it, expect, vi, afterEach } from 'vitest'
import { slugifyFileName, dateStamp, downloadTextFile } from '@/utils/download.js'

describe('slugifyFileName', () => {
  it('lowercases and dashes non-alphanumerics', () => {
    expect(slugifyFileName('Morsan the Outlaw!')).toBe('morsan-the-outlaw')
  })

  it('folds Swedish diacritics to ASCII for portable file names', () => {
    expect(slugifyFileName('Hörn älg åsna')).toBe('horn-alg-asna')
  })

  it('falls back when the name has nothing usable', () => {
    expect(slugifyFileName('***', 'character')).toBe('character')
    expect(slugifyFileName('', 'ship')).toBe('ship')
  })

  it('trims the single dash a leading or trailing run leaves behind', () => {
    expect(slugifyFileName('---Morsan---')).toBe('morsan')
    expect(slugifyFileName('a---a---')).toBe('a-a')
    expect(slugifyFileName('  ***  ')).toBe('export')
    expect(slugifyFileName('---', 'character')).toBe('character')
  })

  it('collapses every run of separators to a single dash', () => {
    expect(slugifyFileName('a -- b')).toBe('a-b')
    expect(slugifyFileName('a....b')).toBe('a-b')
  })

  it('stays correct and fast on a long adversarial input', () => {
    expect(slugifyFileName('a' + '-'.repeat(30000) + 'a')).toBe('a-a')
    expect(slugifyFileName('*'.repeat(30000), 'character')).toBe('character')
  })
})

describe('dateStamp', () => {
  it('formats a date as YYYY-MM-DD with zero padding', () => {
    expect(dateStamp(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('downloadTextFile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('creates and revokes a blob URL and clicks a temporary link', () => {
    const createObjectURL = vi.fn(() => 'blob:fake')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const click = vi.fn()
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const element = realCreate(tag)
      if (tag === 'a') element.click = click
      return element
    })

    expect(() => downloadTextFile({ filename: 'x.txt', content: 'hello' })).not.toThrow()
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
  })
})
