<script setup>
import BaseIcon from '@/components/base/BaseIcon.vue'

/**
 * Router link styled as a button.
 *
 * Mirrors `BaseButton`'s API and the `.base-btn` / `.base-btn-<variant>` classes
 * so a navigation action (e.g. "this character's campaign") reads exactly like a
 * button action — while still rendering an `<a>` that supports open-in-new-tab
 * and middle-click. Use it instead of hand-rolling `.base-btn` classes on a
 * `<RouterLink>`.
 *
 * The `.base-link-btn` modifier drops `.base-btn`'s action-bar layout margins,
 * so the spacing is owned by the element wrapping the link (Tailwind utilities
 * are layered and cannot override the unlayered `.base-btn` rule).
 */
defineProps({
  /** Router location, forwarded to `<RouterLink :to>`. */
  to: {
    type: [String, Object],
    required: true,
  },
  // Valid variants map to `.base-btn-<variant>` classes in
  // src/assets/base-button.css: default, ghost, add, update, remove,
  // retry, icon, demo, form, link, tile.
  variant: {
    type: String,
    default: 'default',
  },
  // Optional `BaseIcon` name rendered before the label, matching `BaseButton`.
  icon: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <RouterLink
    :to="to"
    class="base-btn base-link-btn"
    :class="[`base-btn-${variant}`, icon ? 'base-btn-with-icon' : '']"
  >
    <BaseIcon v-if="icon" :name="icon" class="base-btn-icon" />
    <slot />
  </RouterLink>
</template>
