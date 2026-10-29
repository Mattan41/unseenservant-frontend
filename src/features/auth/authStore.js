import AuthService from '@/features/auth/AuthService.js'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { seedGuestStorage, clearGuestStorage } from '@/data/demoData.js'
import { useUserStore } from '@/features/user/userStore.js'
import { clearViewHistory } from '@/utils/viewHistory.js'
import { clearSectionSeen } from '@/utils/sectionSeen.js'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('auth_token'))
  const authStatus = ref(token.value ? 'authenticated' : 'idle')
  const isInitializing = ref(false)
  const isAuthChecked = ref(false)
  const isGuest = ref(false)

  const isAuthenticated = computed(() => authStatus.value === 'authenticated' && !isGuest.value)

  function setToken(newToken) {
    if (newToken && isGuest.value) {
      exitGuestMode()
    }

    token.value = newToken
    if (newToken) {
      localStorage.setItem('auth_token', newToken)
      authStatus.value = 'authenticated'
    } else {
      localStorage.removeItem('auth_token')
      authStatus.value = 'unauthenticated'
    }
  }

  async function initializeAuth() {
    console.log('Starting auth check...')
    if (isAuthChecked.value || isInitializing.value) return

    if (!token.value) {
      console.log('No token found, checking for active guest session...')
      if (localStorage.getItem('guest_user')) {
        isGuest.value = true
        authStatus.value = 'unauthenticated'

        // Sync userStore state on page refresh during guest session
        const userStore = useUserStore()
        userStore.fetchCurrentUser()
      } else {
        authStatus.value = 'unauthenticated'
      }
      isAuthChecked.value = true
      return
    }

    isInitializing.value = true
    try {
      console.log('Fetching user from backend...')
      const userData = await AuthService.getCurrentUser()
      authStatus.value = userData ? 'authenticated' : 'unauthenticated'
    } catch (err) {
      console.error('Auth verification failed:', err)
      clearAuth()
    } finally {
      isAuthChecked.value = true
      isInitializing.value = false
      console.log('Auth check complete.')
    }
  }

  function handleOAuthRedirect(tokenFromUrl) {
    setToken(tokenFromUrl)
  }

  function clearAuth() {
    setToken(null)
    localStorage.removeItem('userData')
    isAuthChecked.value = true
  }

  /**
   * Enters guest mode and seeds localStorage synchronously using demoData.js
   */
  function enterGuestMode() {
    try {
      // Writes the full demo set (characters, campaigns, ships, messages) so a
      // re-entry always yields a complete, fresh dataset.
      seedGuestStorage()

      console.log('[AuthStore] Guest mode: Demo data loaded synchronously from demoData.js')
    } catch (error) {
      console.error('[AuthStore] Failed to store guest data:', error)
    }

    clearAuth()
    isGuest.value = true

    // Synchronize userStore immediately when entering guest mode
    const userStore = useUserStore()
    userStore.fetchCurrentUser()
  }

  /**
   * Exits guest mode and scrubs all guest keys clean
   */
  function exitGuestMode() {
    isGuest.value = false
    clearGuestStorage()

    // Clear user state when leaving guest session. The view history goes with
    // it, so the demo session leaves nothing behind in localStorage — but only
    // when the guest's id is known: `clearViewHistory()` without one clears
    // every user's history, real accounts included. The section-seen markers are
    // per user in the same way, and are cleared on the same terms.
    const userStore = useUserStore()
    if (userStore.userId) {
      clearViewHistory(userStore.userId)
      clearSectionSeen(userStore.userId)
    }
    userStore.clearUser()

    console.log('[AuthStore] Exited guest mode and cleared storage')
  }

  async function logout() {
    if (isGuest.value) {
      exitGuestMode()
    } else {
      clearAuth()
    }
  }

  async function loginWithGoogle() {
    return AuthService.loginWithGoogle()
  }

  async function loginWithGithub() {
    return AuthService.loginWithGithub()
  }

  async function login(username, password) {
    const data = await AuthService.loginWithUsernamePassword(username, password)
    setToken(data.token)
    return data
  }

  return {
    // State & Computed
    token,
    authStatus,
    isAuthChecked,
    isAuthenticated,
    isGuest,

    // Actions
    initializeAuth,
    loginWithGoogle,
    loginWithGithub,
    login,
    handleOAuthRedirect,
    logout,
    clearAuth,
    setToken,
    enterGuestMode,
    exitGuestMode,
  }
})
