import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useImageLightbox } from '@/utils/useImageLightbox.js'

/**
 * Mount a host component so the composable runs in a real setup (it registers
 * mount/unmount hooks for the window key listener) and hand its bindings back.
 */
function mountLightbox() {
  const lightbox = {}
  const Host = defineComponent({
    setup() {
      Object.assign(lightbox, useImageLightbox())
      return () => h('div')
    },
  })
  const wrapper = mount(Host)
  return { lightbox, wrapper }
}

describe('useImageLightbox', () => {
  it('opens a captioned set and steps with wrap-around', () => {
    const { lightbox } = mountLightbox()
    lightbox.open('/a.png', ['/a.png', '/b.png'], 'Kestrel')

    expect(lightbox.lightboxUrl.value).toBe('/a.png')
    expect(lightbox.lightboxLabel.value).toBe('Kestrel')
    expect(lightbox.hasMultiple.value).toBe(true)

    lightbox.showPrevious()
    expect(lightbox.lightboxUrl.value).toBe('/b.png')
    lightbox.showNext()
    expect(lightbox.lightboxUrl.value).toBe('/a.png')
  })

  it('gives a lone picture a one-image set to step in', () => {
    const { lightbox } = mountLightbox()
    lightbox.open('/only.png', [], 'Doc')

    expect(lightbox.lightboxImages.value).toEqual(['/only.png'])
    expect(lightbox.hasMultiple.value).toBe(false)
  })

  it('closes and forgets the set', () => {
    const { lightbox } = mountLightbox()
    lightbox.open('/a.png', ['/a.png'], 'X')

    lightbox.close()

    expect(lightbox.isOpen.value).toBe(false)
    expect(lightbox.lightboxUrl.value).toBeNull()
    expect(lightbox.lightboxImages.value).toEqual([])
  })

  it('steps with the arrow keys, but only while something is open', () => {
    const { lightbox } = mountLightbox()
    const event = (key) => ({ key, preventDefault: () => {} })

    // Closed: the arrow does nothing (and does not throw).
    lightbox.onKeydown(event('ArrowRight'))
    expect(lightbox.lightboxUrl.value).toBeNull()

    lightbox.open('/a.png', ['/a.png', '/b.png'], 'X')
    lightbox.onKeydown(event('ArrowRight'))
    expect(lightbox.lightboxUrl.value).toBe('/b.png')
  })
})
