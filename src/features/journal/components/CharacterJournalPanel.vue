<script setup>
/**
 * A character's own material, read-only — what the journal's character tabs
 * render beside the campaign journal.
 *
 * Presentational: one prop in, nothing out. It is a read view of data that lives
 * on the character (`notes` / `backstory` / `privateBackstory` / `sections`), so
 * it never edits — the only action is a link to `CharacterView`, where the
 * character is written. That keeps one source of truth and one place to edit.
 *
 * Markdown goes through `<MarkdownText>` (the app's single `v-html` site) and
 * sections, which are plain text, through `BaseNoteSections` in read mode. The
 * component depends on nothing but its prop, so `CharacterView` could reuse it
 * later without change.
 */
import { computed } from 'vue'
import MarkdownText from '@/components/base/MarkdownText.vue'
import BaseNoteSections from '@/components/base/BaseNoteSections.vue'
import BaseLinkButton from '@/components/base/BaseLinkButton.vue'
import { normalizeSections } from '@/utils/sections.js'

const props = defineProps({
  /** A character (CharacterOutputDTO) the viewer owns. */
  character: {
    type: Object,
    required: true,
  },
})

const sections = computed(() => normalizeSections(props.character?.sections))
</script>

<template>
  <div class="space-y-4 text-default">
    <!-- Notes -->
    <div>
      <h4 class="subsection-heading mb-1">Notes</h4>
      <MarkdownText v-if="character.notes" :text="character.notes" />
      <p v-else class="text-sm text-muted italic">No notes recorded.</p>
    </div>

    <!-- Backstory -->
    <div>
      <h4 class="subsection-heading mb-1">Backstory</h4>
      <MarkdownText v-if="character.backstory" :text="character.backstory" />
      <p v-else class="text-sm text-muted italic">No backstory recorded.</p>
    </div>

    <!-- Private backstory: only present when the API returned it (owner or GM).
         An absent field is omitted rather than shown as empty — there is nothing
         the reader could do with a "no private backstory" line. -->
    <div v-if="character.privateBackstory">
      <h4 class="subsection-heading mb-1">Private — only you and the GM can see this</h4>
      <MarkdownText :text="character.privateBackstory" />
    </div>

    <!-- Sections: read-only, and only when the character has any -->
    <BaseNoteSections v-if="sections.length" :sections="sections" :editable="false" />

    <!-- The one action: go where the character is written -->
    <div class="pt-1">
      <BaseLinkButton :to="{ name: 'CharacterView', params: { id: character.id } }">
        Open character
      </BaseLinkButton>
    </div>
  </div>
</template>
