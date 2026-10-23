import { describe, it, expect } from 'vitest'
import { extractErrorMessage, extractErrorField } from '@/utils/errorUtils.js'

/** Builds the error shape Axios hands to a caller. */
function axiosError(data) {
  return { response: { data } }
}

describe('extractErrorMessage', () => {
  it('reads detail from a ProblemDetail body', () => {
    const error = axiosError({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Character not found with id: 999',
      instance: '/api/characters/999',
    })

    expect(extractErrorMessage(error)).toBe('Character not found with id: 999')
  })

  it('prefers detail over message when both are present', () => {
    const error = axiosError({ detail: 'From detail', message: 'From message' })

    expect(extractErrorMessage(error)).toBe('From detail')
  })

  it('falls back to message when detail is absent', () => {
    expect(extractErrorMessage(axiosError({ message: 'From message' }))).toBe('From message')
  })

  it('returns a plain string body as-is', () => {
    expect(extractErrorMessage(axiosError('Invalid username or password'))).toBe(
      'Invalid username or password',
    )
  })

  it('uses the fallback for an empty or missing body', () => {
    expect(extractErrorMessage(axiosError({}), 'Fallback text')).toBe('Fallback text')
    expect(extractErrorMessage({}, 'Fallback text')).toBe('Fallback text')
    expect(extractErrorMessage(undefined, 'Fallback text')).toBe('Fallback text')
  })

  it('keeps the default fallback when none is given', () => {
    expect(extractErrorMessage({})).toBe('Something went wrong.')
  })

  it('leaves the guest-mode shape working', () => {
    // guest-axios rejects with an Axios-like error carrying a message body.
    expect(extractErrorMessage(axiosError({ message: 'Not a campaign participant' }))).toBe(
      'Not a campaign participant',
    )
  })
})

describe('extractErrorField', () => {
  it('returns the field a validation error points at', () => {
    expect(extractErrorField(axiosError({ detail: 'Too long', field: 'displayName' }))).toBe(
      'displayName',
    )
  })

  it('returns null when the backend named no field', () => {
    expect(extractErrorField(axiosError({ detail: 'Character not found' }))).toBeNull()
    expect(extractErrorField(axiosError('plain text'))).toBeNull()
    expect(extractErrorField(undefined)).toBeNull()
  })
})
