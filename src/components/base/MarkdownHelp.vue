<script setup>
/**
 * Markdown formatting cheat sheet.
 *
 * A compact "Formatting help" disclosure paired with a table of the supported
 * syntax: each row shows the source snippet and a live rendering of it through
 * `<MarkdownText>` — the same renderer the read-only views use, so the cheat
 * sheet cannot drift from the real output.
 *
 * Deliberately an in-flow disclosure rather than an anchored popover or a
 * nested dialog: it is shown inside dialogs that are already narrow and
 * scrollable, where an overlay would be clipped or stack confusingly.
 *
 * Usage:
 *   <MarkdownHelp />
 *   <MarkdownHelp label="How do I format this?" />
 */
import { ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInfoBox from '@/components/base/BaseInfoBox.vue'
import MarkdownText from '@/components/base/MarkdownText.vue'

defineProps({
  /** Trigger text; doubles as the accessible name of the disclosure. */
  label: {
    type: String,
    default: 'Formatting help',
  },
})

const open = ref(false)

/** Source snippet → what it renders to. Kept in sync with `src/utils/markdown.js`. */
const SYNTAX = [
  { label: 'Bold', source: '**bold**' },
  { label: 'Italic', source: '*italic*' },
  { label: 'Heading', source: '## Heading' },
  { label: 'Bullet list', source: '- item' },
  { label: 'Numbered list', source: '1. item' },
  { label: 'Link', source: '[label](https://example.com)' },
  { label: 'Quote', source: '> quoted' },
  { label: 'Code', source: '`code`' },
  { label: 'Divider', source: '---' },
]
</script>

<template>
  <div class="markdown-help">
    <BaseButton variant="link" icon="help" :aria-expanded="open" @click="open = !open">
      {{ label }}
    </BaseButton>

    <BaseInfoBox v-if="open" variant="info" :icon="false" class="markdown-help-panel">
      <div class="markdown-help-list">
        <div v-for="item in SYNTAX" :key="item.label" class="markdown-help-row">
          <code class="markdown-help-source">{{ item.source }}</code>
          <MarkdownText class="markdown-help-result" :text="item.source" />
        </div>
      </div>
    </BaseInfoBox>
  </div>
</template>
