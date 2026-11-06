import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomToken } from '@/utils/randomId.js'

describe('randomToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a distinct token every time', () => {
    expect(randomToken()).not.toBe(randomToken())
  })

  it('falls back to random bytes when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes) => {
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = i
        return bytes
      },
    })

    expect(randomToken()).toMatch(/^[0-9a-f]{16}$/)
  })
})
