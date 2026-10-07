<script setup>
/**
 * Reusable slide-over drawer / overlay.
 *
 * Renders an accessible modal panel that slides in from either edge, over a
 * dimming backdrop. Complements `BaseModal` (centred dialog) as the
 * edge-anchored sibling for navigation and side panels.
 *
 * Behaviour handled here so consumers stay presentational:
 * - teleports to <body> so it is never clipped by ancestors
 * - closes on backdrop click and on Escape
 * - locks body scroll while open
 * - animates in/out with a slide + fade
 */
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  /** Whether the drawer is open (use with `v-model`). */
  modelValue: {
    type: Boolean,
    required: true,
  },
  /** Edge the panel slides in from: left | right. */
  side: {
    type: String,
    default: 'left',
  },
  /** `full` stretches the panel to the whole viewport (full-screen menu). */
  full: {
    type: Boolean,
    default: false,
  },
  /** Accessible name for the dialog. */
  label: {
    type: String,
    default: '',
  },
  /** Extra classes for the panel (e.g. a theme gradient). */
  panelClass: {
    type: String,
    default: '',
  },
  /** Stacking utility, shared by backdrop and panel. */
  zIndex: {
    type: String,
    default: 'z-50',
  },
})

const emit = defineEmits(['update:modelValue', 'close'])

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', onKeydown)
      document.body.style.overflow = ''
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-over-fade">
      <div v-if="modelValue" class="slide-over-backdrop" :class="zIndex" @click="close"></div>
    </Transition>

    <Transition :name="`slide-over-${side}`">
      <aside
        v-if="modelValue"
        class="slide-over-panel"
        :class="[
          `slide-over-panel--${side}`,
          full ? 'slide-over-panel--fullscreen' : 'slide-over-panel--sidebar',
          panelClass,
          zIndex,
        ]"
        role="dialog"
        aria-modal="true"
        :aria-label="label"
      >
        <slot :close="close" />
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped></style>
