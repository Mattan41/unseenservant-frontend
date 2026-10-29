<script setup>
/**
 * A plan's roster: who is in it, who is out, and how each of them gets back in — the
 * campaign owner puts somebody back, while a member who left themselves rejoins.
 *
 * Presentational — the rights it shows are the ones it is handed (`canManage` is the
 * campaign owner, `isParticipant` is the caller's own seat), and it only says what
 * the reader did. The rules themselves live in `campaignPermissions.js` and, for
 * real, in the backend.
 */
import { computed } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { excludedOf, rosterOf } from '@/features/planner/plannerUtils.js'

const props = defineProps({
  /** Every participant, each flagged if they are out (a `PlannerPlanDTO.members`). */
  members: {
    type: Array,
    required: true,
  },
  currentUserId: {
    type: [Number, String],
    required: true,
  },
  /** Whether the caller owns the campaign, and may remove somebody else. */
  canManage: {
    type: Boolean,
    default: false,
  },
  /** A decided plan is read-only until it is reopened. */
  isOpen: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['remove-member', 'add-member', 'leave', 'rejoin'])

const roster = computed(() => rosterOf({ members: props.members }))
const excluded = computed(() => excludedOf({ members: props.members }))

const me = computed(
  () =>
    props.members.find((member) => String(member.userId) === String(props.currentUserId)) || null,
)

/** The caller has a seat: their answers count. */
const isParticipant = computed(() => Boolean(me.value) && !me.value.excluded)

/** They were taken out by the owner, so only the owner puts them back. */
const removedByOwner = computed(() => Boolean(me.value?.excluded && me.value.removedByOwner))
</script>

<template>
  <div>
    <h3 class="section-heading mb-2">Roster</h3>
    <p class="text-muted mb-2 text-sm">
      Everybody in the campaign is in this plan. Leaving it costs you nothing but your seat on the
      dates — your answers are kept, and the campaign owner can put you back.
    </p>

    <ul class="flex flex-wrap gap-1">
      <li v-for="member in roster" :key="member.userId">
        <span class="badge badge-secondary">
          {{ member.nickname }}
          <span v-if="member.role === 'GM'" class="text-muted"> · GM</span>
        </span>
        <BaseButton
          v-if="canManage && isOpen && String(member.userId) !== String(currentUserId)"
          variant="remove"
          class="ml-1"
          @click="emit('remove-member', member.userId)"
        >
          Remove
        </BaseButton>
      </li>
    </ul>

    <ul v-if="excluded.length" class="mt-3 space-y-1">
      <li v-for="member in excluded" :key="member.userId" class="text-muted text-sm">
        {{ member.nickname }} —
        {{ member.removedByOwner ? 'removed by the campaign owner' : 'left this plan' }}
        <!-- The way back for somebody the owner took out: their own rejoin is refused. -->
        <BaseButton
          v-if="canManage && isOpen"
          variant="default"
          class="ml-1"
          @click="emit('add-member', member.userId)"
        >
          Put back
        </BaseButton>
      </li>
    </ul>

    <div class="mt-3">
      <BaseButton v-if="isParticipant && isOpen" variant="ghost" @click="emit('leave')">
        Leave this plan
      </BaseButton>
      <BaseButton
        v-else-if="me && !removedByOwner && isOpen"
        variant="default"
        @click="emit('rejoin')"
      >
        Rejoin this plan
      </BaseButton>
      <p v-else-if="removedByOwner" class="text-muted text-sm">
        The campaign owner removed you from this plan. Ask them to add you back.
      </p>
    </div>
  </div>
</template>
