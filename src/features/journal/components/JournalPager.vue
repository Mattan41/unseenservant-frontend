<script setup>
/**
 * Journal pager — previous / next, "Page N of M", a jump box, and the two
 * structural actions (insert a page after this one, delete this one).
 *
 * Presentational: props in, events out. The jump box is a plain text input on
 * purpose — an empty or half-typed value stays visible while the user types —
 * and the caller resolves and clamps it through `journalUtils.resolveJump`.
 */
import { ref, watch } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'

const props = defineProps({
  /** The page on screen (1-based). */
  pageNumber: {
    type: Number,
    required: true,
  },
  /** The trailing blank page's number: one past the stored pages. */
  lastPageNumber: {
    type: Number,
    required: true,
  },
  /** True while a request is in flight, so the controls wait. */
  busy: {
    type: Boolean,
    default: false,
  },
  /** False on the trailing blank page: there is no stored page to delete yet. */
  canDelete: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['go', 'insert', 'remove'])

const jumpValue = ref(String(props.pageNumber))

// Follow the book: after any change the box shows the page that is on screen.
watch(
  () => props.pageNumber,
  (number) => {
    jumpValue.value = String(number)
  },
)

function submitJump() {
  emit('go', jumpValue.value)
  // An invalid entry leaves the reader where they are, so put the box back.
  jumpValue.value = String(props.pageNumber)
}
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div class="flex items-center gap-2">
      <BaseButton
        variant="default"
        icon="chevron-left"
        :disabled="busy || pageNumber <= 1"
        @click="$emit('go', pageNumber - 1)"
      >
        Previous
      </BaseButton>
      <span class="text-sm text-default">Page {{ pageNumber }} of {{ lastPageNumber }}</span>
      <BaseButton
        variant="default"
        icon="chevron-right"
        :disabled="busy || pageNumber >= lastPageNumber"
        @click="$emit('go', pageNumber + 1)"
      >
        Next
      </BaseButton>
    </div>

    <div class="flex flex-wrap items-end gap-2">
      <div>
        <label for="journal-page-jump" class="block text-sm font-medium text-default">
          Go to page
        </label>
        <input
          id="journal-page-jump"
          name="journal-page-jump"
          class="input-field px-3 py-2 border rounded-md"
          type="text"
          inputmode="numeric"
          :value="jumpValue"
          :disabled="busy"
          @input="jumpValue = $event.target.value"
          @keyup.enter="submitJump"
        />
      </div>
      <BaseButton variant="default" :disabled="busy" @click="submitJump">Go</BaseButton>
      <BaseButton variant="default" icon="plus" :disabled="busy" @click="$emit('insert')">
        New page
      </BaseButton>
      <BaseButton v-if="canDelete" variant="remove" :disabled="busy" @click="$emit('remove')">
        Delete page
      </BaseButton>
    </div>
  </div>
</template>
