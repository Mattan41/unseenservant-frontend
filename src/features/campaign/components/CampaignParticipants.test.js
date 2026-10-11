import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CampaignParticipants from '@/features/campaign/components/CampaignParticipants.vue'

/**
 * Mutable fixture the mocked stores read from, so each test can pick the
 * signed-in user without re-importing the component.
 */
const state = vi.hoisted(() => ({ campaign: null, userId: null }))

vi.mock('@/features/campaign/campaignStore.js', () => ({
  useCampaignStore: () => ({
    currentCampaign: null,
    fetchCampaign: vi.fn(() => Promise.resolve(state.campaign)),
    searchUsers: vi.fn(() => Promise.resolve([])),
    addParticipantsToCampaign: vi.fn(),
    removeParticipantsFromCampaign: vi.fn(),
    updateParticipantRole: vi.fn(),
    updateParticipantNickname: vi.fn(),
  }),
}))

vi.mock('@/features/user/userStore.js', () => ({
  useUserStore: () => ({ currentUser: { id: state.userId }, userId: state.userId }),
}))

vi.mock('@/stores/notificationStore.js', () => ({
  useNotificationStore: () => ({ addNotification: vi.fn() }),
}))

// Owner is a player (id 10); id 11 is a non-owner GM; id 12 a plain player.
const campaign = {
  id: '1',
  name: 'Test Campaign',
  ownerId: 10,
  participants: [
    { id: 10, nickname: 'Owner', role: 'PLAYER' },
    { id: 11, nickname: 'Gm', role: 'GM' },
    { id: 12, nickname: 'Player', role: 'PLAYER' },
  ],
}

async function mountForUser(userId) {
  state.campaign = campaign
  state.userId = userId
  const wrapper = mount(CampaignParticipants, { props: { campaignId: '1' } })
  await flushPromises()
  return wrapper
}

const buttonLabels = (wrapper) => wrapper.findAll('button').map((button) => button.text())

describe('CampaignParticipants — rights gating', () => {
  it('lets the owner manage the roster, roles and other nicknames', async () => {
    const wrapper = await mountForUser(10)
    const labels = buttonLabels(wrapper)

    expect(wrapper.text()).toContain('Add Participants')
    expect(labels.some((label) => label.startsWith('Change to'))).toBe(true)
    expect(labels).toContain('Remove')
    // The owner edits other people's nicknames, but never their own row.
    expect(labels.filter((label) => label === 'Edit Nickname')).toHaveLength(2)
    // The owner cannot remove themselves.
    expect(labels.filter((label) => label === 'Remove')).toHaveLength(2)
  })

  it('gives a non-owner GM no management actions', async () => {
    const wrapper = await mountForUser(11)

    expect(wrapper.text()).not.toContain('Add Participants')
    expect(buttonLabels(wrapper).some((label) => label.startsWith('Change to'))).toBe(false)
    expect(buttonLabels(wrapper)).not.toContain('Remove')
    expect(buttonLabels(wrapper)).not.toContain('Edit Nickname')
  })

  it('shows a plain player only the roster', async () => {
    const wrapper = await mountForUser(12)

    expect(wrapper.text()).toContain('Owner')
    expect(wrapper.text()).toContain('Gm')
    expect(wrapper.text()).toContain('Player')
    expect(wrapper.text()).not.toContain('Add Participants')
    expect(buttonLabels(wrapper)).not.toContain('Edit Nickname')
    expect(buttonLabels(wrapper)).not.toContain('Remove')
    expect(buttonLabels(wrapper).some((label) => label.startsWith('Change to'))).toBe(false)
  })

  it('marks the campaign owner and the current user in the roster', async () => {
    const wrapper = await mountForUser(12)

    expect(wrapper.text()).toContain('Campaign owner')
    expect(wrapper.text()).toContain('This is you')
  })
})
