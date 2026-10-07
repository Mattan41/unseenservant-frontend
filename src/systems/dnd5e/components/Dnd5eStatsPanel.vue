<script setup>
import { DND5E_ABILITY_SCORES } from '@/systems/dnd5e/constants.js'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({}),
  },
})

function displayValue(stat) {
  const value = props.stats?.[stat]
  return value === undefined || value === null ? '-' : value
}
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
    <div
      v-for="stat in DND5E_ABILITY_SCORES"
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
