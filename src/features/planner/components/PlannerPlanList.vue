<script setup>
/**
 * The planner's first view: the plans still open, then the decided ones.
 *
 * Presentational. Each card shows how a plan is doing — its best-attended day and
 * that day's level — so the list answers "is this settled?" without opening
 * anything. The level is carried by that line's **background**, not by a badge, the
 * same way a date row carries it in the detail view; the percentage stays as text,
 * so colour is never the only signal. Both come from `plannerUtils.js`.
 */
import { computed } from 'vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import {
  attendanceSummary,
  availabilityLabel,
  availabilityLevel,
  availabilityPercent,
  availabilitySurfaceClass,
  bestDate,
  formatPlanDate,
  isDecided,
  rosterOf,
} from '@/features/planner/plannerUtils.js'

const props = defineProps({
  openPlans: {
    type: Array,
    default: () => [],
  },
  decidedPlans: {
    type: Array,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['create', 'select'])

/** The plan's best day and its level, worked out once per plan for the card. */
function planProgress(plan) {
  const date = bestDate(plan)
  const roster = rosterOf(plan)
  const summary = date ? attendanceSummary(date, roster) : null
  const level = summary ? availabilityLevel(summary) : null

  return {
    date,
    surfaceClass: level ? availabilitySurfaceClass(level) : '',
    percent: summary ? availabilityPercent(summary) : '',
    label: level ? availabilityLabel(level) : '',
    counts: summary ? `${summary.yes}/${summary.rosterSize}` : '',
    rosterSize: roster.length,
    dateCount: (plan.dates || []).length,
  }
}

/** A decided plan's chosen day, as a person reads it. */
function decidedDay(plan) {
  const chosen = (plan.dates || []).find((date) => String(date.id) === String(plan.decidedDateId))
  return chosen ? formatPlanDate(chosen.date) : ''
}

const hasAnyPlan = computed(
  () => props.openPlans.length > 0 || props.decidedPlans.length > 0,
)
</script>

<template>
  <div>
    <p v-if="isLoading" class="text-muted">Loading the plans…</p>

    <template v-else>
      <p v-if="!hasAnyPlan" class="text-muted mb-4">
        No plans yet. A plan is a question with dates attached — "when do we play
        next?", "which weekend works?" — and everyone in the campaign answers it.
      </p>

      <BaseButton variant="tile" icon="planner" class="mb-4" @click="emit('create')">
        Start a plan
      </BaseButton>

      <h3 v-if="openPlans.length" class="section-heading mb-2">Open plans</h3>
      <div class="mb-4 grid gap-3 sm:grid-cols-2">
        <BaseCard v-for="plan in openPlans" :key="plan.id" clickable @click="emit('select', plan.id)">
          <p class="text-heading font-semibold">{{ plan.title }}</p>
          <p class="text-muted text-xs">
            {{ planProgress(plan).dateCount }} date(s) offered ·
            {{ planProgress(plan).rosterSize }} in the plan
          </p>
          <!-- The best day *is* the marker: its background carries the level. -->
          <div
            v-if="planProgress(plan).date"
            class="mt-2 flex items-center justify-between gap-2 rounded px-2 py-1 text-sm"
            :class="planProgress(plan).surfaceClass"
            :title="`${planProgress(plan).label}: ${planProgress(plan).counts} of the plan said yes`"
          >
            <span class="text-default">{{ formatPlanDate(planProgress(plan).date.date) }}</span>
            <span class="text-default font-semibold">{{ planProgress(plan).percent }}</span>
          </div>
          <p v-else class="text-muted mt-2 text-sm">No dates offered yet.</p>
        </BaseCard>
      </div>

      <h3 v-if="decidedPlans.length" class="section-heading mb-2">Decided plans</h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <BaseCard
          v-for="plan in decidedPlans"
          :key="plan.id"
          clickable
          @click="emit('select', plan.id)"
        >
          <p class="text-heading font-semibold">
            {{ plan.title }}
            <span class="badge badge-secondary ml-1">Decided</span>
          </p>
          <p class="text-default text-sm">
            {{ decidedDay(plan) || 'Decided without a date' }}
          </p>
          <p class="text-muted text-xs">
            {{ planProgress(plan).dateCount }} date(s) · {{ planProgress(plan).rosterSize }} in the plan
            <span v-if="isDecided(plan)"> · reopen it to change anything</span>
          </p>
        </BaseCard>
      </div>
    </template>
  </div>
</template>
