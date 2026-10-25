import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import PlannerService from './PlannerService.js'
import { isDecided } from './plannerUtils.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { extractErrorMessage } from '@/utils/errorUtils.js'

/** One notification, with the notification store's own defaults. */
function notify(message, type = 'error', duration = 3000) {
  useNotificationStore().addNotification(message, type, duration)
}

/**
 * The planner of one campaign: its plans, and the one being looked at.
 *
 * Every planner endpoint answers with the whole plan, so this store adopts what
 * comes back instead of patching its own copy — one response always describes the
 * new state. A stale write comes back as 409 and is surfaced as a conflict, never
 * silently retried.
 *
 * The availability level is not stored either: `plannerUtils.js` works it out from the
 * plan, so a level can never disagree with the answers it came from.
 */
export const usePlannerStore = defineStore('planner', () => {
  // ==========================================================================
  // State
  // ==========================================================================
  const campaignId = ref(null)
  const plans = ref([])
  const currentPlanId = ref(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  /** Set when a save was refused because somebody else changed the plan first. */
  const hasConflict = ref(false)
  const error = ref(null)

  // ==========================================================================
  // Derived
  // ==========================================================================
  /** The plans still being filled in — what the planner leads with. */
  const openPlans = computed(() => plans.value.filter((plan) => !isDecided(plan)))

  /**
   * The settled plans: the planner's history. Deciding is what changes their
   * order, so those actions refetch the list — the server keeps that rule rather
   * than the client re-sorting its own copy.
   */
  const decidedPlans = computed(() => plans.value.filter(isDecided))

  const currentPlan = computed(
    () => plans.value.find((plan) => String(plan.id) === String(currentPlanId.value)) || null,
  )

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Replace a plan with the version the server just returned, or add it when it is
   * new. Returns it, so an action can hand it on.
   */
  function adopt(plan) {
    if (!plan) return null

    const known = plans.value.some((existing) => String(existing.id) === String(plan.id))
    plans.value = known
      ? plans.value.map((existing) => (String(existing.id) === String(plan.id) ? plan : existing))
      : [...plans.value, plan]

    return plan
  }

  /**
   * One place where a failed action becomes a notification — and where a 409 is
   * recognised as a conflict rather than a failure: the caller's copy is old.
   *
   * @param {Function} action the request to run
   * @param {string} failureMessage the sentence to show when it fails
   * @returns {Promise<object|null>} the response body, or null when it failed
   */
  async function run(action, failureMessage) {
    isSaving.value = true
    hasConflict.value = false

    try {
      return await action()
    } catch (err) {
      console.error(failureMessage, err)
      if (err?.response?.status === 409) {
        hasConflict.value = true
        notify('Someone else changed this plan first. Reload to see their version.', 'error')
      } else if (!err.handled) {
        notify(extractErrorMessage(err, failureMessage))
      }
      return null
    } finally {
      isSaving.value = false
    }
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /** Load a campaign's plans. Opening the planner is a read, so it writes nothing. */
  async function fetchPlans(id) {
    campaignId.value = id
    isLoading.value = true
    error.value = null
    hasConflict.value = false

    try {
      plans.value = (await PlannerService.fetchPlans(id)) || []
      return plans.value
    } catch (err) {
      console.error('Failed to load the planner:', err)
      error.value = 'Failed to load the planner.'
      if (!err.handled) {
        notify(extractErrorMessage(err, 'Failed to load the planner.'))
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  /** Start a plan. Any participant may, and the roster is everybody already. */
  async function createPlan({ title, description = '' }) {
    const plan = await run(
      () => PlannerService.createPlan(campaignId.value, { title, description }),
      'Could not start that plan.',
    )
    if (!plan) return null

    const created = adopt(plan)
    currentPlanId.value = created.id
    notify('Plan started.', 'success')
    return created
  }

  /** Edit a plan's title or description. */
  async function updatePlan(plan, { title, description = '' }) {
    return adopt(
      await run(
        () => PlannerService.updatePlan(plan.id, { title, description, version: plan.version }),
        'Could not save the plan.',
      ),
    )
  }

  /** Settle a plan on one of its dates; the list order changes, so refetch. */
  async function decidePlan(plan, dateId) {
    const decided = await run(
      () =>
        PlannerService.updateStatus(plan.id, {
          status: 'DECIDED',
          decidedDateId: dateId,
          version: plan.version,
        }),
      'Could not decide that plan.',
    )
    if (!decided) return null

    adopt(decided)
    notify('Plan decided.', 'success')
    await fetchPlans(campaignId.value)
    return decided
  }

  /** Reopen a decided plan so dates, answers and the roster can change again. */
  async function reopenPlan(plan) {
    const reopened = await run(
      () => PlannerService.updateStatus(plan.id, { status: 'OPEN', version: plan.version }),
      'Could not reopen that plan.',
    )
    if (!reopened) return null

    adopt(reopened)
    notify('Plan reopened.', 'success')
    await fetchPlans(campaignId.value)
    return reopened
  }

  /** Open one plan in the section, or close it again with `null`. */
  function selectPlan(planId) {
    currentPlanId.value = planId
  }

  /** Delete a plan with its dates and answers (its creator or the campaign owner). */
  async function deletePlan(plan) {
    const done = await run(() => PlannerService.deletePlan(plan.id), 'Could not delete that plan.')
    if (done === null) return false

    plans.value = plans.value.filter((existing) => String(existing.id) !== String(plan.id))
    if (String(currentPlanId.value) === String(plan.id)) currentPlanId.value = null
    notify('Plan deleted.', 'success')
    return true
  }

  /** Offer a date. The day is required; times and note are not. */
  async function addDate(plan, date) {
    return adopt(await run(() => PlannerService.addDate(plan.id, date), 'Could not add that date.'))
  }

  /** Correct a date the caller may change. */
  async function updateDate(date, change) {
    return adopt(
      await run(
        () => PlannerService.updateDate(date.id, { ...change, version: date.version }),
        'Could not change that date.',
      ),
    )
  }

  /** Withdraw a date, with the answers given for it. */
  async function deleteDate(date) {
    return adopt(await run(() => PlannerService.deleteDate(date.id), 'Could not remove that date.'))
  }

  /** Mark whether the caller can attend one date: YES, NO or MAYBE. */
  async function setAttendance(date, state) {
    return adopt(
      await run(() => PlannerService.setAttendance(date.id, state), 'Could not save your answer.'),
    )
  }

  /** Withdraw the caller's answer, back to "not answered". */
  async function clearAttendance(date) {
    return adopt(
      await run(() => PlannerService.clearAttendance(date.id), 'Could not clear your answer.'),
    )
  }

  /** Leave a plan: out of the roster, answers kept for a return. */
  async function leavePlan(plan) {
    const left = await run(() => PlannerService.leavePlan(plan.id), 'Could not leave that plan.')
    if (!left) return null

    adopt(left)
    notify('You are out of this plan.', 'success')
    return left
  }

  /** Rejoin a plan the caller left (a removal by the owner is refused). */
  async function rejoinPlan(plan) {
    return adopt(await run(() => PlannerService.rejoinPlan(plan.id), 'Could not rejoin that plan.'))
  }

  /** Remove another participant (campaign owner only). */
  async function removeMember(plan, memberId) {
    return adopt(
      await run(() => PlannerService.removeMember(plan.id, memberId), 'Could not remove that member.'),
    )
  }

  /**
   * Put another participant back (campaign owner only). The way back for somebody
   * the owner removed — their own rejoin is refused — and their answers are intact,
   * so they count towards the dates again straight away.
   */
  async function addMember(plan, memberId) {
    return adopt(
      await run(() => PlannerService.addMember(plan.id, memberId), 'Could not put that member back.'),
    )
  }

  /** Drop everything (leaving the campaign, or switching to another one). */
  function clearPlanner() {
    campaignId.value = null
    plans.value = []
    currentPlanId.value = null
    isLoading.value = false
    isSaving.value = false
    hasConflict.value = false
    error.value = null
  }

  return {
    // State
    campaignId,
    plans,
    currentPlanId,
    isLoading,
    isSaving,
    hasConflict,
    error,

    // Derived
    openPlans,
    decidedPlans,
    currentPlan,

    // Actions
    fetchPlans,
    createPlan,
    updatePlan,
    decidePlan,
    reopenPlan,
    deletePlan,
    addDate,
    updateDate,
    deleteDate,
    setAttendance,
    clearAttendance,
    leavePlan,
    rejoinPlan,
    removeMember,
    addMember,
    selectPlan,
    clearPlanner,
  }
})
