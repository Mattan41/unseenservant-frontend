<script setup>
/**
 * Reusable icon-only button.
 *
 * Intended for compact, self-describing controls (hamburger, close, etc.) where
 * there is no visible text. An accessible `label` is therefore required and
 * rendered as `aria-label`; a tooltip is also exposed via `title` so pointer
 * users get the same hint.
 *
 * Pass an icon name to render from the shared `BaseIcon` library, or use the
 * default slot for a fully custom glyph.
 */
import BaseIcon from '@/components/base/BaseIcon.vue'

defineProps({
  /** Accessible name (required) — rendered as `aria-label` and `title`. */
  label: {
    type: String,
    required: true,
  },
  /** Visual variant: plain | solid | on-dark | chip. */
  variant: {
    type: String,
    default: 'plain',
  },
  /** Optional `BaseIcon` name. When omitted the default slot is rendered. */
  icon: {
    type: String,
    default: '',
  },
})

defineEmits(['click'])
</script>

<template>
  <button
    type="button"
    class="icon-btn"
    :class="`icon-btn-${variant}`"
    :aria-label="label"
    :title="label"
    @click="$emit('click')"
  >
    <BaseIcon v-if="icon" :name="icon" class="icon-btn-glyph" />
    <slot v-else />
  </button>
</template>

<style scoped></style>
