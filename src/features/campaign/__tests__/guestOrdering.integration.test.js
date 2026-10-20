import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { seedGuestStorage } from '@/data/demoData.js'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { recordView, viewedAtByUser, viewHistory } from '@/utils/viewHistory.js'

/**
 * Guest Demo runs the whole ordering stack off the real seeded data and the
 * localStorage adapter — no service mocks — so the demo cannot drift from the
 * live ordering rules (`sortByLastViewed`, `sortPartyCharacters`).
 */
describe('Guest Demo list ordering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    seedGuestStorage()
    // Module-level state, shared between tests.
    viewHistory.value = {}
    useAuthStore().isGuest = true
    useUserStore().fetchCurrentUser()
  })

  /** A second account, to prove one user's history never touches another's. */
  const OTHER_USER_ID = 77

  const names = (items) => items.map((item) => item.name)

  it('orders the campaign list by the last view', async () => {
    const campaignStore = useCampaignStore()

    await campaignStore.fetchAllCampaignsForCurrentUser()

    expect(campaignStore.sortedCampaigns.map((campaign) => campaign.name)).toEqual([
      'Curse of Strahd',
      'Neptunus',
      'Gears of War',
      'The Fringe',
    ])

    recordView('campaign', 'guest_campaign_3', 'guest_demo')

    expect(campaignStore.sortedCampaigns[0].name).toBe('Gears of War')
  })

  it('orders the character list by the last view', async () => {
    const characterStore = useCharacterStore()

    await characterStore.fetchAllCharactersForCurrentUser()

    expect(names(characterStore.sortedCharacters)).toEqual(['Rincewind', 'Gimli', 'Aragorn', 'Vex'])

    recordView('character', 'guest_char_5', 'guest_demo')

    expect(names(characterStore.sortedCharacters)).toEqual(['Gimli', 'Rincewind', 'Aragorn', 'Vex'])
  })

  it("puts the demo user's own character first in a campaign", async () => {
    const campaignStore = useCampaignStore()

    await campaignStore.fetchCampaign('guest_campaign_4')
    await campaignStore.fetchCharactersForCampaign('guest_campaign_4')

    // Vex is the demo user's own; Doc and Kestrel are other players'.
    expect(names(campaignStore.getCharactersByCampaignId('guest_campaign_4'))).toEqual([
      'Vex',
      'Doc',
      'Kestrel',
    ])
  })

  it("sorts a GM-owned character above an ordinary player's, whatever the alphabet", async () => {
    // Campaign 3 ("Gears of War"): the guest is a PLAYER and guest_player_1 is
    // the GM. Move a player's character and a GM's character into that campaign,
    // naming the player's so the alphabet alone would put it first.
    const characters = JSON.parse(localStorage.getItem('guest_characters'))
    const move = (id, name) => {
      const character = characters.find((entry) => entry.id === id)
      character.campaignId = 'guest_campaign_3'
      character.name = name
    }
    move('guest_char_9', 'Aardvark') // guest_player_2 — PLAYER
    move('guest_char_8', 'Zephyr') // guest_player_1 — GM
    localStorage.setItem('guest_characters', JSON.stringify(characters))

    const campaignStore = useCampaignStore()
    await campaignStore.fetchCampaign('guest_campaign_3')
    await campaignStore.fetchCharactersForCampaign('guest_campaign_3')

    // Own (Gimli) → GM (Zephyr) → player (Aardvark).
    expect(names(campaignStore.getCharactersByCampaignId('guest_campaign_3'))).toEqual([
      'Gimli',
      'Zephyr',
      'Aardvark',
    ])
  })

  it("leaves every user's history alone when the guest profile is already gone", () => {
    // `exitGuestMode` must guard its call: `clearViewHistory()` without a user
    // id clears everybody's history.
    recordView('campaign', 'guest_campaign_1', 'guest_demo')
    recordView('campaign', 42, OTHER_USER_ID)
    useUserStore().currentUser = null

    useAuthStore().exitGuestMode()

    expect(viewedAtByUser('campaign', 'guest_demo')).toEqual({
      guest_campaign_1: expect.any(Number),
    })
    expect(viewedAtByUser('campaign', OTHER_USER_ID)).toEqual({ 42: expect.any(Number) })
  })
})
