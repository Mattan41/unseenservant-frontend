import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import guestAxios from '@/api/lib/guest-axios.js'
import { seedGuestStorage } from '@/data/demoData.js'
import { useAuthStore } from '@/features/auth/authStore.js'

/**
 * Guest mode's campaign activity route: the stamps a campaign's section badges
 * and the campaign list's markers are computed from, served from the same seeded
 * data the campaign, ship and message endpoints answer — so the standalone demo
 * cannot drift from what a signed-in user sees.
 */
const TALKED_IN = 'guest_campaign_1'
const WITH_SHIP = 'guest_campaign_4'

const read = (key) => JSON.parse(localStorage.getItem(key))
const campaigns = () => read('guest_campaigns')
const messages = () => read('guest_messages')

function startGuestSession() {
  setActivePinia(createPinia())
  localStorage.clear()
  seedGuestStorage()
  useAuthStore().isGuest = true
}

const fetchActivity = () => guestAxios.get('api/campaigns/activity').then((r) => r.data)

const rowFor = (rows, campaignId) =>
  rows.find((row) => String(row.campaignId) === String(campaignId))

/** The newest `createdAt` among one campaign's stored messages, as epoch ms. */
function newestMessageTime(campaignId) {
  const times = messages()
    .filter((message) => String(message.campaignId) === String(campaignId))
    .map((message) => new Date(message.createdAt).getTime())
  return times.length ? Math.max(...times) : null
}

beforeEach(startGuestSession)

describe('guest campaign activity', () => {
  it('answers one row per campaign, and never reads "activity" as a campaign id', async () => {
    const rows = await fetchActivity()

    expect(rows).toHaveLength(campaigns().length)
    expect(rows.map((row) => String(row.campaignId)).sort()).toEqual(
      campaigns()
        .map((campaign) => String(campaign.id))
        .sort(),
    )
    expect(rowFor(rows, TALKED_IN)).toHaveProperty('lastMessageAt')
  })

  it('reports the newest message of every campaign that has messages', async () => {
    const rows = await fetchActivity()

    for (const campaignId of [TALKED_IN, WITH_SHIP]) {
      expect(new Date(rowFor(rows, campaignId).lastMessageAt).getTime()).toBe(
        newestMessageTime(campaignId),
      )
    }
  })

  it('leaves the message stamp null for a campaign nobody has written in', async () => {
    const silent = campaigns().find((campaign) => newestMessageTime(campaign.id) === null)
    expect(silent).toBeDefined()

    expect(rowFor(await fetchActivity(), silent.id).lastMessageAt).toBeNull()
  })

  it('reports the ship stamp only for the campaign that has a ship', async () => {
    const rows = await fetchActivity()

    expect(rowFor(rows, WITH_SHIP).shipUpdatedAt).toEqual(expect.any(String))
    expect(rowFor(rows, TALKED_IN).shipUpdatedAt).toBeNull()
  })

  it('reports the campaign stamp the campaign endpoint answers', async () => {
    const campaign = campaigns().find((entry) => String(entry.id) === TALKED_IN)

    expect(rowFor(await fetchActivity(), TALKED_IN).campaignUpdatedAt).toBe(campaign.updatedAt)
  })

  it('moves the message stamp when somebody posts', async () => {
    const before = newestMessageTime(TALKED_IN)

    const posted = await guestAxios
      .post('api/messages', { campaignId: TALKED_IN, messageBody: 'Fresh news' })
      .then((r) => r.data)

    const after = new Date(rowFor(await fetchActivity(), TALKED_IN).lastMessageAt).getTime()

    expect(after).toBe(new Date(posted.createdAt).getTime())
    expect(after).toBeGreaterThan(before)
  })

  it('moves the campaign stamp when the lore is edited', async () => {
    const campaign = campaigns().find((entry) => String(entry.id) === TALKED_IN)

    await guestAxios.put(`api/campaigns/${TALKED_IN}`, {
      name: campaign.name,
      description: campaign.description,
      worldLore: 'Rewritten lore',
      privateDescription: campaign.privateDescription,
      primarySystem: campaign.primarySystem,
    })

    const row = rowFor(await fetchActivity(), TALKED_IN)

    expect(new Date(row.campaignUpdatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(campaign.updatedAt).getTime(),
    )
  })
})
