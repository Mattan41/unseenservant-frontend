<script setup>
/**
 * Modal overlay + centering wrapper.
 *
 * Owns the behaviours every dialog needs, so call sites stay presentational:
 * - dimming backdrop that closes on click (and on Enter/Space, it is a button)
 * - closes on Escape
 * - locks body scroll while mounted (through the shared, counted lock in
 *   `utils/bodyScrollLock.js`, so a dialog stacked on top of another — e.g. an
 *   image editor opened from a form dialog — cannot unlock the body early)
 *
 * Call sites render it with `v-if`, so the lifecycle below doubles as the
 * open/close hook.
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock.js'

defineProps({
  zIndex: {
    type: String,
    default: 'z-50',
  },
})

const emit = defineEmits(['close'])

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  lockBodyScroll()
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  unlockBodyScroll()
})
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center p-4 bg-black/50" :class="zIndex">
    <!-- The scrim doubles as the close-on-outside-click affordance, as a native
         button rather than a clickable div: click-to-close is then reachable
         and operable by keyboard (Enter/Space) too. `-z-10` paints it under the
         panel, which is safe because the overlay's z-index makes it a stacking
         context; it is invisible because the dimming colour sits on the
         overlay and preflight leaves a button's own background transparent. -->
    <button
      type="button"
      class="absolute inset-0 -z-10"
      aria-label="Close dialog"
      @click="emit('close')"
    ></button>
    <slot />
  </div>
</template>
