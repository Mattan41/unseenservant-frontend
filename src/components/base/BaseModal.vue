<script setup>
/**
 * Modal shell, built on the native `<dialog>` element.
 *
 * The element *is* the dialog: `showModal()` puts it in the top layer, makes the
 * rest of the page inert, and moves focus inside and restores it on close. The
 * `<div role="dialog">` overlay this used to hand-roll re-implemented all of
 * that, and not as well — nothing kept a tab away from the page behind it. A
 * native dialog also needs no `role`, which is what Sonar's "prefer the tag over
 * the role" rule asks for.
 *
 * Closing stays the caller's decision: `v-if` mounts and unmounts this, and every
 * way out — the panel's own Close button, a click on the dimming area, Escape —
 * ends in a `close` event. The two dismissals that live on the element itself are
 * declared as a pair, `@click` and `@keydown.esc`, because a click handler
 * without its keyboard twin is what Sonar's "click events should have
 * corresponding key events" rule flags; Escape *is* the keyboard reading of
 * "click the dimming area". The platform's own `cancel` (its Escape handling) is
 * then suppressed, so the caller's state remains the single close path rather
 * than one of two racing closers.
 *
 * Call sites keep their markup: the panel is the default slot, and a panel whose
 * content can grow caps itself (`max-h-[90vh] overflow-y-auto`). What a call site
 * must **not** add is `role="dialog"` / `aria-modal` — put `aria-label` /
 * `aria-labelledby` on `<BaseModal>` instead: attributes land on the dialog
 * element, which is what carries the accessible name. Body scroll stays locked
 * through the shared, counted lock in `utils/bodyScrollLock.js`, so a dialog
 * stacked on top of another (an image editor opened from a form dialog) cannot
 * unlock the body early. A dialog opened from inside a heading still needs
 * `<Teleport to="body">`.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock.js'

defineProps({
  zIndex: {
    type: String,
    default: 'z-50',
  },
})

const emit = defineEmits(['close'])

const dialogEl = ref(null)

/**
 * What had focus when this opened, so it can be given back on close.
 *
 * A native dialog restores focus itself — but only when it is closed *natively*,
 * and this is unmounted by the caller instead (`v-if`). Focus has moved inside
 * the dialog by then (that is `showModal()`'s doing), so without this it would
 * fall back to the document body and a keyboard user would lose their place.
 */
const opener = ref(null)

/**
 * Puts the dialog on screen, and is where a browser and jsdom part company:
 * jsdom ships no dialog implementation at all (no `showModal`, no `close`, no
 * `cancel` / `close` events), so there the element is opened with its `open`
 * attribute instead. Markup, slot and click handling are identical either way,
 * which is what the unit tests exercise.
 */
function open() {
  const el = dialogEl.value
  if (!el) return
  if (typeof el.showModal === 'function') el.showModal()
  else el.setAttribute('open', '')
}

/** The other half of `open()`: the dialog leaves the top layer / stops being open. */
function closeOpenDialog() {
  const el = dialogEl.value
  if (!el?.open) return
  if (typeof el.close === 'function') el.close()
  else el.removeAttribute('open')
}

/** A click on the dialog's own box — the dimming area — closes it. */
function onDialogClick(event) {
  if (event.target === dialogEl.value) emit('close')
}

onMounted(() => {
  lockBodyScroll()
  opener.value = document.activeElement
  open()
})

onBeforeUnmount(() => {
  unlockBodyScroll()
  // The last way out, for a caller that unmounts this without closing it first:
  // an open dialog would keep the page inaccessible.
  closeOpenDialog()
  // And give the keyboard back to whatever opened this (see `opener`).
  if (opener.value instanceof HTMLElement && opener.value !== document.body) {
    if (opener.value.isConnected) opener.value.focus()
  }
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="base-modal"
    :class="zIndex"
    @click="onDialogClick"
    @keydown.esc="emit('close')"
    @cancel.prevent
  >
    <slot />
  </dialog>
</template>
