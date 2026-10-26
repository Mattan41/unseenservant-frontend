<script setup>
/**
 * Campaign image with a placeholder fallback.
 *
 * The placeholder is the campaign's primary system's art
 * (`campaignDefaultImage`) — an Offworlders campaign shows the sci-fi art, 5e
 * and system-less campaigns the generic one. A caller that is not showing a
 * campaign (the ship's profile image and gallery) passes its own `defaultSrc`;
 * a character's own pictures use `CharacterImage`, whose placeholder follows the
 * character's system.
 */
import { computed } from 'vue'
import { campaignDefaultImage } from '@/features/campaign/campaignSystems.js'

const props = defineProps({
  src: String,
  alt: { type: String, default: '' },
  /** Explicit placeholder, used instead of the primary system's own. */
  defaultSrc: {
    type: String,
    default: '',
  },
  /** The campaign's `primarySystem`, so its art can be chosen by meaning. */
  systemType: {
    type: String,
    default: null,
  },
})

const isAbsolute = (src) =>
  src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:')

/** The art to show when there is no image, or when one fails to load. */
const placeholderSrc = computed(() => props.defaultSrc || campaignDefaultImage(props.systemType))

const fullSrc = computed(() => {
  if (!props.src) return placeholderSrc.value
  if (isAbsolute(props.src)) return props.src
  if (import.meta.env.DEV && props.src.startsWith('/images/')) {
    return `${import.meta.env.VITE_API_BASE_URL}${props.src}`
  }
  return props.src
})

function showPlaceholder(event) {
  event.target.src = placeholderSrc.value
}

// Export for useage in background-image
defineExpose({ fullSrc })
</script>

<template>
  <img :src="fullSrc" :alt="alt" :class="$attrs.class" @error="showPlaceholder" />
</template>
