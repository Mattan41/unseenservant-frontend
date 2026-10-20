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
 * - closes on backdrop click — the backdrop is a native button, so that
 *   affordance is reachable and operable by keyboard too — and on Escape
 * - locks body scroll while open, through the shared counted lock in
 *   `utils/bodyScrollLock.js` (a drawer over an open dialog cannot unlock the
 *   body early on close)
 * - animates in/out with a slide + fade
 */
import { computed, onBeforeUnmount, watch } from 'vue'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock.js'

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

/** Accessible name for the backdrop's close affordance. */
const backdropLabel = computed(() => (props.label ? `Close ${props.label}` : 'Close'))

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

/** Whether this drawer currently holds the shared body scroll lock. */
let holdsBodyLock = false

function setBodyLock(locked) {
  if (locked === holdsBodyLock) return
  holdsBodyLock = locked
  if (locked) lockBodyScroll()
  else unlockBodyScroll()
}

// `immediate`, so a drawer mounted already open answers Escape and locks the
// body too; the watcher doubles as the open/close hook.
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown)
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
    setBodyLock(isOpen)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  setBodyLock(false)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-over-fade">
      <button
        v-if="modelValue"
        type="button"
        class="slide-over-backdrop"
        :class="zIndex"
        :aria-label="backdropLabel"
        @click="close"
      ></button>
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
