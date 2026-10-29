import { describe, expect, it } from 'vitest'
import {
  AUDIT_EVENT_TYPES,
  getEventBadgeClass,
  getEventLabel,
  getEventParties,
} from '@/features/admin/auditUtils.js'

/**
 * The audit trail's presentation.
 *
 * The property that matters most here is what happens to a type this frontend has
 * never heard of: the backend may add one before the label map knows it, and a
 * log view that breaks — or badges it as if it were routine — would be worse than
 * one that shows the raw name.
 */
describe('auditUtils', () => {
  it('labels every type the backend records', () => {
    for (const type of AUDIT_EVENT_TYPES) {
      const label = getEventLabel(type)

      expect(label).not.toBe(type)
      expect(label).toMatch(/^[A-Z]/)
    }
  })

  it('gives every type a semantic badge class, never a palette utility', () => {
    for (const type of AUDIT_EVENT_TYPES) {
      expect(getEventBadgeClass(type)).toMatch(/^badge-[a-z]+$/)
    }
  })

  it('marks the failures and refusals apart from the routine events', () => {
    expect(getEventBadgeClass('LOGIN_FAILED')).toBe('badge-danger')
    expect(getEventBadgeClass('LOGIN_THROTTLED')).toBe('badge-danger')
    expect(getEventBadgeClass('OAUTH_REFUSED')).toBe('badge-yellow')
    expect(getEventBadgeClass('LOGIN_SUCCEEDED')).toBe('badge-muted')
    expect(getEventBadgeClass('WHITELIST_REVOKED')).toBe('badge-danger')
  })

  it('falls back to the raw type for one it does not know', () => {
    expect(getEventLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
    expect(getEventBadgeClass('SOMETHING_NEW')).toBe('badge-muted')
  })

  it('survives a missing type', () => {
    expect(getEventLabel(undefined)).toBe('Unknown event')
    expect(getEventBadgeClass(null)).toBe('badge-muted')
  })

  describe('getEventParties', () => {
    it('names the actor and the target when there is one', () => {
      expect(getEventParties({ actorName: 'admin', targetName: 'User2' })).toBe('admin → User2')
    })

    it('names only the actor for an attempt with no account behind it', () => {
      expect(getEventParties({ actorName: 'guessy', targetName: null })).toBe('guessy')
    })

    it('has a placeholder for a row that names nobody', () => {
      expect(getEventParties({})).toBe('—')
      expect(getEventParties(null)).toBe('—')
    })
  })
})
