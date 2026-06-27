import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import CampaignService from './CampaignService.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { extractErrorMessage } from '@/utils/errorUtils.js'

export const useCampaignStore = defineStore('campaign', () => {
  // ==========================================================================
  // State
  // ==========================================================================
  const campaigns = ref([])
  const currentCampaign = ref(null)
  const campaignCharacters = ref({}) // Object with campaignId as key and characters array as value
  const isLoading = ref(false)
  const loadingCharacters = ref(false)

  // ==========================================================================
  // Getters (computed)
  // ==========================================================================
  const getCampaignById = computed(() => {
    return (id) => campaigns.value.find((campaign) => campaign.id == id)
  })

  const isUserGM = computed(() => {
    return (campaignId, userId) => {
      const campaign = campaigns.value.find((c) => c.id == campaignId)
      if (!campaign) return false

      const participant = campaign.participants.find((p) => p.id == userId)
      return participant?.role == 'GM'
    }
  })

  const ownerId = computed(() => {
    return (id) => {
      const campaign = campaigns.value.find((c) => c.id == id)
      return campaign ? campaign.ownerId : null
    }
  })

  const getCampaignDescription = computed(() => {
    return (id) => {
      const campaign = campaigns.value.find((campaign) => campaign.id == id)
      return campaign?.description || 'This campaign has no description.'
    }
  })

  const getCampaignTitle = computed(() => {
    return (id) => {
      const campaign = campaigns.value.find((campaign) => campaign.id == id)
      return campaign?.name || 'This is a generic campaign title'
    }
  })

  const getCampaignImageUrl = computed(() => {
    return (id) => {
      const campaign = campaigns.value.find((campaign) => campaign.id == id)

      const imageUrl = campaign?.imageUrl
      if (!imageUrl) return '/default-campaign.svg'

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
      if (apiBaseUrl && imageUrl.startsWith('/images/')) {
        return `${apiBaseUrl}${imageUrl}`
      }

      return imageUrl
    }
  })

  const getCharactersByCampaignId = computed(() => {
    return (campaignId) => {
      return [...(campaignCharacters.value[campaignId] || [])]
    }
  })

  // ==========================================================================
  // Actions
  // ==========================================================================
  async function createCampaign(name, description) {
    const notificationStore = useNotificationStore()
    isLoading.value = true

    try {
      const newCampaign = await CampaignService.createCampaign(name, description)
      notificationStore.addNotification('Campaign created successfully!', 'success')
      await fetchAllCampaignsForCurrentUser()
      return newCampaign
    } catch (error) {
      console.error('Failed to create campaign:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Could not create campaign.'),
          'error',
        )
      }
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAllCampaigns() {
    const notificationStore = useNotificationStore()

    if (campaigns.value.length == 0) {
      isLoading.value = true
    }

    try {
      campaigns.value = await CampaignService.fetchAllCampaigns()
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Could not fetch campaigns.'),
          'error',
        )
      }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAllCampaignsForCurrentUser() {
    const notificationStore = useNotificationStore()

    if (campaigns.value.length == 0) {
      isLoading.value = true
    }

    try {
      campaigns.value = await CampaignService.fetchAllCampaignsForCurrentUser()
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Could not fetch campaigns.'),
          'error',
        )
      }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchCampaign(id) {
    const notificationStore = useNotificationStore()

    const cached = campaigns.value.find((c) => c.id == id)
    if (cached) {
      currentCampaign.value = cached
      return cached
    }

    isLoading.value = true

    try {
      const campaign = await CampaignService.fetchCampaign(id)
      currentCampaign.value = campaign

      if (!campaigns.value.some((c) => c.id == id)) {
        campaigns.value.push(campaign)
      }

      return campaign
    } catch (error) {
      console.error('Failed to fetch campaign:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Could not fetch campaign.'),
          'error',
        )
      }
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function updateCampaignInfo(campaignId, campaignData) {
    const notificationStore = useNotificationStore()
    try {
      await CampaignService.updateCampaignInfo(campaignId, campaignData)

      const index = campaigns.value.findIndex((c) => c.id == campaignId)
      if (index !== -1) {
        campaigns.value[index] = { ...campaigns.value[index], ...campaignData }
      }

      if (currentCampaign.value && currentCampaign.value.id == campaignId) {
        currentCampaign.value = { ...currentCampaign.value, ...campaignData }
      }

      return true
    } catch (error) {
      console.error('Failed to update campaign info:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to update campaign info.'),
          'error',
        )
      }
      throw error
    }
  }

  async function uploadCampaignImage(campaignId, imageFile) {
    const notificationStore = useNotificationStore()
    try {
      return await CampaignService.uploadCampaignImage(campaignId, imageFile)
    } catch (error) {
      console.error('Failed to upload campaign image:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to upload campaign image.'),
          'error',
          5000,
        )
      }
      throw error
    }
  }

  async function deleteCampaign(campaignId) {
    const notificationStore = useNotificationStore()

    try {
      await CampaignService.deleteCampaign(campaignId)

      campaigns.value = campaigns.value.filter((c) => c.id != campaignId)
      if (currentCampaign.value && currentCampaign.value.id == campaignId) {
        currentCampaign.value = null
      }

      notificationStore.addNotification('Campaign deleted successfully!', 'success')
    } catch (error) {
      console.error('Error deleting campaign:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to delete campaign.'),
          'error',
        )
      }
      throw error
    }
  }

  async function transferCampaignOwnership(campaignId, newOwnerId) {
    const notificationStore = useNotificationStore()
    try {
      await CampaignService.transferCampaignOwnership(campaignId, newOwnerId)
      notificationStore.addNotification('Campaign ownership transferred successfully!', 'success')
      await fetchAllCampaignsForCurrentUser()
    } catch (error) {
      console.error('Failed to transfer campaign ownership:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to transfer campaign ownership.'),
          'error',
        )
      }
      throw error
    }
  }

  async function addParticipantsToCampaign(campaignId, participantsToAdd) {
    const notificationStore = useNotificationStore()
    try {
      await CampaignService.addParticipants(campaignId, participantsToAdd)
      notificationStore.addNotification('Participant added successfully!', 'success')
      return true
    } catch (error) {
      console.error('Failed to add participants to campaign:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to add participants.'),
          'error',
        )
      }
      throw error
    }
  }

  async function removeParticipantsFromCampaign(campaignId, participantIdsToRemove) {
    const notificationStore = useNotificationStore()
    try {
      await CampaignService.removeParticipants(campaignId, participantIdsToRemove)
      notificationStore.addNotification('Participants removed successfully!', 'success')
      return true
    } catch (error) {
      console.error('Failed to remove participants from campaign:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to remove participants.'),
          'error',
        )
      }
      throw error
    }
  }

  async function updateParticipantNickname(campaignId, participantId, nickname) {
    const notificationStore = useNotificationStore()
    try {
      await CampaignService.updateParticipantNickname(campaignId, participantId, nickname)
      notificationStore.addNotification(
        `Participant nickname updated successfully to: ${nickname}`,
        'success',
      )
    } catch (error) {
      console.error('Failed to update participant nickname:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to update participant nickname.'),
          'error',
        )
      }
      throw error
    }
  }

  async function searchUsers(query) {
    const notificationStore = useNotificationStore()
    try {
      return await CampaignService.searchUsers(query)
    } catch (error) {
      console.error('Failed to search users:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to search users.'),
          'error',
        )
      }
      throw error
    }
  }

  async function updateParticipantRole(campaignId, participantId, role) {
    const notificationStore = useNotificationStore()
    try {
      await CampaignService.updateParticipantRole(campaignId, participantId, role)
      notificationStore.addNotification('Participant role updated successfully!', 'success')
      return true
    } catch (error) {
      console.error('Failed to update participant role:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to update participant role.'),
          'error',
        )
      }
      throw error
    }
  }

  async function fetchCharactersForCampaign(campaignId) {
    const notificationStore = useNotificationStore()

    const hasCachedCharacters =
      campaignCharacters.value[campaignId] && campaignCharacters.value[campaignId].length > 0

    if (!hasCachedCharacters) {
      loadingCharacters.value = true
    }

    try {
      const characters = await CampaignService.fetchCharactersForCampaign(campaignId)
      campaignCharacters.value[campaignId] = characters
      return characters
    } catch (error) {
      console.error('Failed to fetch characters for campaign:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to fetch characters for campaign.'),
          'error',
        )
      }
      return []
    } finally {
      loadingCharacters.value = false
    }
  }

  async function importCharacterToCampaign(characterId, campaignId) {
    const notificationStore = useNotificationStore()
    isLoading.value = true
    try {
      const character = await CampaignService.addCharacterToCampaign(characterId, campaignId)

      campaignCharacters.value[campaignId] = [
        ...(campaignCharacters.value[campaignId] || []),
        character,
      ]

      notificationStore.addNotification('Character imported to campaign successfully!', 'success')
    } catch (error) {
      console.error('Failed to import character to campaign:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to import character to campaign.'),
          'error',
        )
      }
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function removeCharacterFromCampaign(characterId) {
    const notificationStore = useNotificationStore()
    try {
      let campaignId = null
      for (const [campId, characters] of Object.entries(campaignCharacters.value)) {
        if (characters.some((char) => char.id == characterId)) {
          campaignId = campId
          break
        }
      }

      if (!campaignId) {
        throw new Error('Could not determine which campaign the character belongs to')
      }

      await CampaignService.removeCharacterFromCampaign(characterId)

      campaignCharacters.value = {
        ...campaignCharacters.value,
        [campaignId]: campaignCharacters.value[campaignId].filter((char) => char.id != characterId),
      }

      notificationStore.addNotification('Character removed from campaign successfully!', 'success')
    } catch (error) {
      console.error('Failed to remove character from campaign:', error)
      if (!error.handled) {
        notificationStore.addNotification(
          extractErrorMessage(error, 'Failed to remove character from campaign.'),
          'error',
        )
      }
      throw error
    }
  }

  function clearCampaignCharacters(campaignId = null) {
    if (campaignId) {
      delete campaignCharacters.value[campaignId]
    } else {
      campaignCharacters.value = {}
    }
  }

  // ==========================================================================
  // Return all public state, getters, and actions
  // ==========================================================================
  return {
    // State
    campaigns,
    currentCampaign,
    campaignCharacters,
    isLoading,
    loadingCharacters,

    // Getters
    getCampaignById,
    isUserGM,
    ownerId,
    getCampaignDescription,
    getCampaignTitle,
    getCampaignImageUrl,
    getCharactersByCampaignId,

    // Actions
    createCampaign,
    fetchAllCampaigns,
    fetchAllCampaignsForCurrentUser,
    fetchCampaign,
    updateCampaignInfo,
    uploadCampaignImage,
    deleteCampaign,
    transferCampaignOwnership,
    addParticipantsToCampaign,
    removeParticipantsFromCampaign,
    updateParticipantNickname,
    searchUsers,
    updateParticipantRole,
    fetchCharactersForCampaign,
    importCharacterToCampaign,
    removeCharacterFromCampaign,
    clearCampaignCharacters,
  }
})
