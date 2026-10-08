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
    <div
      v-for="stat in OFFWORLDERS_ATTRIBUTES"
      :key="stat"
      class="p-2 rounded-lg shadow text-center"
      style="background-color: var(--color-third-200)"
    >
      <div class="text-lg font-bold" style="color: var(--color-primary-700)">
        {{ displayValue(stat) }}
      </div>
      <div class="text-xs uppercase tracking-wide" style="color: var(--color-third-600)">
        {{ stat }}
      </div>
    </div>
  </div>
</template>