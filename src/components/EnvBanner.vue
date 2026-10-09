<script setup>
/**
 * Environment banner.
 *
 * Presentational: the active environment (and therefore the message) is
 * decided by the smart parent (App.vue) and passed in as `text`. Styled via
 * the `.env-banner` semantic class — no raw colour utilities.
 */
defineProps({
  /** Message shown in the banner. */
  text: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="env-banner" role="status">
    {{ text }}
  </div>
</template>
