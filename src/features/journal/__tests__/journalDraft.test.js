import { beforeEach, describe, expect, it } from 'vitest'
import { clearDraft, readDraft, writeDraft } from '@/features/journal/journalDraft.js'

describe('journalDraft', () => {
  beforeEach(() => localStorage.clear())

  it('mirrors text per user, campaign and page', () => {
    writeDraft(7, 1, 'virtual', 'half a sentence')

    expect(readDraft(7, 1, 'virtual')).toEqual({ content: 'half a sentence' })
    expect(readDraft(7, 1, '31')).toBeNull()
    expect(readDraft(8, 1, 'virtual')).toBeNull()
    expect(readDraft(7, 2, 'virtual')).toBeNull()
  })

  it('is dropped once the text has been saved', () => {
    writeDraft(7, 1, '31', 'typed')

    clearDraft(7, 1, '31')

    expect(readDraft(7, 1, '31')).toBeNull()
  })

  it('survives unreadable storage without throwing', () => {
    localStorage.setItem('journal_draft:7:1:virtual', 'not json')

    expect(readDraft(7, 1, 'virtual')).toBeNull()
  })
})
