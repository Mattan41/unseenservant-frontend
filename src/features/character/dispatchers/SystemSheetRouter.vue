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
  /** True while the parent is persisting a quick-edit (passed to the sheet). */
  saving: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['adjust-vital'])
</script>

<template>
  <Dnd5eSheet v-if="character.systemType === 'DND5E'" :character="character" :is-owner="isOwner" />
  <OffworldersSheet
    v-else-if="character.systemType === 'OFFWORLDERS'"
    :character="character"
    :is-owner="isOwner"
    :saving="saving"
    @adjust-vital="$emit('adjust-vital', $event)"
  />
  <!-- A character created without a game system has no sheet to draw, and that
       is not an error — the main column stays empty. The message below is for a
       system we cannot draw. -->
  <div v-else-if="character.systemType" class="p-6 text-center text-muted">
    <p>No character sheet is available for the "{{ character.systemType }}" system yet.</p>
  </div>
</template>
