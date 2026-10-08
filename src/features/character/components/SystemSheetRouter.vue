<script setup>
import Dnd5eSheet from '@/systems/dnd5e/Dnd5eSheet.vue'
import OffworldersSheet from '@/systems/offworlders/OffworldersSheet.vue'

defineProps({
  character: {
    type: Object,
    required: true,
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <Dnd5eSheet
    v-if="character.systemType === 'DND5E'"
    :character="character"
    :is-owner="isOwner"
  />
  <OffworldersSheet
    v-else-if="character.systemType === 'OFFWORLDERS'"
    :character="character"
    :is-owner="isOwner"
  />
  <div v-else class="p-6 text-center" style="color: var(--color-third-500)">
    <p>No character sheet is available for the "{{ character.systemType }}" system yet.</p>
  </div>
</template>
