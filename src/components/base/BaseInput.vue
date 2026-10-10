<script setup>
/**
 * Labelled text/number input — the single way to render a form field.
 *
 * Owns the label (optionally with an info tooltip), the standard `.input-field`
 * box, the hint/error line and the accessibility wiring (`aria-describedby`,
 * `aria-invalid`), so individual forms never repeat that markup.
 *
 * The component has no outer spacing, so layout stays at the call site:
 * `<BaseInput class="mb-4" … />` composes with any grid or stack.
 *
 * `type="number"` emits numbers (blank stays blank), so call sites use plain
 * `v-model` — no `.number` modifier needed.
 *
 * Usage:
 *   <BaseInput v-model="offworlders.species" label="Species" tooltip="…" />
 *   <BaseInput v-model="offworlders.xp" type="number" :min="0" label="XP" />
 */
import { computed, useId } from 'vue'
import BaseTooltip from '@/components/base/BaseTooltip.vue'

const props = defineProps({
  /** Bound value (`v-model`). */
  modelValue: {
    type: [String, Number],
    default: '',
  },
  /** Visible field label. Omit it to render an unlabelled input. */
  label: {
    type: String,
    default: '',
  },
  /** Info-tooltip text shown next to the label (`<BaseTooltip>`). */
  tooltip: {
    type: String,
    default: '',
  },
  /** Show the tooltip on desktop only, keeping mobile form rows compact. */
  tooltipDesktopOnly: {
    type: Boolean,
    default: false,
  },
  /** Extra classes for the label (e.g. `capitalize`). */
  labelClass: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  /** Explicit id; auto-generated when omitted so `label[for]` always resolves. */
  id: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  /** Helper line under the input. */
  hint: {
    type: String,
    default: '',
  },
  /** Validation message; replaces the hint and marks the field invalid. */
  error: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  min: {
    type: [String, Number],
    default: undefined,
  },
  max: {
    type: [String, Number],
    default: undefined,
  },
  step: {
    type: [String, Number],
    default: undefined,
  },
  autocomplete: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const inputId = computed(() => props.id || `base-input-${useId()}`)

/** The hint or the error — the error wins, so only one line is ever shown. */
const message = computed(() => props.error || props.hint)
const describedById = computed(() => (message.value ? `${inputId.value}-message` : undefined))

const inputClass = computed(() => [
  'input-field w-full px-3 py-2 border rounded-md',
  props.error ? 'input-field--error' : 'border-input',
  props.disabled ? 'opacity-70' : '',
])

// Mirrors Vue's `v-model.number` (blank and non-numeric input stay as typed).
function onInput(event) {
  const value = event.target.value
  if (props.type !== 'number') {
    emit('update:modelValue', value)
    return
  }
  const parsed = parseFloat(value)
  emit('update:modelValue', Number.isNaN(parsed) ? value : parsed)
}
</script>

<template>
  <div>
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-default mb-1">
      <BaseTooltip v-if="tooltip" :text="tooltip" :desktop-only="tooltipDesktopOnly">
        <span :class="labelClass">{{ label }}</span>
      </BaseTooltip>
      <span v-else :class="labelClass">{{ label }}</span>
    </label>

    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :min="min"
      :max="max"
      :step="step"
      :autocomplete="autocomplete"
      :class="inputClass"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedById"
      @input="onInput"
    />

    <p
      v-if="message"
      :id="describedById"
      class="text-xs mt-1"
      :class="error ? 'text-warning' : 'text-muted'"
    >
      {{ message }}
    </p>
  </div>
</template>
