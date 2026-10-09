<script setup>
import { OFFWORLDERS_ATTRIBUTES } from '@/systems/offworlders/constants.js'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({}),
  },
})

function displayValue(stat) {
  const value = props.stats?.[stat]
  if (value === undefined || value === null) return '—'
  return value > 0 ? `+${value}` : String(value)
}
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
    <div v-for="stat in OFFWORLDERS_ATTRIBUTES" :key="stat" class="attribute-tile">
      <div class="attribute-value">{{ displayValue(stat) }}</div>
      <div class="attribute-label">{{ stat }}</div>
    </div>
  </div>
</template>
