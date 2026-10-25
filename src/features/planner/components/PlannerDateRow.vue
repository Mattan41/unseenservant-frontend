<script setup>
/**
 * One candidate date of a plan: the day, its optional window and note, the colour
 * marker for that day, the roll-call of who said what, and the caller's own answer.
 *
 * Presentational. Every style decision it makes goes through `plannerUtils.js` —
 * the level's class, each roll-call badge and which answer button is pressed — so
 * nothing here decides a colour by comparison.
 *
 * When it is the row being edited it says so (a ring, the Edit button gone) and
 * grows the editor its caller passes in the `editor` slot — and **only then**: a row
 * nobody is editing renders exactly what it did before editing existed. One date open
 * at a time is the caller's rule, so the row just shows what it is told.
 */
import { computed } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { ATTENDANCE_OPTIONS } from '@/features/planner/plannerConstants.js'
import {
  answerBadgeClass,
  answerLabel,
  answerOf,
  answerVariant,
  attendanceSummary,
  availabilityLevel,
  availabilityPercent,
  availabilitySurfaceClass,
  formatPlanDate,
  formatTimeRange,
} from '@/features/planner/plannerUtils.js'

const props = defineProps({
  /** A `PlannerDateDTO`. */
  date: {
    type: Object,
    required: true,
  },
  /** The members who count, from `plannerUtils.js:rosterOf`. */
  roster: {
    type: Array,
    required: true,
  },
  currentUserId: {
    type: [Number, String],
    required: true,
  },
  /** A decided plan is read-only until it is reopened. */
  isOpen: {
    type: Boolean,
    default: true,
  },
  /** Whether this is the date a decided plan settled on. */
  isChosen: {
    type: Boolean,
    default: false,
  },
  /** Whether the caller may offer a correction or take the date back. */
  canEdit: {
    type: Boolean,
    default: false,
  },
  /** Whether the caller is in the roster, and may therefore answer. */
  canAnswer: {
    type: Boolean,
    default: true,
  },
  /** Whether this is the row whose editor is open. */
  isEditing: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['answer', 'clear-answer', 'edit', 'remove', 'decide'])

const summary = computed(() => attendanceSummary(props.date, props.roster))
const myAnswer = computed(() => answerOf(props.date, props.currentUserId))
const day = computed(() => formatPlanDate(props.date.date))
const timeRange = computed(() => formatTimeRange(props.date))

/**
 * The row *is* the marker: its background carries the level, so a glance down the
 * list reads the whole plan at once. The percentage and the counts stay as text —
 * colour is never the only signal.
 */
const surfaceClass = computed(() => availabilitySurfaceClass(availabilityLevel(summary.value)))
const percent = computed(() => availabilityPercent(summary.value))
const counts = computed(() => `${summary.value.yes}/${summary.value.rosterSize}`)

/** One click answers; clicking the answer you already gave takes it back. */
function onClickAnswer(state) {
  if (state === myAnswer.value) {
    emit('clear-answer')
    return
  }
  emit('answer', state)
}
</script>

<template>
  <div
    class="rounded-lg border p-3"
    :class="[
      surfaceClass,
      { 'planner-date--chosen': isChosen, 'planner-date--editing': isEditing },
    ]"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-default font-semibold">
          {{ day }}
          <span v-if="timeRange" class="text-muted font-normal">· {{ timeRange }}</span>
        </p>
        <p v-if="date.note" class="text-muted text-xs">{{ date.note }}</p>
      </div>

      <p class="text-default text-sm font-semibold" :title="`${counts} of the plan said yes`">
        {{ percent }} <span class="text-muted text-xs">({{ counts }})</span>
      </p>
    </div>

    <!-- The roll-call: who said what, so nobody has to guess why a day is orange -->
    <ul class="mt-2 flex flex-wrap gap-1">
      <li v-for="member in roster" :key="member.userId">
        <span class="badge" :class="answerBadgeClass(answerOf(date, member.userId))">
          {{ member.nickname }}: {{ answerLabel(answerOf(date, member.userId)) }}
        </span>
      </li>
    </ul>

    <div class="mt-3 flex flex-wrap items-center gap-1">
      <BaseButton
        v-for="option in ATTENDANCE_OPTIONS"
        :key="option.state"
        :variant="answerVariant(option.state, myAnswer)"
        :icon="option.icon"
        :disabled="!isOpen || !canAnswer"
        @click="onClickAnswer(option.state)"
      >
        {{ option.label }}
      </BaseButton>

      <span class="grow" />

      <BaseButton
        v-if="isOpen"
        variant="add"
        icon="check"
        @click="emit('decide')"
      >
        Decide on this day
      </BaseButton>
      <BaseButton v-if="canEdit && isOpen && !isEditing" variant="ghost" icon="edit" @click="emit('edit')">
        Edit
      </BaseButton>
      <BaseButton v-if="canEdit && isOpen" variant="remove" @click="emit('remove')">
        Remove
      </BaseButton>
    </div>

    <p v-if="!canAnswer" class="text-muted mt-2 text-xs">
      You are not in this plan, so your answer does not count towards its days.
    </p>

    <!--
      The editor, and *only* while this is the row that has it open: collapsed rows
      look exactly like they did before editing existed. The caller passes its content
      through the slot, so `v-if` here is what keeps one date's editor from existing at
      all in the other rows.
    -->
    <slot v-if="isEditing" name="editor" />
  </div>
</template>
