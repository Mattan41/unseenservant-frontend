/**
 * Extracts a human-readable error message from an Axios error.
 * Handles string responses, JSON objects with a message field, and fallbacks.
 */
export function extractErrorMessage(error, fallback = 'Something went wrong.') {
  if (error?.response?.data) {
    const data = error.response.data
    return typeof data === 'string' ? data : data.message || fallback
  }
  return fallback
}
