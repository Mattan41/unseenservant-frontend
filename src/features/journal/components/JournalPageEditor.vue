<script setup>
/**
 * The journal page itself: a markdown field with a save state and a character
 * counter.
 *
 * Presentational: props in, events out. Two deliberate rules live here:
 *
 *  - The limit is enforced by refusing an over-limit value **whole** and saying
 *    why (`rejected`), never by truncating it. The native `maxlength` attribute
 *    is not used for exactly that reason: it would cut a paste off silently. The
 *    field is re-keyed after a refusal, which is what redraws the previous text.
 *  - The counter only appears near the limit (`counterVisible`), so an ordinary
 *    page stays quiet.
 */
import { computed, ref } from 'vue'
import BaseMarkdownField from '@/components/base/BaseMarkdownField.vue'
import { MAX_PAGE_CHARS } from '@/features/journal/journalLimits.js'
import { isOverLimit, saveStateClass, saveStateLabel } from '@/features/journal/journalUtils.js'

const props = defineProps({
  /** The text of the page on screen (`v-model`). */
  modelValue: {
    type: String,
    default: '',
  },
  /** idle | dirty | saving | saved | error */
  saveState: {
    type: String,
    default: 'idle',
  },
  charCount: {
    type: Number,
    default: 0,
  },
  /** Whether to show the counter at all: it appears near the limit only. */
  counterVisible: {
    type: Boolean,
    default: false,
  },
  /** True while the page is not on screen yet (loading). */
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'rejected'])

// Re-keying the field redraws it from `modelValue`, which is the previous text.
const fieldKey = ref(0)

const message = computed(() => saveStateLabel(props.saveState))
const atLimit = computed(() => props.charCount >= MAX_PAGE_CHARS)

function onInput(value) {
  if (isOverLimit(value)) {
    emit(
      'rejected',
      `A page holds at most ${MAX_PAGE_CHARS} characters. Paste less, or split it over two pages.`,
    )
    fieldKey.value += 1
    return
  }
  emit('update:modelValue', value)
}
</script>

<template>
  <div>
    <BaseMarkdownField
      :key="fieldKey"
      :model-value="modelValue"
      label="Page text"
      :rows="18"
      placeholder="Write the session down. Markdown works here."
      :disabled="disabled"
      empty-preview="Nothing on this page yet."
      @update:model-value="onInput"
    />

    <div class="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span :class="saveStateClass(saveState)">{{ message }}</span>
      <span v-if="counterVisible" :class="atLimit ? 'text-warning' : 'text-muted'">
        {{ charCount }} / {{ MAX_PAGE_CHARS }} characters<template v-if="atLimit">
          — the limit, nothing more fits</template
        >
      </span>
    </div>
  </div>
</template>
