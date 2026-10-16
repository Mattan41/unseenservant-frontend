import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import AdminService from '@/features/admin/AdminService.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { isAdminRole } from '@/features/user/userUtils.js'
import { extractErrorMessage } from '@/utils/errorUtils.js'

/**
 * Admin surface state: the account list and the email whitelist.
 *
 * Loaded on demand when the Admin settings section is opened (never at app
 * start), and only reachable by an administrator — the backend refuses every
 * call with a 403 otherwise.
 *
 * The two rules the backend enforces are mirrored here so the buttons are
 * pointed the right way before a request is made (you cannot change your own
 * role, and the last administrator cannot be demoted); the backend stays the
 * authority, and its message is surfaced when a rule is hit anyway.
 */
export const useAdminStore = defineStore('admin', () => {
  const users = ref([])
  const whitelist = ref([])
  const isLoadingUsers = ref(false)
  const isLoadingWhitelist = ref(false)
  /** Id of the row currently being saved, so only that row's controls disable. */
  const savingId = ref(null)

  const adminCount = computed(() => users.value.filter((user) => isAdminRole(user.role)).length)

  const currentUserId = computed(() => useUserStore().userId)

  const isSelf = (user) => !!user && String(user.id) === String(currentUserId.value)

  /**
   * Whether this account's role may be changed from the UI.
   *
   * @returns {boolean}
   */
  function canChangeRole(user) {
    if (!user) return false
    if (isSelf(user)) return false
    if (isAdminRole(user.role) && adminCount.value <= 1) return false
    return true
  }

  function handleError(error, fallback) {
    if (error?.handled) return
    useNotificationStore().addNotification(extractErrorMessage(error, fallback), 'error')
  }

  async function fetchUsers() {
    isLoadingUsers.value = true
    try {
      users.value = await AdminService.fetchUsers()
    } catch (error) {
      console.error('Failed to fetch users:', error)
      handleError(error, 'Could not load the user list.')
    } finally {
      isLoadingUsers.value = false
    }
  }

  async function fetchWhitelist() {
    isLoadingWhitelist.value = true
    try {
      whitelist.value = await AdminService.fetchWhitelist()
    } catch (error) {
      console.error('Failed to fetch the whitelist:', error)
      handleError(error, 'Could not load the email whitelist.')
    } finally {
      isLoadingWhitelist.value = false
    }
  }

  /** Load both halves of the Admin section. */
  async function fetchAll() {
    await Promise.all([fetchUsers(), fetchWhitelist()])
  }

  /** Change one account's role, replacing the stored row on success. */
  async function changeUserRole(userId, role) {
    savingId.value = userId
    try {
      const updated = await AdminService.updateUserRole(userId, role)
      const index = users.value.findIndex((user) => String(user.id) === String(userId))
      if (index !== -1) users.value[index] = updated
      const name = updated.displayName || updated.username
      const label = role === 'ADMIN' ? 'an administrator' : 'a standard user'
      useNotificationStore().addNotification(`${name} is now ${label}.`, 'success')
      return true
    } catch (error) {
      console.error('Failed to change the role:', error)
      handleError(error, 'Could not change that account role.')
      return false
    } finally {
      savingId.value = null
    }
  }

  /** Admit an address; a revoked address is re-activated by the backend. */
  async function addWhitelistEntry(email, role) {
    try {
      const entry = await AdminService.addWhitelistEntry(email, role)
      const index = whitelist.value.findIndex((row) => row.id === entry.id)
      if (index === -1) {
        whitelist.value = [...whitelist.value, entry]
      } else {
        whitelist.value[index] = entry
      }
      useNotificationStore().addNotification(`${entry.email} can log in.`, 'success')
      return true
    } catch (error) {
      console.error('Failed to add a whitelist entry:', error)
      handleError(error, 'Could not add that address to the whitelist.')
      return false
    }
  }

  /** Re-role or re-admit an existing row. */
  async function updateWhitelistEntry(id, patch) {
    savingId.value = id
    try {
      const entry = await AdminService.updateWhitelistEntry(id, patch)
      const index = whitelist.value.findIndex((row) => row.id === id)
      if (index !== -1) whitelist.value[index] = entry
      return true
    } catch (error) {
      console.error('Failed to update a whitelist entry:', error)
      handleError(error, 'Could not update that address.')
      return false
    } finally {
      savingId.value = null
    }
  }

  /**
   * Revoke an address. The backend soft-deletes: the row stays visible so the
   * decision can be revisited, which is why it is not removed from the list.
   */
  async function revokeWhitelistEntry(id) {
    savingId.value = id
    try {
      await AdminService.removeWhitelistEntry(id)
      const index = whitelist.value.findIndex((row) => row.id === id)
      if (index !== -1) whitelist.value[index] = { ...whitelist.value[index], active: false }
      useNotificationStore().addNotification('That address can no longer log in.', 'success')
      return true
    } catch (error) {
      console.error('Failed to revoke a whitelist entry:', error)
      handleError(error, 'Could not revoke that address.')
      return false
    } finally {
      savingId.value = null
    }
  }

  return {
    // State
    users,
    whitelist,
    isLoadingUsers,
    isLoadingWhitelist,
    savingId,
    // Computed
    adminCount,
    currentUserId,
    // Helpers
    isSelf,
    canChangeRole,
    // Actions
    fetchAll,
    fetchUsers,
    fetchWhitelist,
    changeUserRole,
    addWhitelistEntry,
    updateWhitelistEntry,
    revokeWhitelistEntry,
  }
})