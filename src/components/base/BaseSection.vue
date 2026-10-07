<script setup>
/**
 * Lightweight presentational section wrapper.
 *
 * Provides a consistent section container with an optional semantic heading and
 * an optional actions slot. Styling relies on the `.section-heading` semantic
 * class — no raw color utilities.
 */
defineProps({
  /** Optional section heading. Omit to render content only. */
  title: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <section class="mb-6">
    <div
      v-if="title || $slots.actions"
      class="flex flex-wrap justify-between items-center gap-2 mb-4"
    >
      <h2 v-if="title" class="section-heading">{{ title }}</h2>
      <slot name="actions" />
    </div>
    <slot />
  </section>
</template>

<style scoped></style>
