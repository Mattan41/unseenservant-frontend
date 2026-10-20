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
  <!-- An <output>, so the element itself carries the implicit `status` role the
       div had to declare. `block` keeps the full-width strip it used to be. -->
  <output class="env-banner block">
    {{ text }}
  </output>
</template>
