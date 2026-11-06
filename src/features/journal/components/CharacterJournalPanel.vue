<script setup>
/**
 * One character's own material — what the journal's character tabs render beside
 * the campaign journal.
 *
 * Presentational: props in, events out. It never saves. When the caller allows
 * it (`editable`), the three long-text fields (notes / backstory / private
 * backstory) and the titled notes (`sections`) can be edited, and the panel only
 * reports what changed — `save-field` for a long-text field, `add` / `update` /
 * `remove` for a section, and `dirty` while anything is unsaved — so the caller
 * owns the write (`characterStore`, reached from `JournalBoard`).
 *
 * Reading stays the default: a long-text field shows its rendered markdown until
 * Edit is used, and one field is edited at a time. Markdown goes through
 * `<MarkdownText>` / `<BaseMarkdownField>` (the app's single `v-html` site), the
 * sections through `BaseNoteSections`.
 */
import { computed, ref, watch } from 'vue'
import MarkdownText from '@/components/base/MarkdownText.vue'
import BaseMarkdownField from '@/components/base/BaseMarkdownField.vue'
import BaseNoteSections from '@/components/base/BaseNoteSections.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseLinkButton from '@/components/base/BaseLinkButton.vue'
import { normalizeSections } from '@/utils/sections.js'

const props = defineProps({
  /** A character (CharacterOutputDTO). */
  character: {
    type: Object,
    required: true,
  },
  /** Whether the long-text fields and the titled notes may be edited. */
  editable: {
    type: Boolean,
    default: false,
  },
  /** True while a save is in flight; the controls wait. */
  saving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save-field', 'add', 'update', 'remove', 'dirty'])

/** The three long-text fields, in reading order. */
const FIELDS = [
  {
    key: 'notes',
    label: 'Notes',
    rows: 6,
    placeholder: 'Anything worth remembering.',
    empty: 'No notes recorded.',
  },
  {
    key: 'backstory',
    label: 'Backstory',
    rows: 6,
    placeholder: 'Where does this character come from?',
    empty: 'No backstory recorded.',
  },
  {
    key: 'privateBackstory',
    label: 'Private — only you and the GM can see this',
    rows: 6,
    placeholder: 'Secrets only the GM should know',
    empty: 'No private backstory recorded.',
  },
]

// The private field is shown only when the API returned it (owner or GM) — or
// whenever the viewer may write, so it can be filled in from empty.
const visibleFields = computed(() =>
  FIELDS.filter(
    (field) =>
      field.key !== 'privateBackstory' || props.character?.privateBackstory || props.editable,
  ),
)

// --- Long-text fields: read first, one edit at a time ------------------------

const editingField = ref(null)
const draft = ref('')

function startEditing(field) {
  editingField.value = field
  draft.value = props.character?.[field] || ''
}

function cancelEditing() {
  editingField.value = null
  draft.value = ''
}

function saveEditing() {
  const field = editingField.value
  if (!field) return
  const value = draft.value
  editingField.value = null
  draft.value = ''
  if (value !== (props.character?.[field] || '')) emit('save-field', { field, value })
}

// --- Titled notes (sections) -------------------------------------------------

const sections = computed(() => normalizeSections(props.character?.sections))

// --- Unsaved text ------------------------------------------------------------

const sectionsDirty = ref(false)
const fieldDirty = computed(
  () =>
    editingField.value !== null && draft.value !== (props.character?.[editingField.value] || ''),
)
const dirty = computed(() => sectionsDirty.value || fieldDirty.value)

watch(dirty, (value) => emit('dirty', value), { immediate: true })
</script>

<template>
  <div class="space-y-4 text-default">
    <div v-for="field in visibleFields" :key="field.key">
      <div
        v-if="editingField !== field.key"
        class="flex flex-wrap items-baseline justify-between gap-2 mb-1"
      >
        <h4 class="subsection-heading">{{ field.label }}</h4>
        <BaseButton
          v-if="editable"
          variant="update"
          icon="edit"
          :disabled="saving"
          @click="startEditing(field.key)"
        >
          Edit
        </BaseButton>
      </div>

      <!-- Editing one field at a time; the field's own label carries the heading
           so the textarea keeps an accessible name. -->
      <template v-if="editingField === field.key">
        <BaseMarkdownField
          :id="`journal-character-${field.key}`"
          :model-value="draft"
          :label="field.label"
          :rows="field.rows"
          :placeholder="field.placeholder"
          @update:model-value="draft = $event"
        />
        <div class="mt-2 flex justify-end gap-2">
          <BaseButton variant="ghost" @click="cancelEditing">Cancel</BaseButton>
          <BaseButton variant="update" :disabled="saving" @click="saveEditing">Save</BaseButton>
        </div>
      </template>

      <!-- Read view -->
      <template v-else>
        <MarkdownText v-if="character[field.key]" :text="character[field.key]" />
        <p v-else class="text-sm text-muted italic">{{ field.empty }}</p>
      </template>
    </div>

    <!-- Titled notes (sections): saved by the caller, editable only when allowed -->
    <BaseNoteSections
      :sections="sections"
      :editable="editable"
      :saving="saving"
      @add="$emit('add', $event)"
      @update="$emit('update', $event)"
      @remove="$emit('remove', $event)"
      @dirty="sectionsDirty = $event"
    />

    <div class="pt-1">
      <BaseLinkButton :to="{ name: 'CharacterView', params: { id: character.id } }">
        Open character
      </BaseLinkButton>
    </div>
  </div>
</template>
