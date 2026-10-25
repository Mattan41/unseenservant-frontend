import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PlannerRosterPanel from '@/features/planner/components/PlannerRosterPanel.vue'

/**
 * The roster.
 *
 * The part that matters here: somebody the campaign owner took out has no way back
 * of their own, so the owner needs a control that puts them back — and nobody else
 * needs one.
 */
const members = [
  { userId: 7, nickname: 'User7', role: 'GM', excluded: false, removedByOwner: false },
  { userId: 8, nickname: 'User8', role: 'PLAYER', excluded: true, removedByOwner: true },
  { userId: 9, nickname: 'User9', role: 'PLAYER', excluded: true, removedByOwner: false },
]

const mountPanel = ({ canManage = false, isOpen = true } = {}) =>
  mount(PlannerRosterPanel, {
    props: { members, currentUserId: 7, canManage, isOpen },
  })

const putBackButtons = (wrapper) =>
  wrapper.findAll('button').filter((button) => button.text() === 'Put back')

describe('PlannerRosterPanel', () => {
  it('offers the owner a way back for everybody who is out', async () => {
    const wrapper = mountPanel({ canManage: true })

    expect(putBackButtons(wrapper)).toHaveLength(2)

    await putBackButtons(wrapper)[0].trigger('click')

    expect(wrapper.emitted('add-member')[0][0]).toBe(8)
  })

  it('offers nobody else one', () => {
    expect(putBackButtons(mountPanel({ canManage: false }))).toHaveLength(0)
  })

  it('hides it on a decided plan, which is frozen until it is reopened', () => {
    expect(putBackButtons(mountPanel({ canManage: true, isOpen: false }))).toHaveLength(0)
  })
})
