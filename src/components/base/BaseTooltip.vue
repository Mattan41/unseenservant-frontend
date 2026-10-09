<script setup>
/**
 * Inline info affordance.
 *
 * The slot content is the trigger (usually the field/option label) and reveals
 * `text` on hover/focus/click. On desktop (md+) the text is a teleported fixed
 * popover clamped to the viewport; on small screens it expands inline beneath
 * the trigger, which is friendlier on touch and never clipped.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps({
  /** The explanatory text to reveal. */
  text: {
    type: String,
    required: true,
  },
})

const POPOVER_WIDTH = 256
const GAP = 8

const trigger = ref(null)
const open = ref(false)
const popoverStyle = ref({})
const isDesktop = ref(true)
let mediaQuery = null

function reposition() {
  const el = trigger.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const maxLeft = Math.max(GAP, window.innerWidth - POPOVER_WIDTH - GAP)
  const left = Math.min(Math.max(GAP, rect.left + rect.width / 2 - POPOVER_WIDTH / 2), maxLeft)
  const fitsBelow = rect.bottom + GAP + 80 < window.innerHeight
  const top = fitsBelow ? rect.bottom + GAP : Math.max(GAP, rect.top - GAP - 90)
  popoverStyle.value = { left: `${left}px`, top: `${top}px`, width: `${POPOVER_WIDTH}px` }
}

function show() {
  if (isDesktop.value) reposition()
  open.value = true
}
function hide() {
  open.value = false
}
function toggle() {
  if (open.value) hide()
  else show()
}
function onWindowChange() {
  if (open.value && isDesktop.value) reposition()
}
function onMediaChange(event) {
  isDesktop.value = event.matches
  open.value = false
}

onMounted(() => {
  mediaQuery = window.matchMedia('(min-width: 768px)')
  isDesktop.value = mediaQuery.matches
  mediaQuery.addEventListener('change', onMediaChange)
  window.addEventListener('scroll', onWindowChange, true)
  window.addEventListener('resize', onWindowChange)
})

onBeforeUnmount(() => {
  if (mediaQuery) mediaQuery.removeEventListener('change', onMediaChange)
  window.removeEventListener('scroll', onWindowChange, true)
  window.removeEventListener('resize', onWindowChange)
})
</script>

<template>
  <span class="inline-flex flex-col">
    <span
      ref="trigger"
      class="cursor-help underline decoration-dotted underline-offset-2"
      tabindex="0"
      role="button"
      :aria-expanded="open"
      @mouseenter="isDesktop && show()"
      @mouseleave="isDesktop && hide()"
      @focus="isDesktop && show()"
      @blur="hide"
      @click.prevent="toggle"
      @keydown.escape="hide"
    >
      <slot />
    </span>
    <span v-if="open && !isDesktop" role="tooltip" class="info-popover info-popover--inline">
      {{ text }}
    </span>
    <Teleport v-if="isDesktop" to="body">
      <span
        v-if="open"
        role="tooltip"
        class="info-popover info-popover--fixed"
        :style="popoverStyle"
      >
        {{ text }}
      </span>
    </Teleport>
  </span>
</template>
