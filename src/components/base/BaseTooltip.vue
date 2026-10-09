<script setup>
/**
 * Inline info tooltip.
 *
 * The slot content IS the trigger (usually the field label): it gets a dotted
 * underline and reveals `text` on hover, focus, or click. There is deliberately
 * no separate icon, so the help text stays attached to the words it explains.
 *
 * The popover is teleported to <body> and positioned with `position: fixed`,
 * then clamped to the viewport, so it can never be clipped by an ancestor's
 * overflow or pushed off-screen.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps({
  /** The explanatory text to reveal. */
  text: {
    type: String,
    required: true,
  },
})

const POPOVER_WIDTH = 256 // matches the w-64 class below
const GAP = 8

const trigger = ref(null)
const open = ref(false)
const popoverStyle = ref({})

function reposition() {
  const el = trigger.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const maxLeft = Math.max(GAP, window.innerWidth - POPOVER_WIDTH - GAP)
  const left = Math.min(Math.max(GAP, rect.left + rect.width / 2 - POPOVER_WIDTH / 2), maxLeft)
  // Prefer below; flip above when there is not enough room.
  const fitsBelow = rect.bottom + GAP + 80 < window.innerHeight
  const top = fitsBelow ? rect.bottom + GAP : Math.max(GAP, rect.top - GAP - 90)
  popoverStyle.value = { left: `${left}px`, top: `${top}px`, width: `${POPOVER_WIDTH}px` }
  open.value = true
}

function show() {
  reposition()
}

function hide() {
  open.value = false
}

function toggle() {
  open.value ? hide() : show()
}

// Keep the fixed popover aligned (or dismiss it) while the page moves.
function onWindowChange() {
  if (open.value) reposition()
}

onMounted(() => {
  window.addEventListener('scroll', onWindowChange, true)
  window.addEventListener('resize', onWindowChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onWindowChange, true)
  window.removeEventListener('resize', onWindowChange)
})
</script>

<template>
  <span
    ref="trigger"
    class="cursor-help underline decoration-dotted underline-offset-2"
    tabindex="0"
    role="button"
    :aria-expanded="open"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
    @click.prevent="toggle"
    @keydown.escape="hide"
  >
    <slot />
  </span>
  <Teleport to="body">
    <span
      v-if="open"
      role="tooltip"
      class="fixed z-[60] w-64 rounded-md p-2 text-left text-xs font-normal normal-case leading-snug shadow-lg"
      :style="{ ...popoverStyle, backgroundColor: 'var(--color-third-800)', color: '#fff' }"
    >
      {{ text }}
    </span>
  </Teleport>
</template>

<style scoped></style>
