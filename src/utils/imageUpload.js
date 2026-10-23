/** Mirrors the backend's app.upload.max-file-size (5MB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Checks a picked image against the upload limit before it is sent.
 *
 * @param {File} file
 * @returns {string|null} A sentence for the user, or null when the file is fine.
 */
export function validateImageSize(file) {
  if (file && file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `That image is ${mb} MB. The maximum is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`
  }
  return null
}
