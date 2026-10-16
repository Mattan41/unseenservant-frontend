import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import guestAxios from '@/api/lib/guest-axios.js'
import { guestUser, seedGuestStorage, clearGuestStorage } from '@/data/demoData.js'
import { useAuthStore } from '@/features/auth/authStore.js'

/**
 * Guest mode has to answer the admin surface too, or the settings section would
 * hit a hole with no backend to fall back on. These tests pin the mocks to the
 * same rules the live backend enforces.
 */
describe('guest-axios admin mocks', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    seedGuestStorage()
    useAuthStore().isGuest = true
  })

  const asRole = (role) => {
    localStorage.setItem('guest_user', JSON.stringify({ ...guestUser, role }))
  }

  describe('accounts', () => {
    it('lists the demo user alongside the seeded players', async () => {
      const { data } = await guestAxios.get('api/admin/users')

      expect(data[0].id).toBe('guest_demo')
      expect(data).toHaveLength(6)
    })

    it('refuses ordinary accounts', async () => {
      asRole('USER')

      await expect(guestAxios.get('api/admin/users')).rejects.toMatchObject({
        response: { status: 403 },
      })
    })

    it('changes another account\'s role', async () => {
      const { data } = await guestAxios.patch('api/admin/users/guest_player_1/role', {
        role: 'ADMIN',
      })

      expect(data.role).toBe('ADMIN')
      const stored = JSON.parse(localStorage.getItem('guest_users'))
      expect(stored.find((user) => user.id === 'guest_player_1').role).toBe('ADMIN')
    })

    it('refuses changing your own role', async () => {
      await expect(
        guestAxios.patch('api/admin/users/guest_demo/role', { role: 'USER' }),
      ).rejects.toMatchObject({ response: { status: 400 } })
    })

    it('allows demoting an administrator while another one remains', async () => {
      await guestAxios.patch('api/admin/users/guest_player_1/role', { role: 'ADMIN' })
      const { data } = await guestAxios.patch('api/admin/users/guest_player_1/role', {
        role: 'USER',
      })

      expect(data.role).toBe('USER')
    })

    // The last-administrator branch cannot be reached through the endpoint — the
    // caller must itself be an administrator, so a demotion always leaves one
    // behind. Self-demotion is the reachable protection above, exactly as on the
    // backend (see AdminService's javadoc).
  })

  describe('whitelist', () => {
    it('lists the seeded rows, revoked ones included', async () => {
      const { data } = await guestAxios.get('api/admin/whitelist')

      expect(data.some((entry) => entry.email === 'former@demo.local' && !entry.active)).toBe(true)
    })

    it('admits a new address in lower case', async () => {
      const { data } = await guestAxios.post('api/admin/whitelist', {
        email: '  NewUser@Demo.local ',
        role: 'ADMIN',
      })

      expect(data.email).toBe('newuser@demo.local')
      expect(data.active).toBe(true)
    })

    it('re-activates a revoked address instead of duplicating it', async () => {
      const { data } = await guestAxios.post('api/admin/whitelist', {
        email: 'former@demo.local',
        role: 'USER',
      })

      expect(data.id).toBe('guest_whitelist_4')
      expect(data.active).toBe(true)
      const rows = JSON.parse(localStorage.getItem('guest_whitelist'))
      expect(rows.filter((row) => row.email === 'former@demo.local')).toHaveLength(1)
    })

    it('rejects an address that is not one', async () => {
      await expect(
        guestAxios.post('api/admin/whitelist', { email: 'nope', role: 'USER' }),
      ).rejects.toMatchObject({ response: { status: 400 } })
    })

    it('revokes an address without dropping the row', async () => {
      await guestAxios.delete('api/admin/whitelist/guest_whitelist_2')

      const rows = JSON.parse(localStorage.getItem('guest_whitelist'))
      expect(rows.find((row) => row.id === 'guest_whitelist_2').active).toBe(false)
    })

    it('re-admits a revoked address', async () => {
      const { data } = await guestAxios.patch('api/admin/whitelist/guest_whitelist_4', {
        active: true,
      })

      expect(data.active).toBe(true)
    })

    it('refuses an update that changes nothing', async () => {
      await expect(
        guestAxios.patch('api/admin/whitelist/guest_whitelist_2', {}),
      ).rejects.toMatchObject({ response: { status: 400 } })
    })

    it('is not reachable by ordinary accounts', async () => {
      asRole('USER')

      await expect(guestAxios.get('api/admin/whitelist')).rejects.toMatchObject({
        response: { status: 403 },
      })
    })
  })

  it('clears the whitelist with the rest of the guest storage', () => {
    clearGuestStorage()

    expect(localStorage.getItem('guest_whitelist')).toBeNull()
  })
})