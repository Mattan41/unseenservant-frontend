import { describe, expect, it } from 'vitest'
import { MAX_PAGE_CHARS } from '@/features/journal/journalLimits.js'
import {
  clampPageNumber,
  counterVisible,
  isOverLimit,
  lastPageNumber,
  pageNumberAfterRemoval,
  resolveJump,
  saveStateClass,
  saveStateLabel,
} from '@/features/journal/journalUtils.js'

describe('journalUtils', () => {
  describe('lastPageNumber', () => {
    it('is one past the stored pages, so a blank book still has one', () => {
      expect(lastPageNumber(0)).toBe(1)
      expect(lastPageNumber(3)).toBe(4)
    })

    it('treats rubbish as an empty book', () => {
      expect(lastPageNumber(undefined)).toBe(1)
      expect(lastPageNumber('nope')).toBe(1)
    })
  })

  describe('resolveJump', () => {
    it('stays put when nothing was typed', () => {
      expect(resolveJump('', 3)).toBeNull()
      expect(resolveJump('   ', 3)).toBeNull()
      expect(resolveJump(undefined, 3)).toBeNull()
    })

    it('stays put when the entry is not a number', () => {
      expect(resolveJump('abc', 3)).toBeNull()
      expect(resolveJump('2a', 3)).toBeNull()
    })

    it('sends 0 and negative numbers to the first page', () => {
      expect(resolveJump('0', 3)).toBe(1)
      expect(resolveJump('-7', 3)).toBe(1)
    })

    it('sends anything past the last page to the last page', () => {
      expect(resolveJump('99', 3)).toBe(4)
      // The last page is the trailing blank one, so it is reachable too.
      expect(resolveJump('4', 3)).toBe(4)
    })

    it('accepts a page inside the book', () => {
      expect(resolveJump('2', 3)).toBe(2)
    })
  })

  describe('clampPageNumber', () => {
    it('keeps a page that exists', () => {
      expect(clampPageNumber(2, 3)).toBe(2)
    })

    it('clamps into the book, rubbish included', () => {
      expect(clampPageNumber(9, 3)).toBe(4)
      expect(clampPageNumber(0, 3)).toBe(1)
      expect(clampPageNumber('x', 3)).toBe(1)
    })
  })

  it('after a deletion shows the page that took the number', () => {
    // Deleting page 2 of 3 leaves two stored pages: page 2 is the one that moved up.
    expect(pageNumberAfterRemoval(2, 2)).toBe(2)
    // Deleting the last page leaves the virtual one at the old number.
    expect(pageNumberAfterRemoval(4, 2)).toBe(3)
  })

  describe('the length limit', () => {
    it('is refused only past the limit — the text is never cut', () => {
      expect(isOverLimit('a'.repeat(MAX_PAGE_CHARS))).toBe(false)
      expect(isOverLimit('a'.repeat(MAX_PAGE_CHARS + 1))).toBe(true)
      expect(isOverLimit('a'.repeat(MAX_PAGE_CHARS + 500))).toBe(true)
    })

    it('shows the counter from about 90% on', () => {
      expect(counterVisible('a'.repeat(8999))).toBe(false)
      expect(counterVisible('a'.repeat(9000))).toBe(true)
      expect(counterVisible('a'.repeat(MAX_PAGE_CHARS))).toBe(true)
    })
  })

  describe('the save state', () => {
    it('uses the existing semantic classes', () => {
      expect(saveStateClass('error')).toBe('text-warning')
      expect(saveStateClass('saving')).toBe('text-muted')
      expect(saveStateClass('saved')).toBe('text-muted')
    })

    it('says what it means', () => {
      expect(saveStateLabel('saving')).toBe('Saving…')
      expect(saveStateLabel('saved')).toBe('Saved')
      expect(saveStateLabel('dirty')).toBe('Unsaved changes')
      expect(saveStateLabel('error')).toBe('Could not save')
      expect(saveStateLabel('idle')).toBe('')
    })
  })
})
