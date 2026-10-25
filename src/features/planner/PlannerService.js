import apiClient from '@/api/apiClient'

/**
 * Planner API calls.
 *
 * Every mutation answers with the whole plan (`PlannerPlanDTO`), which is what the
 * store adopts — so one response always describes the new state and the client never
 * patches its own copy. The add-on's own switch lives in `CampaignService`.
 */
const PlannerService = {
  /**
   * A campaign's plans: open ones first, then the decided history.
   * @param {number|string} campaignId
   * @returns {Promise<Array<object>>} PlannerPlanDTO[]
   */
  async fetchPlans(campaignId) {
    const response = await apiClient.get(`api/planner/campaign/${campaignId}/plans`)
    return response.data
  },

  /**
   * Start a plan. Any participant may; the roster is implicit, so this one call
   * puts everybody in it.
   * @param {number|string} campaignId
   * @param {{ title: string, description?: string }} plan
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async createPlan(campaignId, plan) {
    const response = await apiClient.post(`api/planner/campaign/${campaignId}/plans`, {
      title: plan.title,
      description: plan.description ?? '',
    })
    return response.data
  },

  /**
   * Edit a plan's title or description.
   * @param {number|string} planId
   * @param {{ title: string, description?: string, version: number }} plan
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async updatePlan(planId, plan) {
    const response = await apiClient.patch(`api/planner/plans/${planId}`, {
      title: plan.title,
      description: plan.description ?? '',
      version: plan.version,
    })
    return response.data
  },

  /**
   * Decide a plan (`DECIDED` with one of its own dates) or reopen it (`OPEN`,
   * which clears the chosen date).
   * @param {number|string} planId
   * @param {{ status: string, decidedDateId?: number|string|null, version: number }} change
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async updateStatus(planId, change) {
    const response = await apiClient.patch(`api/planner/plans/${planId}/status`, {
      status: change.status,
      decidedDateId: change.decidedDateId ?? null,
      version: change.version,
    })
    return response.data
  },

  /**
   * Delete a plan with its dates and answers (its creator or the campaign owner).
   * @param {number|string} planId
   * @returns {Promise<void>}
   */
  async deletePlan(planId) {
    await apiClient.delete(`api/planner/plans/${planId}`)
  },

  /**
   * Offer a date. The day is required; the times and the note are not.
   * @param {number|string} planId
   * @param {{ date: string, startTime?: string|null, endTime?: string|null, note?: string|null }} date
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async addDate(planId, date) {
    const response = await apiClient.post(`api/planner/plans/${planId}/dates`, {
      date: date.date,
      startTime: date.startTime || null,
      endTime: date.endTime || null,
      note: date.note || null,
    })
    return response.data
  },

  /**
   * Correct a date the caller may change (its offerer, the plan's creator or the
   * campaign owner).
   * @param {number|string} dateId
   * @param {{ date: string, startTime?: string|null, endTime?: string|null, note?: string|null, version: number }} date
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async updateDate(dateId, date) {
    const response = await apiClient.patch(`api/planner/dates/${dateId}`, {
      date: date.date,
      startTime: date.startTime || null,
      endTime: date.endTime || null,
      note: date.note || null,
      version: date.version,
    })
    return response.data
  },

  /**
   * Withdraw a date, with the answers given for it.
   * @param {number|string} dateId
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async deleteDate(dateId) {
    const response = await apiClient.delete(`api/planner/dates/${dateId}`)
    return response.data
  },

  /**
   * Mark whether the caller can attend one date: `YES`, `NO` or `MAYBE`.
   * @param {number|string} dateId
   * @param {string} state
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async setAttendance(dateId, state) {
    const response = await apiClient.put(`api/planner/dates/${dateId}/attendance`, { state })
    return response.data
  },

  /**
   * Withdraw the caller's answer, back to "not answered".
   * @param {number|string} dateId
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async clearAttendance(dateId) {
    const response = await apiClient.delete(`api/planner/dates/${dateId}/attendance`)
    return response.data
  },

  /**
   * Rejoin a plan the caller left (a removal by the campaign owner is refused).
   * @param {number|string} planId
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async rejoinPlan(planId) {
    const response = await apiClient.put(`api/planner/plans/${planId}/members/me`)
    return response.data
  },

  /**
   * Leave a plan: the caller is out of the roster; their answers wait for them.
   * @param {number|string} planId
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async leavePlan(planId) {
    const response = await apiClient.delete(`api/planner/plans/${planId}/members/me`)
    return response.data
  },

  /**
   * Remove another participant from a plan (campaign owner only).
   * @param {number|string} planId
   * @param {number|string} memberId
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async removeMember(planId, memberId) {
    const response = await apiClient.delete(`api/planner/plans/${planId}/members/${memberId}`)
    return response.data
  },

  /**
   * Put another participant back into a plan (campaign owner only) — the way back
   * for somebody the owner removed, whose own rejoin is refused. Their answers were
   * kept, so they count again at once.
   * @param {number|string} planId
   * @param {number|string} memberId
   * @returns {Promise<object>} PlannerPlanDTO
   */
  async addMember(planId, memberId) {
    const response = await apiClient.put(`api/planner/plans/${planId}/members/${memberId}`)
    return response.data
  },
}

export default PlannerService
