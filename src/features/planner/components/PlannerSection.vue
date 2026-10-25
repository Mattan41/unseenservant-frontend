<script setup>
/**
 * "Planner" — the container the campaign view renders for its planner section, in
 * the same spirit as `ShipSection` and `JournalBoard`: it talks to its store, and
 * the parts it shows (`PlannerPlanList`, `PlannerPlanDetail`) stay presentational.
 *
 * The section only exists while the add-on is switched on — `CampaignView` filters
 * its navigation on `campaign.addons` — so nothing here has to ask again. What the
 * caller may do comes from `campaignPermissions.js`, and the backend enforces it.
 *
 * The plan on screen is the URL's (`?plan=<id>`), so a refresh or a shared link
 * reopens the same plan instead of dropping back to the list.
 */
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '@/features/planner/plannerStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import {
  getCampaignPermissions,
  sameId,
} from '@/features/campaign/campaignPermissions.js'
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '@/features/planner/plannerConstants.js'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseMarkdownField from '@/components/base/BaseMarkdownField.vue'
import PlannerPlanList from '@/features/planner/components/PlannerPlanList.vue'
import PlannerPlanDetail from '@/features/planner/components/PlannerPlanDetail.vue'

const props = defineProps({
  /** `CampaignResponseDTO` — the section's context, and where the rights come from. */
  campaign: {
    type: Object,
    required: true,
  },
  /** The plan in the URL (`?plan=`), or null for the list. */
  planId: {
    type: [Number, String],
    default: null,
  },
})

const emit = defineEmits(['select-plan'])

const plannerStore = usePlannerStore()
const userStore = useUserStore()
const { openPlans, decidedPlans, currentPlan, isLoading, isSaving, hasConflict } =
  storeToRefs(plannerStore)

const permissions = computed(() => getCampaignPermissions(props.campaign, userStore.userId))

const showCreateForm = ref(false)
const newTitle = ref('')
const newDescription = ref('')

// The plan on screen follows the URL, in both directions: opening a plan writes the
// query (`CampaignView` owns that), and a deep link opens the plan.
watch(
  () => props.planId,
  (id) => plannerStore.selectPlan(id === null || id === undefined ? null : String(id)),
  { immediate: true },
)

// Load once for this campaign, and again when the campaign changes — dropping the
// previous campaign's plans rather than leaving them in the store.
watch(
  () => props.campaign.id,
  (id) => {
    if (!id) return
    plannerStore.clearPlanner()
    plannerStore.fetchPlans(id)
  },
  { immediate: true },
)

function selectPlan(planId) {
  emit('select-plan', planId === null ? null : String(planId))
}

async function createPlan() {
  const created = await plannerStore.createPlan({
    title: newTitle.value,
    description: newDescription.value,
  })
  if (!created) return

  showCreateForm.value = false
  newTitle.value = ''
  newDescription.value = ''
  selectPlan(created.id)
}

/**
 * Whether the caller may correct or take back this date: the member who offered it,
 * the plan's creator, or the campaign owner — the same trio the backend checks.
 */
function canEditDate(date) {
  return (
    sameId(date.createdByUserId, userStore.userId) ||
    sameId(currentPlan.value?.createdByUserId, userStore.userId) ||
    permissions.value.isOwner
  )
}

async function rename(payload) {
  await plannerStore.updatePlan(currentPlan.value, payload)
}

async function addDate(payload) {
  await plannerStore.addDate(currentPlan.value, payload)
}

async function updateDate({ date, change }) {
  await plannerStore.updateDate(date, change)
}

async function removeDate(date) {
  if (!window.confirm('Remove this date, with the answers given for it?')) return
  await plannerStore.deleteDate(date)
}

async function decideDate(date) {
  await plannerStore.decidePlan(currentPlan.value, date.id)
}

async function reopenPlan() {
  await plannerStore.reopenPlan(currentPlan.value)
}

async function deletePlan() {
  if (!window.confirm('Delete this plan, with its dates and answers?')) return
  const deleted = await plannerStore.deletePlan(currentPlan.value)
  if (deleted) selectPlan(null)
}

async function answer({ date, state }) {
  await plannerStore.setAttendance(date, state)
}

async function clearAnswer(date) {
  await plannerStore.clearAttendance(date)
}

async function leavePlan() {
  if (!window.confirm('Leave this plan? Your answers are kept if you come back.')) return
  await plannerStore.leavePlan(currentPlan.value)
}

async function rejoinPlan() {
  await plannerStore.rejoinPlan(currentPlan.value)
}

/** The campaign owner may take somebody else out; removing yourself is leaving. */
async function removeMember(memberId) {
  if (sameId(memberId, userStore.userId)) {
    await leavePlan()
    return
  }
  if (!window.confirm('Remove this member from the plan?')) return
  await plannerStore.removeMember(currentPlan.value, memberId)
}

/**
 * And put them back. No confirmation: nothing is lost by it — a removal keeps every
 * answer, so coming back restores their part of the dates exactly as it was.
 */
async function addMember(memberId) {
  await plannerStore.addMember(currentPlan.value, memberId)
}
</script>

<template>
  <div>
    <PlannerPlanDetail
      v-if="currentPlan"
      :plan="currentPlan"
      :current-user-id="userStore.userId"
      :is-saving="isSaving"
      :has-conflict="hasConflict"
      :can-manage-members="permissions.isOwner"
      :can-delete="sameId(currentPlan.createdByUserId, userStore.userId) || permissions.isOwner"
      :can-edit-date="canEditDate"
      @back="selectPlan(null)"
      @rename="rename"
      @add-date="addDate"
      @update-date="updateDate"
      @remove-date="removeDate"
      @decide="decideDate"
      @reopen="reopenPlan"
      @delete-plan="deletePlan"
      @answer="answer"
      @clear-answer="clearAnswer"
      @leave="leavePlan"
      @rejoin="rejoinPlan"
      @remove-member="removeMember"
      @add-member="addMember"
    />

    <template v-else>
      <form v-if="showCreateForm" class="mb-4 space-y-3" @submit.prevent="createPlan">
        <BaseInput
          v-model="newTitle"
          label="What are you planning?"
          placeholder="Session 12, weekend trip, recording day…"
          :maxlength="MAX_TITLE_LENGTH"
        />
        <BaseMarkdownField
          v-model="newDescription"
          label="Description (optional)"
          :rows="3"
          :maxlength="MAX_DESCRIPTION_LENGTH"
        />
        <div class="flex flex-wrap gap-1">
          <BaseButton
            type="submit"
            variant="add"
            :loading="isSaving"
            :disabled="!newTitle.trim()"
          >
            Start the plan
          </BaseButton>
          <BaseButton variant="ghost" @click="showCreateForm = false">Cancel</BaseButton>
        </div>
      </form>

      <PlannerPlanList
        :open-plans="openPlans"
        :decided-plans="decidedPlans"
        :is-loading="isLoading"
        @create="showCreateForm = true"
        @select="selectPlan"
      />
    </template>
  </div>
</template>

