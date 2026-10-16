import { describe, expect, it } from 'vitest'
import { ADMIN_ROLE, USER_ROLE, getRoleBadgeClass, getRoleLabel, isAdminRole } from './userUtils.js'

describe('userUtils', () => {
  describe('isAdminRole', () => {
    it('accepts the bare backend role', () => {
      expect(isAdminRole(ADMIN_ROLE)).toBe(true)
    })

    it('accepts the authority form returned by /api/auth/me', () => {
      expect(isAdminRole('ROLE_ADMIN')).toBe(true)
    })

    it('is case-insensitive and tolerates surrounding whitespace', () => {
      expect(isAdminRole(' admin ')).toBe(true)
    })

    it('rejects ordinary accounts', () => {
      expect(isAdminRole(USER_ROLE)).toBe(false)
      expect(isAdminRole('ROLE_USER')).toBe(false)
    })

    it('rejects a missing role', () => {
      expect(isAdminRole(null)).toBe(false)
      expect(isAdminRole(undefined)).toBe(false)
      expect(isAdminRole('')).toBe(false)
    })
  })

  describe('getRoleLabel', () => {
    it('labels administrators', () => {
      expect(getRoleLabel('ROLE_ADMIN')).toBe('Administrator')
    })

    it('labels every other account as a standard user', () => {
      expect(getRoleLabel(USER_ROLE)).toBe('Standard user')
      expect(getRoleLabel(null)).toBe('Standard user')
    })
  })

  describe('getRoleBadgeClass', () => {
    it('returns a distinct semantic badge per role', () => {
      expect(getRoleBadgeClass(ADMIN_ROLE)).toBe('badge-info')
      expect(getRoleBadgeClass(USER_ROLE)).toBe('badge-muted')
    })
  })
})