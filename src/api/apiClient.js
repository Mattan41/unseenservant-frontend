import axios from '@/lib/axios.js'
import { useAuthStore } from '@/features/auth/authStore'

// Helper to check if in guest mode

function isGuestMode() {

  try {
    const authStore = useAuthStore()
    return authStore.isGuest || false
  } catch {
    return false
  }
}

// Helper to handle guest mode for write operations
function handleGuestWriteOperation() {
  if (isGuestMode()) {
    // Return null or empty response for write operations in guest mode
    return Promise.resolve(null)
  }
  return null
}

// HTTP methods with same signature as axios
export const get = (url, config) => {
  return axios.get(url, config)
}

export const post = (url, data, config) => {
  const guestResponse = handleGuestWriteOperation()
  if (guestResponse) return guestResponse

  return axios.post(url, data, config)
}

export const put = (url, data, config) => {
  const guestResponse = handleGuestWriteOperation()
  if (guestResponse) return guestResponse

  return axios.put(url, data, config)
}

export const patch = (url, data, config) => {
  const guestResponse = handleGuestWriteOperation()
  if (guestResponse) return guestResponse

  return axios.patch(url, data, config)
}

export const del = (url, config) => {
  const guestResponse = handleGuestWriteOperation()
  if (guestResponse) return guestResponse

  return axios.delete(url, config)
}

// Export as default object for convenience
export default {
  get,
  post,
  put,
  patch,
  delete: del,
}
