import Axios from 'axios'
import { useAuthStore } from '@/features/auth/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { extractErrorMessage } from '@/utils/errorUtils'

const rawBase = import.meta.env.VITE_API_BASE_URL ?? ''
const normalizedBase = rawBase ? (rawBase.endsWith('/') ? rawBase : `${rawBase}/`) : '/'

const axios = Axios.create({
  baseURL: normalizedBase,
  timeout: 60000,
})

// Request interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')

    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      const notificationStore = useNotificationStore()

      if (authStore.isAuthenticated) {
        notificationStore.addNotification(
          'Your session has expired. Please log in again.',
          'warning',
          3000,
        )
      }
      authStore.clearAuth()
    }

    if (error.response?.status === 403) {
      const notificationStore = useNotificationStore()
      notificationStore.addNotification(
        extractErrorMessage(error, 'You do not have permission to perform this action.'),
        'warning',
      )
      error.handled = true
    }

    if (error.response?.status >= 500) {
      const notificationStore = useNotificationStore()
      notificationStore.addNotification(
        'Something went wrong on the server. Please try again.',
        'error',
      )
      error.handled = true
    }

    return Promise.reject(error)
  },
)

export default axios
