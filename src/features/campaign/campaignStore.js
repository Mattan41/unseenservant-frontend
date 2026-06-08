import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import CampaignService from './CampaignService.js'
import { useNotificationStore } from '@/stores/notificationStore.js'

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

      // Prefix with API URL for relative paths when API is on different domain
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
      notificationStore.addNotification('Could not create campaign.', 'error')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAllCampaigns() {
    const notificationStore = useNotificationStore()

    // Cache-first: only show loading if no data is cached
    if (campaigns.value.length == 0) {
      isLoading.value = true
    }

    try {
      campaigns.value = await CampaignService.fetchAllCampaigns()
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      notificationStore.addNotification('Could not fetch campaigns.', 'error')
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAllCampaignsForCurrentUser() {
    const notificationStore = useNotificationStore()

    // Cache-first: only show loading if no data is cached
    if (campaigns.value.length == 0) {
      isLoading.value = true
    }

    try {
      campaigns.value = await CampaignService.fetchAllCampaignsForCurrentUser()
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      notificationStore.addNotification('Could not fetch campaigns.', 'error')
    } finally {
      isLoading.value = false
    }
  }

  async function fetchCampaign(id) {
    const notificationStore = useNotificationStore()

    // Cache-first: check if the campaign already exists in the campaigns array
    const cached = campaigns.value.find((c) => c.id == id)
    if (cached) {
      currentCampaign.value = cached
      return cached
    }

    isLoading.value = true

    try {
      const campaign = await CampaignService.fetchCampaign(id)
      currentCampaign.value = campaign

      // Add to campaigns array if not already present
      if (!campaigns.value.some((c) => c.id == id)) {
        campaigns.value.push(campaign)
      }

      return campaign
    } catch (error) {
      console.error('Failed to fetch campaign:', error)
      notificationStore.addNotification('Could not fetch campaign.', 'error')
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

      // Also update currentCampaign if it matches
      if (currentCampaign.value && currentCampaign.value.id == campaignId) {
        currentCampaign.value = { ...currentCampaign.value, ...campaignData }
      }

      return true
    } catch (error) {
      console.error('Failed to update campaign info:', error)
      notificationStore.addNotification(
        error.message || 'Failed to update campaign info',
        'error',
      )
      throw error
    }
  }

  async function uploadCampaignImage(campaignId, imageFile) {
    const notificationStore = useNotificationStore()
    try {
      return await CampaignService.uploadCampaignImage(campaignId, imageFile)
    } catch (error) {
      // Extract the error message from the backend response
      const errorMessage =
        error.response && typeof error.response.data == 'string'
          ? error.response.data
          : 'Failed to upload campaign image'

      notificationStore.addNotification(errorMessage, 'error', 5000)
      console.error('Failed to upload campaign image:', error)
      throw error
    }
  }

  async function deleteCampaign(campaignId) {
    const notificationStore = useNotificationStore()

    try {
      await CampaignService.deleteCampaign(campaignId)

      // Filter out using loose comparison to avoid type mismatches
      campaigns.value = campaigns.value.filter((c) => c.id != campaignId)
      if (currentCampaign.value && currentCampaign.value.id == campaignId) {
        currentCampaign.value = null
      }

      notificationStore.addNotification('Campaign deleted successfully!', 'success')
    } catch (error) {
      notificationStore.addNotification(error.message || 'Failed to delete campaign', 'error')
      console.error('Error deleting campaign:', error)
      throw error
    }
  }

  // transfer ownership of the campaign
  async function transferCampaignOwnership(campaignId, newOwnerId) {
    const notificationStore = useNotificationStore()
    console.log('Transferring campaign ownership:', campaignId, newOwnerId)
    try {
      await CampaignService.transferCampaignOwnership(campaignId, newOwnerId)
      notificationStore.addNotification('Campaign ownership transferred successfully!', 'success')
      await fetchAllCampaignsForCurrentUser()
    } catch (error) {
      notificationStore.addNotification(
        error.message || 'Failed to transfer campaign ownership',
        'error',
      )
      console.error('Failed to transfer campaign ownership:', error)
      throw error
    }
  }

  // manage participants in a campaign
  async function addParticipantsToCampaign(campaignId, participantsToAdd) {
    const notificationStore = useNotificationStore()
    console.log('Adding participants to campaign:', campaignId, participantsToAdd)
    try {
      await CampaignService.addParticipants(campaignId, participantsToAdd)
      notificationStore.addNotification(`Participant added successfully!`, 'success')
      return true
    } catch (error) {
      console.error('Failed to add participants to campaign:', error)
      notificationStore.addNotification(error.message || 'Failed to add participants', 'error')
      throw error
    }
  }

  async function removeParticipantsFromCampaign(campaignId, participantIdsToRemove) {
    const notificationStore = useNotificationStore()
    console.log('Removing participants from campaign:', campaignId, participantIdsToRemove)
    try {
      await CampaignService.removeParticipants(campaignId, participantIdsToRemove)
      notificationStore.addNotification('Participants removed successfully!', 'success')
      return true
    } catch (error) {
      console.error('Failed to remove participants from campaign:', error)
      notificationStore.addNotification(error.message || 'Failed to remove participants', 'error')
      throw error
    }
  }

  async function updateParticipantNickname(campaignId, participantId, nickname) {
    const notificationStore = useNotificationStore()
    try {
      await CampaignService.updateParticipantNickname(campaignId, participantId, nickname)
      notificationStore.addNotification(
        'Participant nickname updated successfully to: ' + nickname,
        'success',
      )
    } catch (error) {
      console.error('Failed to update participant nickname:', error)
      notificationStore.addNotification(
        error.message || 'Failed to update participant nickname',
        'error',
      )
      throw error
    }
  }

  async function searchUsers(query) {
    try {
      return await CampaignService.searchUsers(query)
    } catch (error) {
      const notificationStore = useNotificationStore()
      notificationStore.addNotification(error.message || 'Failed to search users', 'error')
      console.error('Failed to search users:', error)
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
      notificationStore.addNotification(
        error.message || 'Failed to update participant role',
        'error',
      )
      console.error('Failed to update participant role:', error)
      throw error
    }
  }

  async function fetchCharactersForCampaign(campaignId) {
    const notificationStore = useNotificationStore()

    // Cache-first: only show loading if no characters cached for this campaign
    const hasCachedCharacters =
      campaignCharacters.value[campaignId] &&
      campaignCharacters.value[campaignId].length > 0

    if (!hasCachedCharacters) {
      loadingCharacters.value = true
    }

    try {
      const characters = await CampaignService.fetchCharactersForCampaign(campaignId)
      // Store characters in a state with campaign-ID as key
      campaignCharacters.value[campaignId] = characters
      return characters
    } catch (error) {
      console.error('Failed to fetch characters for campaign:', error)
      notificationStore.addNotification('Failed to fetch characters for campaign', 'error')
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

      // Important: Create a new array to secure reactivity
      campaignCharacters.value[campaignId] = [
        ...(campaignCharacters.value[campaignId] || []),
        character,
      ]

      notificationStore.addNotification('Character imported to campaign successfully!', 'success')
    } catch (error) {
      console.error('Failed to import character to campaign:', error)
      notificationStore.addNotification(
        error.message || 'Failed to import character to campaign',
        'error',
      )
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function removeCharacterFromCampaign(characterId) {
    const notificationStore = useNotificationStore()
    try {
      let campaignId = null
      // Find which campaign this character belongs to (handle both string and numeric IDs)
      for (const [campId, characters] of Object.entries(campaignCharacters.value)) {
        if (characters.some((char) => char.id == characterId)) {
          campaignId = campId // Keep as string, don't parseInt - guest IDs are strings
          break
        }
      }

      if (!campaignId) {
        throw new Error('Could not determine which campaign the character belongs to')
      }

      await CampaignService.removeCharacterFromCampaign(characterId)

      // Important: Create a new array to secure reactivity
      campaignCharacters.value = {
        ...campaignCharacters.value,
        [campaignId]: campaignCharacters.value[campaignId].filter(
          (char) => char.id != characterId,
        ),
      }

      notificationStore.addNotification(
        'Character removed from campaign successfully!',
        'success',
      )
    } catch (error) {
      console.error('Failed to remove character from campaign:', error)
      notificationStore.addNotification(
        error.message || 'Failed to remove character from campaign',
        'error',
      )
      throw error
    }
  }

  // Reset-function to clear campaign characters when needed
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
