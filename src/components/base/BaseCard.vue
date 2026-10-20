<script setup>
/**
 * Generic content card.
 *
 * `clickable` makes the whole card an action target. It cannot be a native
 * `<button>` — the slot may hold the card's own controls (the save/remove
 * buttons on a spell or character card) — so the card keeps its `<div>` and
 * gains the button semantics instead: `role`, `tabindex` and Enter/Space, so it
 * is reachable and operable by keyboard exactly like the mouse click.
 *
 * Clicks and key events coming from a nested control stay with that control
 * (see `utils/interactiveEvent.js`), which replaces the `@click.stop` wrapper
 * call sites used to need around those controls.
 */
import { isNestedControlClick, isOwnKeyEvent } from '@/utils/interactiveEvent.js'

defineProps({
  clickable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click'])

function handleClick(event) {
  if (isNestedControlClick(event)) return
  emit('click')
}

function handleActivate(event) {
  if (!isOwnKeyEvent(event)) return
  // Space would otherwise scroll the page the way it does outside a button.
  event.preventDefault()
  emit('click')
}
</script>

<template>
  <div
    class="flex flex-col justify-between bg-(--color-surface) border border-section rounded-lg shadow-sm p-4"
    :class="{ 'hover:shadow-md transition-shadow cursor-pointer': clickable }"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="clickable && handleClick($event)"
    @keydown.enter="clickable && handleActivate($event)"
    @keydown.space="clickable && handleActivate($event)"
  >
    <slot></slot>
  </div>
</template>
