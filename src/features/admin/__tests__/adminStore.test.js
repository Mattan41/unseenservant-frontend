import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAdminStore } from '@/features/admin/adminStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import AdminService from '@/features/admin/AdminService.js'

vi.mock('@/features/admin/AdminService.js', () => ({
  default: {
    fetchUsers: vi.fn(),
    updateUserRole: vi.fn(),
    fetchWhitelist: vi.fn(),
    addWhitelistEntry: vi.fn(),
    updateWhitelistEntry: vi.fn(),
    removeWhitelistEntry: vi.fn(),
  },
}))

const ADMIN = {
  id: 1,
  username: 'admin',
  displayName: 'Admin',
  email: 'a@example.com',
  role: 'ADMIN',
}
const MEMBER = {
  id: 2,
  username: 'member',
  displayName: 'Member',
  email: 'm@example.com',
  role: 'USER',
}

describe('adminStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // The signed-in administrator is account 1.
    useUserStore().currentUser = ADMIN
  })

  describe('canChangeRole', () => {
    it('refuses the caller their own role', () => {
      const store = useAdminStore()
      store.users = [ADMIN, MEMBER]

      expect(store.isSelf(ADMIN)).toBe(true)
      expect(store.canChangeRole(ADMIN)).toBe(false)
    })

    it('refuses demoting the last administrator', () => {
      const store = useAdminStore()
      store.users = [ADMIN]

      expect(store.adminCount).toBe(1)
      expect(store.canChangeRole(ADMIN)).toBe(false)
    })

    it('allows demoting an administrator while another remains', () => {
      const store = useAdminStore()
      const second = { ...ADMIN, id: 3, email: 'b@example.com' }
      store.users = [ADMIN, second]

      expect(store.canChangeRole(second)).toBe(true)
    })

    it('allows promoting an ordinary account', () => {
      const store = useAdminStore()
      store.users = [ADMIN, MEMBER]

      expect(store.canChangeRole(MEMBER)).toBe(true)
    })
  })

  describe('changeUserRole', () => {
    it('replaces the stored row on success', async () => {
      const store = useAdminStore()
      store.users = [ADMIN, MEMBER]
      const promoted = { ...MEMBER, role: 'ADMIN' }
      AdminService.updateUserRole.mockResolvedValue(promoted)

      await expect(store.changeUserRole(MEMBER.id, 'ADMIN')).resolves.toBe(true)
      expect(AdminService.updateUserRole).toHaveBeenCalledWith(MEMBER.id, 'ADMIN')
      expect(store.users[1]).toEqual(promoted)
      expect(store.savingId).toBeNull()
    })

    it('reports failure and leaves the list untouched', async () => {
      const store = useAdminStore()
      store.users = [ADMIN, MEMBER]
      AdminService.updateUserRole.mockRejectedValue({ response: { status: 400 } })

      await expect(store.changeUserRole(MEMBER.id, 'ADMIN')).resolves.toBe(false)
      expect(store.users[1]).toEqual(MEMBER)
      expect(store.savingId).toBeNull()
    })
  })

  describe('whitelist', () => {
    it('appends a newly admitted address', async () => {
      const store = useAdminStore()
      store.whitelist = []
      AdminService.addWhitelistEntry.mockResolvedValue({
        id: 5,
        email: 'new@example.com',
        role: 'USER',
        active: true,
      })

      await expect(store.addWhitelistEntry('new@example.com', 'USER')).resolves.toBe(true)
      expect(store.whitelist).toHaveLength(1)
    })

    it('replaces the row a revoked address belongs to', async () => {
      const store = useAdminStore()
      store.whitelist = [{ id: 5, email: 'back@example.com', role: 'USER', active: false }]
      AdminService.addWhitelistEntry.mockResolvedValue({
        id: 5,
        email: 'back@example.com',
        role: 'ADMIN',
        active: true,
      })

      await store.addWhitelistEntry('back@example.com', 'ADMIN')

      expect(store.whitelist).toHaveLength(1)
      expect(store.whitelist[0]).toMatchObject({ role: 'ADMIN', active: true })
    })

    it('marks a revoked address inactive instead of dropping it', async () => {
      const store = useAdminStore()
      store.whitelist = [{ id: 5, email: 'gone@example.com', role: 'USER', active: true }]
      AdminService.removeWhitelistEntry.mockResolvedValue(undefined)

      await expect(store.revokeWhitelistEntry(5)).resolves.toBe(true)
      expect(store.whitelist).toHaveLength(1)
      expect(store.whitelist[0].active).toBe(false)
    })
  })
})
