import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * The "open one set of images, step through it, close" state machine shared by
 * the character gallery lightbox and the ship's.
 *
 * Each caller gets its own instance, so the ship's lightbox state is never
 * shared with a character's — the two step through their own sets. Keyboard
 * navigation (←/→) is registered on the window while the host is mounted, and
 * only acts while something is open; Escape stays the modal's own concern
 * (`BaseModal`).
 */
export function useImageLightbox() {
  const lightboxUrl = ref(null)
  const lightboxImages = ref([])
  const lightboxLabel = ref('')

  const isOpen = computed(() => lightboxUrl.value !== null)
  const hasMultiple = computed(() => lightboxImages.value.length > 1)

  /** Open one set of images, captioned with `label`. */
  function open(url, images = [], label = '') {
    lightboxUrl.value = url
    // A lone picture (a character with one image) still needs a set to step in.
    lightboxImages.value = images.length ? [...images] : [url]
    lightboxLabel.value = label
  }

  function close() {
    lightboxUrl.value = null
    lightboxImages.value = []
    lightboxLabel.value = ''
  }

  /**
   * Step to the previous/next image, wrapping around at the ends. The set is the
   * one the picture was opened from (the ship's, or a character's).
   */
  function step(offset) {
    const images = lightboxImages.value
    const index = images.indexOf(lightboxUrl.value)
    if (index === -1) return
    lightboxUrl.value = images[(index + offset + images.length) % images.length]
  }

  const showPrevious = () => step(-1)
  const showNext = () => step(1)

  /** Arrow-key navigation while a lightbox is open. */
  function onKeydown(event) {
    if (!lightboxUrl.value) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      showPrevious()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      showNext()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

  return {
    lightboxUrl,
    lightboxImages,
    lightboxLabel,
    isOpen,
    hasMultiple,
    open,
    close,
    step,
    showPrevious,
    showNext,
    onKeydown,
  }
}
