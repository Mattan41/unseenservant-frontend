<script setup>
/**
 * Campaign navigation icon.
 *
 * Thin feature-scoped wrapper over the shared `BaseIcon` library so campaign
 * components keep a semantic, campaign-facing icon component while all SVG
 * geometry lives in one place (`src/components/base/BaseIcon.vue`).
 */
import BaseIcon from '@/components/base/BaseIcon.vue'

defineProps({
  /** Icon identifier: overview | lore | characters | messages | ship | spells | settings | edit | participants | menu | close | plus | chevron-left | chevron-right */
  name: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <BaseIcon :name="name" />
</template>

<style scoped></style>
