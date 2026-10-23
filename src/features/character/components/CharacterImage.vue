<script setup>
/**
 * Character portrait with a placeholder fallback.
 *
 * The placeholder is the character's own system's art (`characterDefaultImage`)
 * — an Offworlders character shows the sci-fi portrait, 5e and system-less
 * characters the generic one — unless a caller passes `defaultSrc` of its own.
 * Video-game art of another kind (a ship, a preview) therefore stays the
 * caller's choice rather than something this component guesses.
 */
import { computed } from 'vue'
import { characterDefaultImage } from '@/features/character/dispatchers/systemRegistry.js'

const props = defineProps({
  src: String,
  alt: { type: String, default: '' },
  /** Explicit placeholder, used instead of the system's own. */
  defaultSrc: {
    type: String,
    default: '',
  },
  /** The character's game system, so its art can be chosen by meaning. */
  systemType: {
    type: String,
    default: null,
  },
})

const isAbsolute = (src) =>
  src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:')

/** The art to show when there is no image, or when one fails to load. */
const placeholderSrc = computed(() => props.defaultSrc || characterDefaultImage(props.systemType))

const fullSrc = computed(() => {
  if (!props.src) return placeholderSrc.value
  if (isAbsolute(props.src)) return props.src
  // Prefix with API URL for /images/ paths when API_BASE_URL is set
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (apiBaseUrl && props.src.startsWith('/images/')) {
    return `${apiBaseUrl}${props.src}`
  }
  return props.src
})

function showPlaceholder(event) {
  event.target.src = placeholderSrc.value
}
</script>

<template>
  <img :src="fullSrc" :alt="alt" :class="$attrs.class" @error="showPlaceholder" />
</template>
