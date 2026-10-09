<script setup>
/**
 * Dispatches to the correct system-specific character *form*.
 *
 * Mirrors `SystemSheetRouter` (which does the same for the read-only sheet):
 * it owns the "which system is active" decision so feature views stay
 * system-agnostic. System knowledge lives here, not in the views.
 *
 * The parent passes the whole character as `v-model`; the router reaches into
 * the active system's data block (dnd5e / offworlders) and emits the whole
 * character back on update, so the view never names a system.
 */
import Dnd5eCharacterForm from '@/systems/dnd5e/components/Dnd5eCharacterForm.vue'
import OffworldersCharacterForm from '@/systems/offworlders/components/OffworldersCharacterForm.vue'
import { DND5E_SYSTEM_TYPE } from '@/systems/dnd5e/constants.js'
import { OFFWORLDERS_SYSTEM_TYPE } from '@/systems/offworlders/constants.js'

const props = defineProps({
  /** The whole character object (holds every system's data block). */
  modelValue: {
    type: Object,
    required: true,
  },
  /** Active system, e.g. 'DND5E' | 'OFFWORLDERS'. */
  systemType: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

function updateDnd5e(value) {
  emit('update:modelValue', { ...props.modelValue, dnd5e: value })
}

function updateOffworlders(value) {
  emit('update:modelValue', { ...props.modelValue, offworlders: value })
}
</script>

<template>
  <Dnd5eCharacterForm
    v-if="systemType === DND5E_SYSTEM_TYPE"
    :model-value="modelValue.dnd5e"
    @update:model-value="updateDnd5e"
  />
  <OffworldersCharacterForm
    v-else-if="systemType === OFFWORLDERS_SYSTEM_TYPE"
    :model-value="modelValue.offworlders"
    @update:model-value="updateOffworlders"
  />
  <p v-else class="text-muted">No form is available for this system.</p>
</template>
