<script setup>
/**
 * The four fields that describe a candidate date — the day, its optional window and
 * a note — with the save (and optional cancel) pair.
 *
 * One form, two places: offering a new date below the list, and correcting one
 * *inside its own row*. The draft lives with the caller (`v-model`), which is what
 * lets the caller tell whether there is anything unsaved, and guard leaving it.
 */
import { computed } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import { MAX_NOTE_LENGTH } from '@/features/planner/plannerConstants.js'

const props = defineProps({
  /** The draft: `{ date, startTime, endTime, note }`. */
  modelValue: {
    type: Object,
    required: true,
  },
  /** Shown above the fields; empty renders no heading. */
  heading: {
    type: String,
    default: '',
  },
  submitLabel: {
    type: String,
    default: 'Save date',
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  /** The inline editor has a Cancel; the offer form is simply always there. */
  showCancel: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

/** Field by field, so the object the caller holds is replaced, never mutated. */
function setField(field, value) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

/** A day is the one thing a candidate date cannot do without. */
const canSubmit = computed(() => props.modelValue.date !== '')
</script>

<template>
  <form class="space-y-3" @submit.prevent="emit('save')">
    <h4 v-if="heading" class="text-default font-semibold">{{ heading }}</h4>

    <div class="grid gap-3 sm:grid-cols-3">
      <BaseInput
        :model-value="modelValue.date"
        type="date"
        label="Day"
        required
        @update:model-value="setField('date', $event)"
      />
      <BaseInput
        :model-value="modelValue.startTime"
        type="time"
        label="From (optional)"
        @update:model-value="setField('startTime', $event)"
      />
      <BaseInput
        :model-value="modelValue.endTime"
        type="time"
        label="To (optional)"
        @update:model-value="setField('endTime', $event)"
      />
    </div>

    <BaseInput
      :model-value="modelValue.note"
      label="Note (optional)"
      placeholder="Sunday afternoon, bring dice"
      :maxlength="MAX_NOTE_LENGTH"
      @update:model-value="setField('note', $event)"
    />

    <div class="flex flex-wrap gap-1">
      <BaseButton type="submit" variant="add" :disabled="!canSubmit" :loading="isSaving">
        {{ submitLabel }}
      </BaseButton>
      <BaseButton v-if="showCancel" variant="ghost" @click="emit('cancel')">Cancel</BaseButton>
    </div>
  </form>
</template>
