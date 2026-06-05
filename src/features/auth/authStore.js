import AuthService from '@/features/auth/AuthService.js'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { guestUser, guestUsers, guestCharacters, guestCampaigns } from '@/data/demoData.js'
import { useUserStore } from '@/features/user/userStore.js'

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
      localStorage.setItem('guest_user', JSON.stringify(guestUser))
      localStorage.setItem('guest_users', JSON.stringify(guestUsers))
      localStorage.setItem('guest_characters', JSON.stringify(guestCharacters))
      localStorage.setItem('guest_campaigns', JSON.stringify(guestCampaigns))

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
    localStorage.removeItem('guest_user')
    localStorage.removeItem('guest_users')
    localStorage.removeItem('guest_characters')
    localStorage.removeItem('guest_campaigns')

    // Clear user state when leaving guest session
    const userStore = useUserStore()
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
