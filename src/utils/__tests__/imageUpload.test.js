import { describe, it, expect } from 'vitest'
import { validateImageSize } from '@/utils/imageUpload.js'

/** The same limit the backend enforces via app.upload.max-file-size. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function imageOfSize(bytes) {
  return new File([new Uint8Array(bytes)], 'x.png')
}

describe('validateImageSize', () => {
  it('accepts a one-byte image', () => {
    expect(validateImageSize(imageOfSize(1))).toBeNull()
  })

  it('accepts an image exactly at the limit', () => {
    expect(validateImageSize(imageOfSize(MAX_IMAGE_BYTES))).toBeNull()
  })

  it('rejects an image one byte over the limit', () => {
    const error = validateImageSize(imageOfSize(MAX_IMAGE_BYTES + 1))

    expect(error).toEqual(expect.stringContaining('maximum'))
  })

  it('accepts a missing file', () => {
    expect(validateImageSize(undefined)).toBeNull()
    expect(validateImageSize(null)).toBeNull()
  })
})
