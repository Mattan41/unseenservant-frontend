/**
 * API Client - Central API layer
 *
 * This module provides a unified API interface that transparently switches
 * between backend (axios) and guest mode (localStorage) based on auth state.
 *
 * Design principle: Stores and Services call this module - they don't need to
 * know whether the app is in guest mode or authenticated mode.
 */

import axios from '@/api/lib/axios.js'
import guestAxios from '@/api/lib/guest-axios.js'
import open5eAxios from '@/api/lib/open5e-axios.js'
import { useAuthStore } from '@/features/auth/authStore'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if the app is in guest mode
 * @returns {boolean}
 */
function isGuestMode() {
  try {
    const authStore = useAuthStore()
    return authStore.isGuest || false
  } catch {
    return false
  }
}

// ============================================================================
// HTTP Methods
// ============================================================================

/**
 * GET request
 * Switches between axios (authenticated) and guestAxios (guest mode)
 * @param {string} url - API endpoint
 * @param {object} config - axios config
 * @returns {Promise} axios or guestAxios response
 */
export const get = (url, config) => {
  const client = isGuestMode() ? guestAxios : axios
  return client.get(url, config)
}

/**
 * POST request
 * Switches between axios (authenticated) and guestAxios (guest mode)
 * @param {string} url - API endpoint
 * @param {object} data - request body
 * @param {object} config - axios config
 * @returns {Promise} axios or guestAxios response
 */
export const post = (url, data, config) => {
  const client = isGuestMode() ? guestAxios : axios
  return client.post(url, data, config)
}

/**
 * PUT request
 * Switches between axios (authenticated) and guestAxios (guest mode)
 * @param {string} url - API endpoint
 * @param {object} data - request body
 * @param {object} config - axios config
 * @returns {Promise} axios or guestAxios response
 */
export const put = (url, data, config) => {
  const client = isGuestMode() ? guestAxios : axios
  return client.put(url, data, config)
}

/**
 * PATCH request
 * Switches between axios (authenticated) and guestAxios (guest mode)
 * @param {string} url - API endpoint
 * @param {object} data - request body
 * @param {object} config - axios config
 * @returns {Promise} axios or guestAxios response
 */
export const patch = (url, data, config) => {
  const client = isGuestMode() ? guestAxios : axios
  return client.patch(url, data, config)
}

/**
 * DELETE request
 * Switches between axios (authenticated) and guestAxios (guest mode)
 * @param {string} url - API endpoint
 * @param {object} config - axios config
 * @returns {Promise} axios or guestAxios response
 */
export const del = (url, config) => {
  const client = isGuestMode() ? guestAxios : axios
  return client.delete(url, config)
}

// ============================================================================
// Open5e External API Methods
// ============================================================================

/**
 * GET request to Open5e API (always uses real Axios — public API, no auth)
 * @param {string} url - API endpoint path (e.g., '/spells/')
 * @param {object} config - axios config with params
 * @returns {Promise} Axios response
 */
export const getOpen5e = (url, config) => {
  return open5eAxios.get(url, config)
}

/**
 * POST request to Open5e API (always uses real Axios — public API, no auth)
 * @param {string} url - API endpoint path
 * @param {object} data - request body
 * @param {object} config - axios config
 * @returns {Promise} Axios response
 */
export const postOpen5e = (url, data, config) => {
  return open5eAxios.post(url, data, config)
}

// Export as default object for convenience
export default {
  get,
  post,
  put,
  patch,
  delete: del,
  getOpen5e,
  postOpen5e,
}
