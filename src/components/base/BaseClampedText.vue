<script setup>
/**
 * Long free-text markdown block, clamped to a few lines.
 *
 * Two ways to reveal the rest, chosen by `mode`:
 * - `inline` (default) — expands in place with a "Read more" / "Show less"
 *   toggle (the campaign description pattern), best in a wide column.
 * - `modal` — opens the full text in a `<BaseModal>` dialog, so a long block in
 *   a narrow rail (the character identity column) stays compact yet readable.
 *
 * The clamp sits on the wrapper, because `line-clamp` has to own the block, and
 * the toggle only appears when the *plain text* is longer than `threshold`
 * characters — markdown markers never count towards the cut-off.
 *
 * Usage:
 *   <BaseClampedText :text="character.backstory" mode="modal" title="Backstory" />
 */
import { computed, ref, useId } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import MarkdownText from '@/components/base/MarkdownText.vue'
import { toPlainText } from '@/utils/markdown.js'

const props = defineProps({
  /** The text to display. */
  text: {
    type: String,
    default: '',
  },
  /** Number of lines shown while collapsed. */
  lines: {
    type: Number,
    default: 4,
  },
  /** Character count above which the Read more toggle appears. */
  threshold: {
    type: Number,
    default: 160,
  },
  moreLabel: {
    type: String,
    default: 'Read more',
  },
  lessLabel: {
    type: String,
    default: 'Show less',
  },
  /** How the full text is revealed: `inline` (in place) or `modal` (dialog). */
  mode: {
    type: String,
    default: 'inline',
  },
  /** Dialog heading (also its accessible name) used in `modal` mode. */
  title: {
    type: String,
    default: '',
  },
})

const expanded = ref(false)
const isModalOpen = ref(false)

const titleId = `clamped-text-title-${useId()}`

// Static class names so Tailwind keeps them in the build.
const CLAMP_CLASSES = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  6: 'line-clamp-6',
}
const clampClass = computed(() => CLAMP_CLASSES[props.lines] || 'line-clamp-4')
const isLong = computed(() => toPlainText(props.text).length > props.threshold)
const isModal = computed(() => props.mode === 'modal')

function toggle() {
  expanded.value = !expanded.value
}

function openModal() {
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}
</script>

<template>
  <div>
    <!-- Inline mode: collapse control at the top, shown only while expanded, so
         a long block can be closed without scrolling back to the bottom. -->
    <BaseButton v-if="isLong && !isModal && expanded" variant="link" class="mb-1" @click="toggle">
      {{ lessLabel }}
    </BaseButton>

    <div :class="isLong && !expanded ? clampClass : null">
      <MarkdownText :text="text" />
    </div>

    <!-- Inline mode: expand / collapse in place. -->
    <BaseButton v-if="isLong && !isModal" variant="link" class="mt-1" @click="toggle">
      {{ expanded ? lessLabel : moreLabel }}
    </BaseButton>

    <!-- Modal mode: read the full text in a dialog. -->
    <BaseButton v-else-if="isLong" variant="link" class="mt-1" @click="openModal">
      {{ moreLabel }}
    </BaseButton>

    <Teleport to="body">
      <BaseModal v-if="isModal && isModalOpen" @close="closeModal">
        <div
          class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :aria-label="title ? undefined : moreLabel"
        >
          <div class="flex items-start justify-between gap-3 mb-4">
            <h3 v-if="title" :id="titleId" class="modal-title">{{ title }}</h3>
            <BaseButton variant="icon" class="text-xl" aria-label="Close" @click="closeModal">
              ✕
            </BaseButton>
          </div>
          <MarkdownText :text="text" />
        </div>
      </BaseModal>
    </Teleport>
  </div>
</template>
