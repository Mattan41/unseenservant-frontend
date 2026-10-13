<script setup>
import { computed } from 'vue'

/**
 * Compact numeric stepper: a `−` / value / `+` control for nudging a number in
 * place (character HP / Supply / Credits, ship Hull / Drive Fuel / Credits).
 *
 * Presentational — emits the next value and lets the parent persist it. When
 * `editable` is false only the value renders, so non-owners see the figure
 * without the controls. `max` defaults to `null` (no upper cap).
 */
const props = defineProps({
  modelValue: {
    type: Number,
    default: 0,
  },
  min: {
    type: Number,
    default: 0,
  },
  // `null` means "no upper cap" (e.g. HP with temporary HP, Credits).
  max: {
    type: Number,
    default: null,
  },
  step: {
    type: Number,
    default: 1,
  },
  /** When false, render the value only (no buttons). */
  editable: {
    type: Boolean,
    default: true,
  },
  /** Disables both buttons (e.g. while a save is in flight). */
  disabled: {
    type: Boolean,
    default: false,
  },
  /** Field name used to build the accessible button labels. */
  ariaLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const value = computed(() => Number(props.modelValue) || 0)

const canDecrease = computed(() => props.editable && !props.disabled && value.value > props.min)
const canIncrease = computed(
  () => props.editable && !props.disabled && (props.max === null || value.value < props.max),
)

function decrease() {
  if (!canDecrease.value) return
  emit('update:modelValue', Math.max(props.min, value.value - props.step))
}

function increase() {
  if (!canIncrease.value) return
  const next = value.value + props.step
  emit('update:modelValue', props.max === null ? next : Math.min(props.max, next))
}
</script>

<template>
  <span class="number-stepper">
    <template v-if="editable">
      <button
        type="button"
        class="number-stepper-btn"
        :disabled="!canDecrease"
        :aria-label="ariaLabel ? `Decrease ${ariaLabel}` : 'Decrease'"
        @click="decrease"
      >
        −
      </button>
      <span class="number-stepper-value">{{ value }}</span>
      <button
        type="button"
        class="number-stepper-btn"
        :disabled="!canIncrease"
        :aria-label="ariaLabel ? `Increase ${ariaLabel}` : 'Increase'"
        @click="increase"
      >
        +
      </button>
    </template>
    <span v-else class="number-stepper-value">{{ value }}</span>
  </span>
</template>
