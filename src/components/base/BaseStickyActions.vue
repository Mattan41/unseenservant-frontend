<script setup>
/**
 * Floating edit action bar ("tag") for long forms.
 *
 * Renders a sticky, right-aligned tag holding Cancel / Save so the primary save
 * action stays reachable while scrolling, on mobile and desktop. A short
 * "Unsaved changes" hint appears while the form is dirty.
 *
 * Presentational only: props in, events out. The parent owns validation and the
 * actual save. Buttons are `type="button"` so the bar is safe to place inside a
 * `<form>` (Enter-to-submit still goes through the form's submit handler).
 *
 * Usage:
 *   <BaseStickyActions
 *     :dirty="isDirty"
 *     :saving="saving"
 *     save-label="Save ship"
 *     @cancel="cancelEditing"
 *     @save="submit"
 *   />
 */
import BaseButton from '@/components/base/BaseButton.vue'

defineProps({
  /** True while the draft differs from the saved record. */
  dirty: {
    type: Boolean,
    default: false,
  },
  /** True while a save is in flight (disables Cancel, loads Save). */
  saving: {
    type: Boolean,
    default: false,
  },
  /** Label of the primary save button. */
  saveLabel: {
    type: String,
    default: 'Save',
  },
  /** Label of the cancel button. */
  cancelLabel: {
    type: String,
    default: 'Cancel',
  },
  /** Hint shown while `dirty` is true. */
  dirtyLabel: {
    type: String,
    default: 'Unsaved changes',
  },
})

defineEmits(['cancel', 'save'])
</script>

<template>
  <div class="sticky bottom-3 z-20 flex justify-end">
    <div class="edit-bar">
      <span v-if="dirty" class="edit-bar-label">{{ dirtyLabel }}</span>
      <BaseButton variant="ghost" type="button" :disabled="saving" @click="$emit('cancel')">
        {{ cancelLabel }}
      </BaseButton>
      <BaseButton variant="add" type="button" :loading="saving" @click="$emit('save')">
        {{ saveLabel }}
      </BaseButton>
    </div>
  </div>
</template>
