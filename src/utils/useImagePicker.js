import { onBeforeUnmount, ref } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { validateImageSize } from '@/utils/imageUpload.js'

/**
 * The "pick an image, reposition it, keep a preview" state machine shared by the
 * campaign and character editors.
 *
 * A picked file is checked against the upload limit before the reposition modal
 * opens, and the cropped file is checked again — the modal re-encodes to JPEG,
 * which can push a borderline file over the limit. Either failure is reported
 * through the notification store and nothing is selected.
 *
 * Returns `selectedFile` (what the form uploads on save), `previewUrl` (an
 * object URL for the local preview, released on unmount), the
 * `repositionFile` / `showRepositionModal` pair the modal is driven by, and the
 * three handlers the template binds to.
 */
export function useImagePicker() {
  const notificationStore = useNotificationStore()

  const selectedFile = ref(null)
  const previewUrl = ref(null)
  const repositionFile = ref(null)
  const showRepositionModal = ref(false)

  function handleImageChange(event) {
    const file = event.target.files[0]
    // Reset so selecting the same file again still fires a change event.
    event.target.value = ''
    if (!file) return

    const sizeError = validateImageSize(file)
    if (sizeError) {
      notificationStore.addNotification(sizeError, 'error')
      return
    }

    repositionFile.value = file
    showRepositionModal.value = true
  }

  function applyRepositionedImage(file) {
    const sizeError = validateImageSize(file)
    if (sizeError) {
      notificationStore.addNotification(sizeError, 'error')
      cancelReposition()
      return
    }

    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
    cancelReposition()
  }

  function cancelReposition() {
    repositionFile.value = null
    showRepositionModal.value = false
  }

  onBeforeUnmount(() => {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  })

  return {
    selectedFile,
    previewUrl,
    repositionFile,
    showRepositionModal,
    handleImageChange,
    applyRepositionedImage,
    cancelReposition,
  }
}
