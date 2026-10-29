<script setup>
/**
 * The journal page itself: a markdown field with a save state, a character
 * counter and an on-demand preview.
 *
 * Presentational: props in, events out. Three deliberate rules live here:
 *
 *  - The limit is enforced by refusing an over-limit value **whole** and saying
 *    why (`rejected`), never by truncating it. The native `maxlength` attribute
 *    is not used for exactly that reason: it would cut a paste off silently. The
 *    field is re-keyed after a refusal, which is what redraws the previous text.
 *  - The counter only appears near the limit (`counterVisible`), so an ordinary
 *    page stays quiet.
 *  - The field has no Write/Preview tabs (`show-preview="false"`): a journal is
 *    written in, not read in, so the tab row would be chrome on every visit.
 *    Reading the rendered page is one click away instead — Preview opens it in a
 *    dialog, which leaves the textarea as the only thing on screen while writing.
 *
 * Losing focus is announced as `blur` (taken from `focusout`, which bubbles out
 * of the textarea — `blur` itself does not), so the caller can save what is
 * pending before the reader goes anywhere.
 */
import { computed, ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseMarkdownField from '@/components/base/BaseMarkdownField.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import MarkdownText from '@/components/base/MarkdownText.vue'
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

const emit = defineEmits(['update:modelValue', 'rejected', 'blur'])

// Re-keying the field redraws it from `modelValue`, which is the previous text.
const fieldKey = ref(0)
// Presentation-only: whether the read-only preview dialog is open.
const isPreviewOpen = ref(false)

const message = computed(() => saveStateLabel(props.saveState))
const atLimit = computed(() => props.charCount >= MAX_PAGE_CHARS)
const hasContent = computed(() => Boolean((props.modelValue || '').trim()))

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

/** `focusout` bubbles out of the textarea; `blur` does not. */
function onFocusOut() {
  emit('blur')
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
      :show-preview="false"
      @update:model-value="onInput"
      @focusout="onFocusOut"
    />

    <div class="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span :class="saveStateClass(saveState)">{{ message }}</span>
      <div class="flex flex-wrap items-center gap-2">
        <BaseButton variant="default" :disabled="disabled" @click="isPreviewOpen = true">
          Preview
        </BaseButton>
        <span v-if="counterVisible" :class="atLimit ? 'text-warning' : 'text-muted'">
          {{ charCount }} / {{ MAX_PAGE_CHARS }} characters<template v-if="atLimit">
            — the limit, nothing more fits</template
          >
        </span>
      </div>
    </div>

    <!-- Reading a page: the same renderer every read-only view uses, so what the
         preview shows is exactly what the markdown produces. The label goes on
         `<BaseModal>`, which is the element carrying the dialog role natively —
         a `role` on the panel inside it would be redundant (and a Sonar
         finding). -->
    <BaseModal v-if="isPreviewOpen" aria-label="Page preview" @close="isPreviewOpen = false">
      <div
        class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 class="modal-title">Page preview</h2>
          <BaseButton variant="default" icon="close" @click="isPreviewOpen = false">
            Close
          </BaseButton>
        </div>
        <MarkdownText v-if="hasContent" :text="modelValue" />
        <p v-else class="text-sm text-muted italic">Nothing on this page yet.</p>
      </div>
    </BaseModal>
  </div>
</template>
