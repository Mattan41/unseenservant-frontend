import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import CampaignService from '@/features/campaign/CampaignService.js'
import { recordView, viewHistory } from '@/utils/viewHistory.js'

vi.mock('@/features/campaign/CampaignService.js', () => ({
  default: {
    fetchAllCampaignsForCurrentUser: vi.fn(),
    fetchCampaign: vi.fn(),
  },
}))

const USER = { id: 7, username: 'player', role: 'USER' }
const OTHER_USER_ID = 8

const CAMPAIGNS = [
  { id: 1, name: 'Alpha', participants: [] },
  { id: 2, name: 'Bravo', participants: [{ id: 7, nickname: 'Me', role: 'GM' }] },
  { id: 3, name: 'Charlie', participants: [] },
]

const ids = (items) => items.map((item) => item.id)

describe('campaignStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    // Module-level state, shared between tests.
    viewHistory.value = {}
    useUserStore().currentUser = USER
    CampaignService.fetchAllCampaignsForCurrentUser.mockResolvedValue(CAMPAIGNS)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('sortedCampaigns', () => {
    it('keeps the order the backend returned while nothing has been viewed', async () => {
      const store = useCampaignStore()

      await store.fetchAllCampaignsForCurrentUser()

      expect(ids(store.sortedCampaigns)).toEqual([1, 2, 3])
    })

    it('re-sorts as soon as a campaign is viewed, without refetching', async () => {
      const store = useCampaignStore()
      await store.fetchAllCampaignsForCurrentUser()

      recordView('campaign', 3, USER.id)

      expect(ids(store.sortedCampaigns)).toEqual([3, 1, 2])
    })

    it('orders by the most recent view', async () => {
      const store = useCampaignStore()
      await store.fetchAllCampaignsForCurrentUser()

      // Fake timers keep the two views a known millisecond apart: equal
      // timestamps tie, and a tie keeps the backend order.
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'))
      recordView('campaign', 1, USER.id)
      vi.setSystemTime(new Date('2024-01-01T10:00:01Z'))
      recordView('campaign', 2, USER.id)

      expect(ids(store.sortedCampaigns)).toEqual([2, 1, 3])
    })

    it("ignores another user's view history", async () => {
      const store = useCampaignStore()
      await store.fetchAllCampaignsForCurrentUser()

      recordView('campaign', 3, OTHER_USER_ID)

      expect(ids(store.sortedCampaigns)).toEqual([1, 2, 3])
    })

    it('leaves the raw list in backend order', async () => {
      const store = useCampaignStore()
      await store.fetchAllCampaignsForCurrentUser()

      recordView('campaign', 3, USER.id)

      expect(ids(store.campaigns)).toEqual([1, 2, 3])
    })
  })

  describe('getCharactersByCampaignId', () => {
    it('returns the party in the fixed order for the viewer', async () => {
      const store = useCampaignStore()
      await store.fetchAllCampaignsForCurrentUser()
      store.currentCampaign = {
        id: 2,
        participants: [
          { id: 7, nickname: 'Me', role: 'GM' },
          { id: 9, nickname: 'Other', role: 'PLAYER' },
        ],
      }
      store.campaignCharacters = {
        2: [
          { id: 11, name: 'Zed', ownerId: 9 },
          { id: 12, name: 'Ami', ownerId: 7 },
        ],
      }

      expect(store.getCharactersByCampaignId(2).map((character) => character.name)).toEqual([
        'Ami',
        'Zed',
      ])
    })

    it('returns an empty list for a campaign without characters', () => {
      const store = useCampaignStore()

      expect(store.getCharactersByCampaignId(99)).toEqual([])
    })
  })

  describe('isUserGM', () => {
    it('reads the role from the cached list entry', async () => {
      const store = useCampaignStore()
      await store.fetchAllCampaignsForCurrentUser()

      expect(store.isUserGM(2, USER.id)).toBe(true)
      expect(store.isUserGM(2, 9)).toBe(false)
      expect(store.isUserGM(99, USER.id)).toBe(false)
    })
  })
})
