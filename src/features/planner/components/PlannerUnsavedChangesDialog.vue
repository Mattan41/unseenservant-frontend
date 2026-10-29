<script setup>
/**
 * "You have unsaved changes" — the three ways out of a half-typed date.
 *
 * The planner edits one date at a time, and each draft lives with the caller, so
 * switching to another date (or closing the editor) would throw the typed text
 * away. This is where the caller is asked instead — the app's own dialog rather
 * than `window.confirm`, because there are three answers here and a native confirm
 * only offers two.
 */
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'

defineProps({
  /** The day under edit, as a person reads it, e.g. "Sat 14 Mar 2026". */
  subject: {
    type: String,
    default: 'this date',
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  /** False while the draft has no day yet: there is nothing to save in that state. */
  canSave: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['discard', 'save', 'continue'])
</script>

<template>
  <BaseModal @close="emit('continue')">
    <div class="w-full max-w-md rounded-lg bg-[var(--color-surface)] p-4 text-left shadow-lg">
      <h4 class="section-heading mb-2">Unsaved changes</h4>
      <p class="text-default text-sm">
        Your changes to {{ subject }} are not saved yet. Save them, discard them, or carry on
        editing — nothing is kept unless you save.
      </p>

      <div class="mt-4 flex flex-wrap gap-1">
        <BaseButton variant="add" :disabled="!canSave" :loading="isSaving" @click="emit('save')">
          Save changes
        </BaseButton>
        <BaseButton variant="ghost" @click="emit('discard')">Discard changes</BaseButton>
        <BaseButton variant="default" @click="emit('continue')">Continue editing</BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
