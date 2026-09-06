import axios from 'axios'
import { useNotificationStore } from '@/stores/notificationStore'

/**
 * Open5e Axios Instance
 *
 * Dedicated Axios instance for Open5e API v2 calls.
 * No auth headers needed for this public API.
 *
 * Response interceptor classifies transport and server errors into
 * user-facing notifications (timeout, 5xx, 429 rate-limiting), matching
 * the pattern established by api/lib/axios.js.
 *
 * Base URL: https://api.open5e.com/v2/
 */
const open5eAxios = axios.create({
  baseURL: 'https://api.open5e.com/v2/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor — classifies Open5e-specific errors into notifications
open5eAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    const notificationStore = useNotificationStore()

    // Network unreachable or timeout
    if (!error.response || error.code === 'ECONNABORTED') {
      notificationStore.addNotification(
        'The Open5e spell service is currently unreachable. Please try again later.',
        'warning',
      )
      error.handled = true
      return Promise.reject(error)
    }

    // Rate limiting
    if (error.response.status === 429) {
      notificationStore.addNotification(
        'Spell service rate limit reached. Please wait a moment and try again.',
        'warning',
      )
      error.handled = true
      return Promise.reject(error)
    }

    // Open5e server errors (5xx)
    if (error.response.status >= 500) {
      notificationStore.addNotification(
        'The Open5e spell service appears to be down. Please try again later.',
        'error',
      )
      error.handled = true
    }

    return Promise.reject(error)
  },
)

export default open5eAxios
