import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlannerStore } from '@/features/planner/plannerStore.js'
import PlannerService from '@/features/planner/PlannerService.js'

vi.mock('@/features/planner/PlannerService.js', () => ({
  default: {
    fetchPlans: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    updateStatus: vi.fn(),
    deletePlan: vi.fn(),
    addDate: vi.fn(),
    updateDate: vi.fn(),
    deleteDate: vi.fn(),
    setAttendance: vi.fn(),
    clearAttendance: vi.fn(),
    leavePlan: vi.fn(),
    rejoinPlan: vi.fn(),
    removeMember: vi.fn(),
    addMember: vi.fn(),
  },
}))

const CAMPAIGN_ID = 1

const plan = (id, status = 'OPEN') => ({
  id,
  campaignId: CAMPAIGN_ID,
  title: `Plan ${id}`,
  description: '',
  status,
  decidedDateId: null,
  createdByUserId: 7,
  version: 0,
  dates: [],
  members: [],
})

/** An axios-shaped rejection, the way the stores branch on one. */
const rejection = (status, message = 'nope') => {
  const error = new Error(message)
  error.response = { status, data: { detail: message } }
  return error
}

describe('plannerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads a campaign’s plans and groups them for the list', async () => {
    PlannerService.fetchPlans.mockResolvedValue([plan(1), plan(2, 'DECIDED'), plan(3)])

    const store = usePlannerStore()
    await store.fetchPlans(CAMPAIGN_ID)

    expect(PlannerService.fetchPlans).toHaveBeenCalledWith(CAMPAIGN_ID)
    expect(store.plans.map((p) => p.id)).toEqual([1, 2, 3])
    expect(store.openPlans.map((p) => p.id)).toEqual([1, 3])
    expect(store.decidedPlans.map((p) => p.id)).toEqual([2])
  })

  it('starts a plan, adopts it, and opens it', async () => {
    const created = { ...plan(9), title: 'Session 12' }
    PlannerService.fetchPlans.mockResolvedValue([])
    PlannerService.createPlan.mockResolvedValue(created)

    const store = usePlannerStore()
    await store.fetchPlans(CAMPAIGN_ID)
    await store.createPlan({ title: 'Session 12' })

    expect(store.plans).toHaveLength(1)
    expect(store.currentPlan.id).toBe(9)
    expect(store.currentPlanId).toBe(9)
  })

  it('replaces a plan with the whole plan the server answered with', async () => {
    PlannerService.fetchPlans.mockResolvedValue([plan(1)])
    PlannerService.setAttendance.mockResolvedValue({
      ...plan(1),
      dates: [{ id: 5, date: '2026-03-14', attendances: [{ userId: 7, state: 'YES' }] }],
    })

    const store = usePlannerStore()
    await store.fetchPlans(CAMPAIGN_ID)
    await store.setAttendance({ id: 5 }, 'YES')

    expect(store.plans).toHaveLength(1)
    expect(store.plans[0].dates).toHaveLength(1)
  })

  it('surfaces a 409 as a conflict instead of overwriting the plan', async () => {
    PlannerService.fetchPlans.mockResolvedValue([plan(1)])
    PlannerService.updatePlan.mockRejectedValue(rejection(409))

    const store = usePlannerStore()
    await store.fetchPlans(CAMPAIGN_ID)
    await store.updatePlan(plan(1), { title: 'Renamed' })

    expect(store.hasConflict).toBe(true)
    expect(store.plans[0].title).toBe('Plan 1')
  })

  it('leaves the list alone when a change fails outright', async () => {
    PlannerService.fetchPlans.mockResolvedValue([plan(1)])
    PlannerService.addDate.mockRejectedValue(rejection(400, 'A date is required'))

    const store = usePlannerStore()
    await store.fetchPlans(CAMPAIGN_ID)

    expect(await store.addDate(plan(1), { date: '' })).toBeNull()
    expect(store.plans).toHaveLength(1)
    expect(store.hasConflict).toBe(false)
  })

  it('drops a deleted plan and closes it', async () => {
    PlannerService.fetchPlans.mockResolvedValue([plan(1), plan(2)])
    PlannerService.deletePlan.mockResolvedValue(undefined)

    const store = usePlannerStore()
    await store.fetchPlans(CAMPAIGN_ID)
    store.selectPlan(1)

    expect(await store.deletePlan(plan(1))).toBe(true)
    expect(store.plans.map((p) => p.id)).toEqual([2])
    expect(store.currentPlanId).toBeNull()
  })

  it('deciding refetches the list, because the order changes with the status', async () => {
    PlannerService.fetchPlans.mockResolvedValue([plan(1)])
    PlannerService.updateStatus.mockResolvedValue(plan(1, 'DECIDED'))

    const store = usePlannerStore()
    await store.fetchPlans(CAMPAIGN_ID)
    await store.decidePlan(plan(1), 5)

    expect(PlannerService.updateStatus).toHaveBeenCalledWith(1, {
      status: 'DECIDED',
      decidedDateId: 5,
      version: 0,
    })
    expect(PlannerService.fetchPlans).toHaveBeenCalledTimes(2)
  })

  it('puts a member back and adopts the plan the server answered with', async () => {
    PlannerService.fetchPlans.mockResolvedValue([plan(1)])
    PlannerService.addMember.mockResolvedValue({
      ...plan(1),
      members: [
        { userId: 8, nickname: 'User8', role: 'PLAYER', excluded: false, removedByOwner: false },
      ],
    })

    const store = usePlannerStore()
    await store.fetchPlans(CAMPAIGN_ID)
    await store.addMember(plan(1), 8)

    expect(PlannerService.addMember).toHaveBeenCalledWith(1, 8)
    expect(store.plans[0].members[0].excluded).toBe(false)
  })

  it('clears everything when the section is left', async () => {
    PlannerService.fetchPlans.mockResolvedValue([plan(1)])

    const store = usePlannerStore()
    await store.fetchPlans(CAMPAIGN_ID)
    store.clearPlanner()

    expect(store.plans).toEqual([])
    expect(store.currentPlan).toBeNull()
    expect(store.campaignId).toBeNull()
  })
})
