<script setup>
/**
 * One plan, in full: its dates with everybody's answers, the roster, and two places
 * to type a date — the offer form below the list, and one date's own editor inside
 * its row.
 *
 * Presentational with local draft state only. It is handed the plan and the rights
 * the caller has, and it says what they did — the store and the backend decide what
 * that means. A decided plan shows no form at all, which is the freeze made visible:
 * reopen it to change anything.
 *
 * **One date is edited at a time**, so which one that is stays obvious. Starting on
 * another one (or cancelling a changed one) asks first, through
 * `PlannerUnsavedChangesDialog`: discard, save, or continue editing.
 */
import { computed, ref, watch } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseMarkdownField from '@/components/base/BaseMarkdownField.vue'
import MarkdownText from '@/components/base/MarkdownText.vue'
import PlannerDateForm from '@/features/planner/components/PlannerDateForm.vue'
import PlannerDateRow from '@/features/planner/components/PlannerDateRow.vue'
import PlannerRosterPanel from '@/features/planner/components/PlannerRosterPanel.vue'
import PlannerUnsavedChangesDialog from '@/features/planner/components/PlannerUnsavedChangesDialog.vue'
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '@/features/planner/plannerConstants.js'
import {
  dateFormOf,
  datePayloadOf,
  emptyDateForm,
  formatPlanDate,
  isDateFormDirty,
  isDecided,
  rosterOf,
} from '@/features/planner/plannerUtils.js'

