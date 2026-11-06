<script setup>
/**
 * A list of small, individually titled plain-text notes — the `sections` field
 * of a ship or a character. Not the campaign's sections (Overview, Lore, …).
 *
 * The UI calls them "additional notes" and each entry a "note"; the data field
 * and this component keep the name `sections`, which is what the DTOs and the
 * stores use.
 *
 * Presentational: props in, events out. The parent owns the save path and the
 * permission check (`editable`), so the ship (any participant may write) and the
 * character (owner only) share this component without sharing a store.
 *
 * The body is a plain `<textarea>`: a section is an entry, not a document, so
 * there is no markdown editor, no preview and no formatting help. Nothing here
 * renders HTML.
 */
import { computed, nextTick, ref, watch } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'

const props = defineProps({
  /** The sections, in the order they should render. */
  sections: {
    type: Array,
    default: () => [],
  },
  /** Whether add/edit/delete are offered — the parent decides who may write. */
  editable: {
    type: Boolean,
    default: false,
  },
  /** True while a save is in flight; the controls are disabled. */
  saving: {
    type: Boolean,
    default: false,
  },
  /** Heading for the block. */
  heading: {
    type: String,
    default: 'Additional notes',
  },
  /** Shown when there are no sections yet. */
  emptyText: {
    type: String,
    default: 'No additional notes yet.',
  },
})

const emit = defineEmits(['add', 'update', 'remove', 'dirty'])

const hasSections = computed(() => props.sections.length > 0)

// --- Add ---------------------------------------------------------------------
const adding = ref(false)
const newTitle = ref('')
const newBody = ref('')
const newTitleInput = ref(null)

async function startAdding() {
  adding.value = true
  newTitle.value = ''
  newBody.value = ''
  await nextTick()
  newTitleInput.value?.focus()
}

function cancelAdding() {
  adding.value = false
  newTitle.value = ''
  newBody.value = ''
}

function submitNew() {
  const title = newTitle.value.trim()
  const body = newBody.value
  // An empty section is not worth a round trip; the form stays open so the user
  // can see that nothing was created.
  if (!title && !body.trim()) return
  emit('add', { title, body })
  cancelAdding()
}

// --- Inline edit -------------------------------------------------------------
const editingId = ref(null)
const editTitle = ref('')
const editBody = ref('')
const editBodyInput = ref(null)

/** Function ref: a `ref` inside `v-for` would collect into an array. */
function setEditBodyInput(element) {
  editBodyInput.value = element
}

function startEditing(section) {
  editingId.value = section.id
  editTitle.value = section.title
  editBody.value = section.body
  nextTick(() => editBodyInput.value?.focus())
}

function cancelEditing() {
  editingId.value = null
  editTitle.value = ''
  editBody.value = ''
}

function submitEdit(section) {
  emit('update', {
    id: section.id,
    title: editTitle.value.trim(),
    body: editBody.value,
  })
  cancelEditing()
}

function remove(section) {
  emit('remove', section.id)
  if (editingId.value === section.id) cancelEditing()
}

// --- Unsaved text ------------------------------------------------------------
/**
 * True while the add form or an inline editor holds text the user has not
 * committed. An empty add form and an untouched editor are not dirty — there is
 * nothing to lose.
 *
 * The parent binds this with `@dirty` and wires the route guard, so this
 * component stays presentational: it reports, it does not decide.
 */
const isDirty = computed(() => {
  if (adding.value) return newTitle.value.trim() !== '' || newBody.value.trim() !== ''
  if (editingId.value === null) return false
  const section = props.sections.find((entry) => entry.id === editingId.value)
  if (!section) return false
  return editTitle.value !== section.title || editBody.value !== section.body
})

watch(isDirty, (dirty) => emit('dirty', dirty), { immediate: true })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-baseline justify-between gap-2 mb-2">
      <h4 class="subsection-heading text-default">{{ heading }}</h4>
      <BaseButton
        v-if="editable && !adding && hasSections"
        variant="add"
        :disabled="saving"
        @click="startAdding"
      >
        Add note
      </BaseButton>
    </div>

    <ul v-if="hasSections" class="space-y-3">
      <li v-for="section in sections" :key="section.id" class="muted-surface p-3">
        <!-- Inline editor: title + body, save/cancel like the other inline edits -->
        <div v-if="editingId === section.id" class="space-y-2">
          <label :for="`section-title-${section.id}`" class="block text-xs uppercase text-muted">
            Title
          </label>
          <input
            :id="`section-title-${section.id}`"
            v-model="editTitle"
            type="text"
            class="input-field p-2 rounded w-full"
          />
          <label :for="`section-body-${section.id}`" class="block text-xs uppercase text-muted">
            Body
          </label>
          <textarea
            :id="`section-body-${section.id}`"
            :ref="setEditBodyInput"
            v-model="editBody"
            rows="4"
            class="input-field p-2 rounded w-full"
          />
          <div class="flex justify-end gap-2">
            <BaseButton variant="ghost" @click="cancelEditing">Cancel</BaseButton>
            <BaseButton variant="update" :disabled="saving" @click="submitEdit(section)">
              Save
            </BaseButton>
          </div>
        </div>

        <!-- Read mode -->
        <div v-else>
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h5 class="subsection-heading-sm text-default">
              {{ section.title || 'Untitled note' }}
            </h5>
            <div v-if="editable" class="flex items-center gap-2">
              <BaseButton
                variant="update"
                icon="edit"
                :disabled="saving"
                @click="startEditing(section)"
              >
                Edit
              </BaseButton>
              <BaseButton
                variant="remove"
                :disabled="saving"
                confirm-message="Delete this note?"
                @click="remove(section)"
              >
                Delete
              </BaseButton>
            </div>
          </div>
          <p v-if="section.body" class="mt-1 whitespace-pre-line text-sm text-default">
            {{ section.body }}
          </p>
          <p v-else class="mt-1 text-sm text-muted italic">No text yet.</p>
        </div>
      </li>
    </ul>

    <!-- Empty state: a short line and the add affordance -->
    <div v-else-if="!adding" class="empty-cta">
      <p class="text-sm text-muted">{{ emptyText }}</p>
      <BaseButton v-if="editable" variant="add" :disabled="saving" @click="startAdding">
        Add note
      </BaseButton>
    </div>

    <!-- Inline "new section" form: title + body, no modal -->
    <div v-if="adding" class="muted-surface mt-3 p-3">
      <div class="space-y-2">
        <label for="new-section-title" class="block text-xs uppercase text-muted">Title</label>
        <input
          id="new-section-title"
          ref="newTitleInput"
          v-model="newTitle"
          type="text"
          class="input-field p-2 rounded w-full"
        />
        <label for="new-section-body" class="block text-xs uppercase text-muted">Body</label>
        <textarea
          id="new-section-body"
          v-model="newBody"
          rows="4"
          class="input-field p-2 rounded w-full"
        />
        <div class="flex justify-end gap-2">
          <BaseButton variant="ghost" @click="cancelAdding">Cancel</BaseButton>
          <BaseButton variant="add" :disabled="saving" @click="submitNew">Add note</BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
