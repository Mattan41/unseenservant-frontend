import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import guestAxios from '@/api/lib/guest-axios.js'
import { seedGuestStorage } from '@/data/demoData.js'
import { useAuthStore } from '@/features/auth/authStore.js'

/**
 * The planner in Guest Demo, end to end through the local adapter.
 *
 * The rules are the backend's: the add-on gates the endpoints, the roster is the
 * campaign's participants minus the plan's exclusions, an answer is one row per
 * member and date, and a decided plan stops moving until it is reopened.
 */
const CAMPAIGN = 'guest_campaign_1'
const ME = 'guest_demo'
const OTHER = 'guest_player_1'

const read = (key) => JSON.parse(localStorage.getItem(key))
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value))

function startGuestSession() {
  setActivePinia(createPinia())
  localStorage.clear()
  seedGuestStorage()
  useAuthStore().isGuest = true
}

const listPlans = async () => (await guestAxios.get(`api/planner/campaign/${CAMPAIGN}/plans`)).data

const createPlan = async (title) =>
  (await guestAxios.post(`api/planner/campaign/${CAMPAIGN}/plans`, { title, description: '' })).data

const addDate = async (planId, date) =>
  (await guestAxios.post(`api/planner/plans/${planId}/dates`, { date })).data

describe('guest planner', () => {
  beforeEach(startGuestSession)

  it('lists the seeded plans, the open one first', async () => {
    const plans = await listPlans()

    expect(plans.map((plan) => plan.status)).toEqual(['OPEN', 'DECIDED'])
    expect(plans[0].title).toContain('Session 12')
    // The roster is implicit: every campaign participant, none of them listed anywhere.
    expect(plans[0].members).toHaveLength(4)
    expect(plans[0].dates).toHaveLength(4)
    // The decided plan has one member out, and their answer is still stored.
    expect(plans[1].members.filter((member) => member.excluded)).toHaveLength(1)
  })

  it('closes the planner while the add-on is off', async () => {
    write(
      'guest_campaigns',
      read('guest_campaigns').map((campaign) => ({ ...campaign, addons: [] })),
    )

    await expect(listPlans()).rejects.toMatchObject({ response: { status: 400 } })
  })

  it('starts a plan and offers a date, refusing the same day twice', async () => {
    const plan = await createPlan('  Weekend trip  ')

    expect(plan.title).toBe('Weekend trip')
    expect(plan.status).toBe('OPEN')
    expect(plan.createdByUserId).toBe(ME)

    const withDate = await addDate(plan.id, '2026-12-12')
    expect(withDate.dates).toHaveLength(1)
    expect(withDate.dates[0].date).toBe('2026-12-12')

    await expect(addDate(plan.id, '2026-12-12')).rejects.toMatchObject({
      response: { status: 409 },
    })
  })

  it('keeps one answer per member and date, and lets it be changed', async () => {
    const plan = await createPlan('Session 13')
    const dateId = (await addDate(plan.id, '2026-12-19')).dates[0].id

    await guestAxios.put(`api/planner/dates/${dateId}/attendance`, { state: 'YES' })
    const changed = (
      await guestAxios.put(`api/planner/dates/${dateId}/attendance`, { state: 'MAYBE' })
    ).data

    expect(changed.dates[0].attendances).toHaveLength(1)
    expect(changed.dates[0].attendances[0]).toMatchObject({ userId: ME, state: 'MAYBE' })

    const withdrawn = (await guestAxios.delete(`api/planner/dates/${dateId}/attendance`)).data
    expect(withdrawn.dates[0].attendances).toHaveLength(0)
  })

  it('lets a member leave and come back, and keeps their answers', async () => {
    const plan = await createPlan('Session 14')
    const dateId = (await addDate(plan.id, '2026-12-26')).dates[0].id
    await guestAxios.put(`api/planner/dates/${dateId}/attendance`, { state: 'YES' })

    const left = (await guestAxios.delete(`api/planner/plans/${plan.id}/members/me`)).data
    const mine = left.members.find((member) => member.userId === ME)

    expect(mine.excluded).toBe(true)
    expect(mine.removedByOwner).toBe(false)
    expect(left.dates[0].attendances).toHaveLength(1)

    const rejoined = (await guestAxios.put(`api/planner/plans/${plan.id}/members/me`)).data
    expect(rejoined.members.find((member) => member.userId === ME).excluded).toBe(false)
  })

  it('records the campaign owner’s removal as theirs to undo', async () => {
    const plan = await createPlan('Session 15')

    const removed = (await guestAxios.delete(`api/planner/plans/${plan.id}/members/${OTHER}`)).data

    expect(removed.members.find((member) => member.userId === OTHER)).toMatchObject({
      excluded: true,
      removedByOwner: true,
    })
    expect(
      read('guest_planner_exclusions').find((row) => row.planId === plan.id && row.userId === OTHER)
        .removedByOwner,
    ).toBe(true)
  })

  it('lets the owner put a member back, and does nothing when they are not out', async () => {
    const plan = await createPlan('Session 17')

    const removed = (await guestAxios.delete(`api/planner/plans/${plan.id}/members/${OTHER}`)).data
    expect(removed.members.find((member) => member.userId === OTHER).excluded).toBe(true)

    const back = (await guestAxios.put(`api/planner/plans/${plan.id}/members/${OTHER}`)).data

    expect(back.members.find((member) => member.userId === OTHER)).toMatchObject({
      excluded: false,
      removedByOwner: false,
    })
    expect(read('guest_planner_exclusions').filter((row) => row.planId === plan.id)).toHaveLength(0)

    // Nobody is out now, so asking again changes nothing rather than failing.
    const again = (await guestAxios.put(`api/planner/plans/${plan.id}/members/${OTHER}`)).data
    expect(again.members.filter((member) => member.excluded)).toHaveLength(0)
  })

  it('decides on one of the plan’s own dates and freezes it until it is reopened', async () => {
    const plan = await createPlan('Session 16')
    const dateId = (await addDate(plan.id, '2027-01-09')).dates[0].id

    await expect(
      guestAxios.patch(`api/planner/plans/${plan.id}/status`, {
        status: 'DECIDED',
        decidedDateId: 'nope',
        version: 0,
      }),
    ).rejects.toMatchObject({ response: { status: 400 } })

    const decided = (
      await guestAxios.patch(`api/planner/plans/${plan.id}/status`, {
        status: 'DECIDED',
        decidedDateId: dateId,
        version: 0,
      })
    ).data

    expect(decided.status).toBe('DECIDED')
    expect(decided.decidedDateId).toBe(dateId)

    await expect(addDate(plan.id, '2027-01-16')).rejects.toMatchObject({
      response: { status: 400 },
    })

    const reopened = (
      await guestAxios.patch(`api/planner/plans/${plan.id}/status`, {
        status: 'OPEN',
        version: 1,
      })
    ).data

    expect(reopened.status).toBe('OPEN')
    expect(reopened.decidedDateId).toBeNull()
  })

  it('deletes a plan with its dates and answers', async () => {
    const plan = await createPlan('Session 17')
    const dateId = (await addDate(plan.id, '2027-02-06')).dates[0].id
    await guestAxios.put(`api/planner/dates/${dateId}/attendance`, { state: 'YES' })

    await guestAxios.delete(`api/planner/plans/${plan.id}`)

    expect(read('guest_planner_plans').some((row) => row.id === plan.id)).toBe(false)
    expect(read('guest_planner_dates').some((row) => row.planId === plan.id)).toBe(false)
    expect(read('guest_planner_attendances').some((row) => row.planDateId === dateId)).toBe(false)
  })
})
