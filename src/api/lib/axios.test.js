import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import axios from '@/api/lib/axios.js'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'

/**
 * The interceptor's throttle branch: not a logout, not a server fault, and never
 * the HTML error page nginx sends with it. See docs/DEPLOYMENT.md#rate-limiting.
 */
describe('axios response interceptor', () => {
  const originalAdapter = axios.defaults.adapter

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    axios.defaults.adapter = originalAdapter
  })

  /** Rejects every request the way an adapter would, with the given status. */
  const respondWith = (status, data) => {
    axios.defaults.adapter = () =>
      Promise.reject({ isAxiosError: true, response: { status, data, headers: {} } })
  }

  it('reports a throttle without signing the user out', async () => {
    const authStore = useAuthStore()
    authStore.setToken('a-valid-token')

    respondWith(429, '<html><body>429 Too Many Requests</body></html>')

    await expect(axios.post('/api/auth/login', {})).rejects.toBeDefined()

    const notifications = useNotificationStore().notifications
    expect(notifications).toHaveLength(1)
    expect(notifications[0].type).toBe('warning')
    expect(notifications[0].message).toBe('Too many requests. Please wait a moment and try again.')
    // The session has to survive: a throttle is not an expired token.
    expect(localStorage.getItem('auth_token')).toBe('a-valid-token')
    expect(authStore.isAuthenticated).toBe(true)
  })

  it('reports a server fault as an error', async () => {
    respondWith(500, 'boom')

    await expect(axios.get('/api/campaigns')).rejects.toBeDefined()

    const notifications = useNotificationStore().notifications
    expect(notifications).toHaveLength(1)
    expect(notifications[0].type).toBe('error')
  })

  it('stays silent on a 401 for a visitor who never signed in', async () => {
    respondWith(401, 'Unauthorized')

    await expect(axios.get('/api/auth/me')).rejects.toBeDefined()

    expect(useNotificationStore().notifications).toHaveLength(0)
  })
})
