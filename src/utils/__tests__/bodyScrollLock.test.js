import { describe, it, expect, afterEach } from 'vitest'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock.js'

afterEach(() => {
  // Never leave a lock behind for the next test.
  document.body.style.overflow = ''
})

describe('bodyScrollLock', () => {
  it('keeps the body locked until the last overlay releases it', () => {
    lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')

    // A second overlay (a drawer over a dialog) takes the lock as well.
    lockBodyScroll()
    unlockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')

    unlockBodyScroll()
    expect(document.body.style.overflow).toBe('')
  })

  it('never unlocks past the first release', () => {
    unlockBodyScroll()

    expect(document.body.style.overflow).toBe('')
  })
})
