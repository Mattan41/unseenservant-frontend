<script setup>
/**
 * Styled markdown output.
 *
 * This is the only component in the app that binds `v-html`. The HTML comes
 * from `renderMarkdown()` (src/utils/markdown.js), which escapes raw HTML and
 * rejects unsafe link targets, so no user- or server-authored markup can reach
 * the DOM — keep it that way and never bind `v-html` anywhere else.
 *
 * All structure lives in the `.rich-text` class (main.css); the component stays
 * presentational and inherits the surrounding text colour.
 */
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown.js'

const props = defineProps({
  /** Markdown source. */
  text: {
    type: String,
    default: '',
  },
})

const html = computed(() => renderMarkdown(props.text))
</script>

<template>
  <div class="rich-text text-default break-words" v-html="html"></div>
</template>
