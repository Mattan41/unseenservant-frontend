<script setup>
/**
 * Long free-text block that is clamped to a few lines, with a "Read more" /
 * "Show less" link toggle (the same pattern as the campaign description).
 *
 * The toggle only appears when the text is longer than `threshold` characters,
 * so short values render as plain paragraphs.
 */
import { computed, ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'

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
})

const expanded = ref(false)

// Static class names so Tailwind keeps them in the build.
const CLAMP_CLASSES = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  6: 'line-clamp-6',
}
const clampClass = computed(() => CLAMP_CLASSES[props.lines] || 'line-clamp-4')
const isLong = computed(() => (props.text || '').length > props.threshold)

function toggle() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div>
    <!-- Collapse control at the top, shown only while expanded, so a long block
         can be closed without scrolling back to the bottom. -->
    <BaseButton v-if="isLong && expanded" variant="link" class="mb-1" @click="toggle">
      {{ lessLabel }}
    </BaseButton>

    <p
      class="text-default whitespace-pre-line break-words"
      :class="isLong && !expanded ? clampClass : null"
    >
      {{ text }}
    </p>

    <BaseButton v-if="isLong" variant="link" class="mt-1" @click="toggle">
      {{ expanded ? lessLabel : moreLabel }}
    </BaseButton>
  </div>
</template>
