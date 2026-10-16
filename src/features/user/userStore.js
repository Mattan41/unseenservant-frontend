import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import UserService from '@/features/user/UserService.js'
import { getRoleLabel, isAdminRole } from '@/features/user/userUtils.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { useAuthStore } from '@/features/auth/authStore.js'
import { extractErrorMessage } from '@/utils/errorUtils.js'

/**
 * The signed-in profile (`GET /api/users/me`, or `guest_user` in guest mode).
 *
 * This store is the app's single owner of the current user: the header, the
 * settings view and the admin gate all read from here. `UserService.fetchUser`
 * (`GET /api/users/{id}`, admin-only) is deliberately not exposed as an action —
 * it would overwrite this store's user with somebody else's data.
 */
export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Computed
  const displayName = computed(
    () => currentUser.value?.displayName || currentUser.value?.username || 'Traveler',
  )

  /** Raw backend role (`USER` | `ADMIN`), or `null` while the profile loads. */
  const userRole = computed(() => currentUser.value?.role || null)

  /** Presentation label for the role (see `userUtils.js`). */
  const userRoleLabel = computed(() => getRoleLabel(userRole.value))

  /** Whether the account may use the admin endpoints (Settings → Admin). */
  const isAdmin = computed(() => isAdminRole(userRole.value))

  const userId = computed(() => currentUser.value?.id || null)

  const isUserLoaded = computed(() => currentUser.value !== null)

  // Actions
  async function fetchCurrentUser() {
    isLoading.value = true
    error.value = null

    try {
      // Check if in guest mode - return guest user from localStorage
      const authStore = useAuthStore()
      if (authStore.isGuest) {
        const guestUser = JSON.parse(localStorage.getItem('guest_user') || 'null')
        if (guestUser) {
          currentUser.value = guestUser
          return guestUser
        }
      }

      // Authenticated mode - fetch from backend
      const userData = await UserService.fetchCurrentUserInfo()
      currentUser.value = userData
      return userData
    } catch (err) {
      console.error('Failed to fetch current user:', err)
      error.value = 'Could not fetch user information.'
      currentUser.value = null
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateUserField(field, value) {
    if (!currentUser.value?.id) {
      throw new Error('No user loaded')
    }

    const notificationStore = useNotificationStore()
    isLoading.value = true
    error.value = null

    try {
      const updatedUser = await UserService.updateProfileField(currentUser.value.id, field, value)

      currentUser.value = { ...currentUser.value, ...updatedUser }

      notificationStore.addNotification(`Successfully updated ${field}.`, 'success')
      return true
    } catch (err) {
      let errorMessage = `Failed to update ${field}. Please try again.`

      if (err.response?.status === 409) {
        errorMessage = extractErrorMessage(err, `This ${field} is already taken`)
      }

      error.value = errorMessage
      notificationStore.addNotification(errorMessage, 'error')
      return false
    } finally {
      isLoading.value = false
    }
  }

  function clearUser() {
    currentUser.value = null
    error.value = null
    isLoading.value = false
  }

  return {
    // State
    currentUser,
    isLoading,
    error,
    // Computed
    displayName,
    userRole,
    userRoleLabel,
    isAdmin,
    userId,
    isUserLoaded,
    // Actions
    fetchCurrentUser,
    updateUserField,
    clearUser,
  }
})