const props = defineProps({
  /** A `PlannerPlanDTO`. */
  plan: {
    type: Object,
    required: true,
  },
  currentUserId: {
    type: [Number, String],
    required: true,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  hasConflict: {
    type: Boolean,
    default: false,
  },
  /** The campaign owner: may remove another member from the plan. */
  canManageMembers: {
    type: Boolean,
    default: false,
  },
  /** The plan's creator or the campaign owner. */
  canDelete: {
    type: Boolean,
    default: false,
  },
  /** Whether the caller may correct or take back a given date. */
  canEditDate: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'back',
  'rename',
  'add-date',
  'update-date',
  'answer',
  'clear-answer',
  'remove-date',
  'decide',
  'reopen',
  'delete-plan',
  'leave',
  'rejoin',
  'remove-member',
  'add-member',
])

const isOpen = computed(() => !isDecided(props.plan))
const roster = computed(() => rosterOf(props.plan))
const isParticipant = computed(
  () => roster.value.some((member) => String(member.userId) === String(props.currentUserId)),
)

// Title / description editing
const isRenaming = ref(false)
const draftTitle = ref('')
const draftDescription = ref('')

/** The date whose editor is open — one at a time — and the draft it holds. */
const editedDate = ref(null)
const editDraft = ref(emptyDateForm())

/** The draft the "offer another date" form below the list is filling in. */
const offerDraft = ref(emptyDateForm())

/**
 * The move the unsaved-changes dialog is holding back: `{ type: 'edit', date }` when
 * another date was asked for, `{ type: 'cancel' }` when the open editor was being
 * closed. Null means nothing is waiting.
 */
const pendingAction = ref(null)

const chosenDate = computed(
  () => (props.plan.dates || []).find((date) => String(date.id) === String(props.plan.decidedDateId)) || null,
)

const isEditingDate = computed(() => editedDate.value !== null)
const hasUnsavedChanges = computed(() => isDateFormDirty(editDraft.value, editedDate.value))
const canSaveDraft = computed(() => editDraft.value.date !== '')

/** The day the dialog names, so "your changes to …" points at one date. */
const editingDay = computed(() => (editedDate.value ? formatPlanDate(editedDate.value.date) : ''))

/** A plan opening, or another one being opened: drop every half-typed form. */
watch(
  () => props.plan.id,
  () => {
    isRenaming.value = false
    editedDate.value = null
    editDraft.value = emptyDateForm()
    offerDraft.value = emptyDateForm()
    pendingAction.value = null
  },
)

function startRenaming() {
  draftTitle.value = props.plan.title
  draftDescription.value = props.plan.description || ''
  isRenaming.value = true
}

function submitRename() {
  emit('rename', { title: draftTitle.value, description: draftDescription.value })
  isRenaming.value = false
}

/** Whether this row is the one whose editor is open. */
function isEditing(date) {
  return isEditingDate.value && String(editedDate.value.id) === String(date.id)
}

/** Open one date's editor on the values it holds right now. */
function openEditor(date) {
  editedDate.value = date
  editDraft.value = dateFormOf(date)
}

function closeEditor() {
  editedDate.value = null
  editDraft.value = emptyDateForm()
}

/**
 * Start editing a date. Only one editor is ever open, so switching to another date
 * asks first when the open one has changes that are not saved — nothing typed
 * disappears without a choice being offered.
 */
function requestEdit(date) {
  if (isEditing(date)) return

  if (isEditingDate.value && hasUnsavedChanges.value) {
    pendingAction.value = { type: 'edit', date }
    return
  }

  openEditor(date)
}

/** Cancel is the other way out of an editor, so it asks the same question. */
function requestCloseEditor() {
  if (hasUnsavedChanges.value) {
    pendingAction.value = { type: 'cancel' }
    return
  }

  closeEditor()
}

/** Throw the draft away, then do what was waiting. */
function discardChanges() {
  const waiting = pendingAction.value
  pendingAction.value = null

  if (waiting?.type === 'edit') openEditor(waiting.date)
  else closeEditor()
}

/**
 * Save the draft, then do what was waiting. A refused save shows the store's own
 * message, exactly as saving from the form does.
 */
function saveAndCarryOn() {
  const waiting = pendingAction.value
  const date = editedDate.value
  pendingAction.value = null

  if (date) emit('update-date', { date, change: datePayloadOf(editDraft.value) })

  if (waiting?.type === 'edit') openEditor(waiting.date)
  else closeEditor()
}

/** Save from the open editor, with nothing waiting behind it. */
function submitEdit() {
  const date = editedDate.value
  if (!date) return

  emit('update-date', { date, change: datePayloadOf(editDraft.value) })
  closeEditor()
}

/**
 * Offer a new date. An addition, so it leaves whichever editor is open alone: the
 * two drafts are separate and neither can overwrite the other.
 */
function submitOffer() {
  emit('add-date', datePayloadOf(offerDraft.value))
  offerDraft.value = emptyDateForm()
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <BaseButton variant="link" @click="emit('back')">← All plans</BaseButton>
        <h3 class="section-heading">
          {{ plan.title }}
          <span v-if="!isOpen" class="badge badge-secondary ml-1">Decided</span>
        </h3>
        <p v-if="chosenDate" class="text-default text-sm">
          Settled on {{ formatPlanDate(chosenDate.date) }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-1">
        <BaseButton v-if="isOpen" variant="ghost" icon="edit" @click="startRenaming">
          Rename
        </BaseButton>
        <BaseButton v-if="!isOpen" variant="default" @click="emit('reopen')">
          Reopen plan
        </BaseButton>
        <BaseButton v-if="canDelete" variant="remove" @click="emit('delete-plan')">
          Delete plan
        </BaseButton>
      </div>
    </div>

    <div v-if="hasConflict" class="error-message mb-4">
      Somebody else changed this plan first. Reopen the planner to see their version
      before saving again.
    </div>

    <MarkdownText v-if="plan.description" :text="plan.description" class="mb-4" />

    <form v-if="isRenaming" class="mb-4 space-y-3" @submit.prevent="submitRename">
      <BaseInput v-model="draftTitle" label="Title" :maxlength="MAX_TITLE_LENGTH" />
      <BaseMarkdownField
        v-model="draftDescription"
        label="Description (optional)"
        :rows="4"
        :maxlength="MAX_DESCRIPTION_LENGTH"
      />
      <div class="flex flex-wrap gap-1">
        <BaseButton type="submit" variant="add" :loading="isSaving">Save</BaseButton>
        <BaseButton variant="ghost" @click="isRenaming = false">Cancel</BaseButton>
      </div>
    </form>

    <h3 class="section-heading mb-2">Dates</h3>

    <p v-if="!plan.dates.length" class="text-muted mb-4">
      Nobody has offered a date yet. Anybody in the plan can add one.
    </p>

    <div class="mb-4 space-y-3">
      <PlannerDateRow
        v-for="date in plan.dates"
        :key="date.id"
        :date="date"
        :roster="roster"
        :current-user-id="currentUserId"
        :is-open="isOpen"
        :is-chosen="String(date.id) === String(plan.decidedDateId)"
        :is-editing="isEditing(date)"
        :can-edit="canEditDate(date)"
        :can-answer="isParticipant"
        @answer="emit('answer', { date, state: $event })"
        @clear-answer="emit('clear-answer', date)"
        @decide="emit('decide', date)"
        @edit="requestEdit(date)"
        @remove="emit('remove-date', date)"
      >
        <!-- This date's editor, in its own row: which one is open is never in doubt. -->
        <template #editor>
          <div class="mt-3 border-t border-subtle pt-3">
            <PlannerDateForm
              v-model="editDraft"
              heading="Correct this date"
              submit-label="Save date"
              show-cancel
              :is-saving="isSaving"
              @save="submitEdit"
              @cancel="requestCloseEditor"
            />
          </div>
        </template>
      </PlannerDateRow>
    </div>

    <PlannerDateForm
      v-if="isOpen"
      v-model="offerDraft"
      class="mb-6"
      heading="Offer another date"
      submit-label="Add date"
      :is-saving="isSaving"
      @save="submitOffer"
    />

    <PlannerRosterPanel
      :members="plan.members"
      :current-user-id="currentUserId"
      :can-manage="canManageMembers"
      :is-open="isOpen"
      @leave="emit('leave')"
      @rejoin="emit('rejoin')"
      @remove-member="emit('remove-member', $event)"
      @add-member="emit('add-member', $event)"
    />

    <PlannerUnsavedChangesDialog
      v-if="pendingAction"
      :subject="editingDay"
      :is-saving="isSaving"
      :can-save="canSaveDraft"
      @save="saveAndCarryOn"
      @discard="discardChanges"
      @continue="pendingAction = null"
    />
  </div>
</template>

