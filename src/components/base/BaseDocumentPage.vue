<script setup>
/**
 * Presentational shell for a long-form document page (privacy policy, terms).
 *
 * Props in, content out through the default slot — no store access, no logic.
 * Sizes are layout utilities; every colour comes from a semantic class
 * (`.section-heading`, `.text-default`, `.text-muted`) or a CSS variable
 * reference, so no palette utility appears in the template (STYLE_GUIDE §3).
 */
defineProps({
  /** Document title, rendered as the page's `h1`. */
  title: {
    type: String,
    required: true,
  },
  /** Revision date shown under the title, e.g. "17 October 2026". Empty hides the line. */
  updated: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="document-page">
    <article
      class="max-w-4xl mx-auto p-6 rounded-lg shadow-md"
      style="background-color: var(--color-primary-50)"
    >
      <h1 class="text-2xl font-bold text-default mb-1">{{ title }}</h1>
      <p v-if="updated" class="text-muted text-sm mb-8">Last updated: {{ updated }}</p>
      <slot />
    </article>
  </div>
</template>

<style scoped>
.document-page {
  padding: 2rem 1rem;
}

@media (max-width: 768px) {
  .document-page {
    padding: 1rem;
  }
}
</style>
