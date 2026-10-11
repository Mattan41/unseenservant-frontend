<script setup>
/**
 * Modal overlay + centering wrapper.
 *
 * Owns the behaviours every dialog needs, so call sites stay presentational:
 * - dimming backdrop that closes on click
 * - closes on Escape
 * - locks body scroll while mounted
 *
 * Call sites render it with `v-if`, so the lifecycle below doubles as the
 * open/close hook. The scroll lock is counted at module scope, so a dialog
 * stacked on top of another (e.g. an image editor opened from a form dialog)
 * cannot unlock the body early when it closes.
 */
import { onBeforeUnmount, onMounted } from 'vue'

defineProps({
  zIndex: {
    type: String,
    default: 'z-50',
  },
})

const emit = defineEmits(['close'])

/** Number of currently mounted modals; the body stays locked while it is > 0. */
let openModals = 0

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  openModals += 1
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  openModals = Math.max(0, openModals - 1)
  if (openModals === 0) {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <div
    class="fixed inset-0 flex items-center justify-center p-4 bg-black/50"
    :class="zIndex"
    @click.self="emit('close')"
  >
    <slot />
  </div>
</template>
