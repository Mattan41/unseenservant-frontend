/**
 * Extracts a human-readable error message from an Axios error.
 *
 * The backend answers with an RFC 9457 ProblemDetail, whose sentence lives in
 * `detail`. Two other shapes are still handled: a plain string body (nginx and
 * the guest/demo layer) and `message`, which older responses and the guest
 * layer use. The order matters — `detail` first, so the backend's wording wins.
 */
export function extractErrorMessage(error, fallback = 'Something went wrong.') {
  if (error?.response?.data) {
    const data = error.response.data
    if (typeof data === 'string') return data
    return data.detail || data.message || fallback
  }
  return fallback
}

/**
 * The request field a validation error points at, when the backend named one.
 * Returns null when the error is not tied to a single input.
 */
export function extractErrorField(error) {
  const field = error?.response?.data?.field
  return typeof field === 'string' ? field : null
}
