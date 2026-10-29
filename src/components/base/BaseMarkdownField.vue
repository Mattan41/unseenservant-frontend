<script setup>
/**
 * Labelled markdown field — a textarea plus a Write/Preview toggle.
 *
 * Mirrors `<BaseInput>`'s API (label, tooltip, hint, error, disabled) so a form
 * can swap an input for a markdown field without restructuring, and adds the
 * one thing long free-text fields need: a preview rendered by `<MarkdownText>`
 * — the same renderer the read-only views use, so the author sees exactly what
 * everyone else sees.
 *
 * Preview is local presentation state only: it never changes `modelValue`, so
 * the surrounding form's dirty tracking (and its unsaved-changes guard) is
 * unaffected by switching tabs. Pass `:show-preview="false"` where the field is
 * written in rather than read in (the journal) — the textarea is then the whole
 * field and no tabs are rendered.
 *
 * The syntax is not spelled out under every field; a collapsed `<MarkdownHelp>`
 * disclosure carries the cheat sheet instead, so compact forms stay quiet.
 *
 * The component has no outer spacing, so layout stays at the call site:
 * `<BaseMarkdownField class="mb-4" … />` composes with any grid or stack.
 *
 * Usage:
 *   <BaseMarkdownField v-model="character.backstory" label="Backstory" :rows="4" />
 */
import { computed, ref, useId } from 'vue'
import BaseTooltip from '@/components/base/BaseTooltip.vue'
import MarkdownHelp from '@/components/base/MarkdownHelp.vue'
import MarkdownText from '@/components/base/MarkdownText.vue'

const props = defineProps({
  /** Bound markdown source (`v-model`). */
  modelValue: {
    type: String,
    default: '',
  },
  /** Visible field label. Omit it to render an unlabelled field. */
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
  /** Helper line under the field. */
  hint: {
    type: String,
    default: '',
  },
  /** Validation message; replaces the hint and marks the field invalid. */
  error: {
    type: String,
    default: '',
  },
  /** Explicit id; auto-generated when omitted so `label[for]` always resolves. */
  id: {
    type: String,
    default: '',
  },
  /** Visible textarea height in text lines. */
  rows: {
    type: Number,
    default: 4,
  },
  placeholder: {
    type: String,
    default: '',
  },
  /** Hard character cap, mirroring the native `maxlength` attribute. */
  maxlength: {
    type: [String, Number],
    default: undefined,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  /**
   * Whether to offer the Write/Preview toggle at all. Turn it off for a field
   * that is written in rather than read in (the journal): the tabs are one more
   * row of chrome on every visit, while the rendered text is a deliberate
   * "show me" action. The value is untouched either way.
   */
  showPreview: {
    type: Boolean,
    default: true,
  },
  writeLabel: {
    type: String,
    default: 'Write',
  },
  previewLabel: {
    type: String,
    default: 'Preview',
  },
  /** Shown in the preview tab while the field is empty. */
  emptyPreview: {
    type: String,
    default: 'Nothing to preview yet.',
  },
})

const emit = defineEmits(['update:modelValue'])

const fieldId = computed(() => props.id || `base-markdown-${useId()}`)
const message = computed(() => props.error || props.hint)
const describedById = computed(() => (message.value ? `${fieldId.value}-message` : undefined))
const hasContent = computed(() => Boolean((props.modelValue || '').trim()))

// Presentation-only: which tab is showing.
const isPreview = ref(false)

function onInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div>
    <div v-if="label || showPreview" class="flex flex-wrap items-center justify-between gap-2 mb-1">
      <label v-if="label" :for="fieldId" class="block text-sm font-medium text-default">
        <BaseTooltip v-if="tooltip" :text="tooltip" :desktop-only="tooltipDesktopOnly">
          {{ label }}
        </BaseTooltip>
        <span v-else>{{ label }}</span>
      </label>

      <!-- Write/Preview toggle buttons (aria-pressed, so no tab-key contract to
           implement). They only switch the view — the value is untouched. Hidden
           whole when the call site writes without reading (`showPreview`). -->
      <div v-if="showPreview" class="field-tabs">
        <button
          type="button"
          class="field-tab"
          :class="{ 'field-tab--active': !isPreview }"
          :aria-pressed="!isPreview"
          @click="isPreview = false"
        >
          {{ writeLabel }}
        </button>
        <button
          type="button"
          class="field-tab"
          :class="{ 'field-tab--active': isPreview }"
          :aria-pressed="isPreview"
          @click="isPreview = true"
        >
          {{ previewLabel }}
        </button>
      </div>
    </div>

    <textarea
      v-show="!isPreview"
      :id="fieldId"
      :value="modelValue"
      class="input-field w-full px-3 py-2 border rounded-md"
      :class="[error ? 'input-field--error' : 'border-input', disabled ? 'opacity-70' : '']"
      :rows="rows"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedById"
      @input="onInput"
    ></textarea>

    <div
      v-if="showPreview && isPreview"
      class="markdown-preview"
      :class="error ? 'input-field--error' : null"
    >
      <MarkdownText v-if="hasContent" :text="modelValue" />
      <p v-else class="text-sm text-muted italic">{{ emptyPreview }}</p>
    </div>

    <p
      v-if="message"
      :id="describedById"
      class="text-xs mt-1"
      :class="error ? 'text-warning' : 'text-muted'"
    >
      {{ message }}
    </p>

    <!-- Syntax cheat sheet, collapsed by default so compact forms stay quiet. -->
    <MarkdownHelp class="mt-1" />
  </div>
</template>
