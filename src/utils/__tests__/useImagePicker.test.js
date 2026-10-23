import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useImagePicker } from '@/utils/useImagePicker.js'
import { useNotificationStore } from '@/stores/notificationStore.js'

const OVERSIZED_BYTES = 5 * 1024 * 1024 + 1

/**
 * Mount a host component so the composable runs in a real setup (it registers an
 * unmount hook) and hand its bindings back to the test.
 */
function mountPicker() {
  const picker = {}
  const Host = defineComponent({
    setup() {
      Object.assign(picker, useImagePicker())
      return () => h('div')
    },
  })
  const wrapper = mount(Host)
  return { picker, wrapper }
}

/** The change event a file input produces, with the picked file on it. */
function changeEvent(file) {
  return { target: { files: file ? [file] : [], value: 'x.png' } }
}

describe('useImagePicker', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  it('opens the reposition modal for a file within the limit', () => {
    const { picker } = mountPicker()
    const file = new File([new Uint8Array(1)], 'x.png')

    picker.handleImageChange(changeEvent(file))

    expect(picker.repositionFile.value).toBe(file)
    expect(picker.showRepositionModal.value).toBe(true)
    expect(useNotificationStore().notifications).toHaveLength(0)
  })

  it('reports an oversized file and selects nothing', () => {
    const { picker } = mountPicker()

    picker.handleImageChange(changeEvent(new File([new Uint8Array(OVERSIZED_BYTES)], 'x.png')))

    expect(picker.repositionFile.value).toBeNull()
    expect(picker.showRepositionModal.value).toBe(false)
    const notifications = useNotificationStore().notifications
    expect(notifications).toHaveLength(1)
    expect(notifications[0].type).toBe('error')
    expect(notifications[0].message).toContain('maximum')
  })

  it('ignores a change event without a file', () => {
    const { picker } = mountPicker()

    picker.handleImageChange(changeEvent(null))

    expect(picker.repositionFile.value).toBeNull()
    expect(picker.showRepositionModal.value).toBe(false)
  })

  it('keeps the cropped file and shows it as the preview', () => {
    const { picker } = mountPicker()
    const cropped = new File([new Uint8Array(1)], 'x.jpg')

    picker.applyRepositionedImage(cropped)

    expect(picker.selectedFile.value).toBe(cropped)
    expect(picker.previewUrl.value).toBe('blob:preview')
    expect(picker.showRepositionModal.value).toBe(false)
    expect(useNotificationStore().notifications).toHaveLength(0)
  })

  it('rejects a cropped file that the re-encode pushed over the limit', () => {
    const { picker } = mountPicker()
    const cropped = new File([new Uint8Array(OVERSIZED_BYTES)], 'x.jpg')
    picker.repositionFile.value = cropped
    picker.showRepositionModal.value = true

    picker.applyRepositionedImage(cropped)

    expect(picker.selectedFile.value).toBeNull()
    expect(picker.showRepositionModal.value).toBe(false)
    expect(useNotificationStore().notifications[0].type).toBe('error')
  })

  it('releases the preview object URL when the host unmounts', () => {
    const { picker, wrapper } = mountPicker()
    picker.applyRepositionedImage(new File([new Uint8Array(1)], 'x.jpg'))

    wrapper.unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
})
