import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore.js'
import CharacterService from '@/features/character/CharacterService.js'

export const useCharacterStore = defineStore('character', () => {
  // ==========================================================================
  // State
  // ==========================================================================
  const characters = ref([])
  const currentCharacter = ref(null)
  const isLoading = ref(false)

  // ==========================================================================
  // Getters (computed)
  // ==========================================================================
  const getCharacterById = computed(() => {
    return (id) => {
      return characters.value.find(
        (character) => character.id === parseInt(id) || character.id === id,
      )
    }
  })

  const getCharacterImageUrl = computed(() => {
    return (id) => {
      const character = characters.value.find((char) => char.id === id)
      return character?.imageUrl || '/defaultCharacter.svg'
    }
  })

  // ==========================================================================
  // Actions
  // ==========================================================================
  async function createCharacter(data) {
    const notificationStore = useNotificationStore()
    isLoading.value = true

    try {
      const newCharacter = await CharacterService.createCharacter(data)
      characters.value.push(newCharacter)
      notificationStore.addNotification('Character created successfully!', 'success')
      return newCharacter
    } catch (error) {
      console.error('Failed to create character:', error)
      notificationStore.addNotification('Failed to create character.', 'error')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function fetchCharacter(characterId) {
    const notificationStore = useNotificationStore()
    isLoading.value = true

    const existingCharacter = characters.value.find((char) => char.id === characterId)

    if (existingCharacter) {
      currentCharacter.value = existingCharacter
      isLoading.value = false
      return existingCharacter
    }

    try {
      const character = await CharacterService.fetchCharacter(characterId)
      currentCharacter.value = character

      if (!characters.value.some((char) => char.id === characterId)) {
        characters.value.push(character)
      }

      return character
    } catch (error) {
      console.error('Failed to fetch character:', error)
      notificationStore.addNotification('Failed to fetch character.', 'error')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAllCharactersForCurrentUser() {
    const notificationStore = useNotificationStore()
    isLoading.value = true
    try {
      const res = await CharacterService.fetchAllCharactersForCurrentUser()
      characters.value = res
      return res
    } catch (error) {
      console.error('Failed to fetch characters:', error)
      notificationStore.addNotification('Failed to fetch characters.', 'error')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function fetchCharactersWithoutCampaign() {
    const notificationStore = useNotificationStore()
    try {
      isLoading.value = true
      const res = await CharacterService.fetchCharactersWithoutCampaign()
      console.log('Characters returned from service:', res)

      return Array.isArray(res) ? res : []
    } catch (error) {
      console.error('Failed to fetch characters without campaign:', error)
      notificationStore.addNotification('Failed to fetch characters without campaign.', 'error')
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function updateCharacter(characterId, data) {
    const notificationStore = useNotificationStore()
    isLoading.value = true

    try {
      const updatedCharacter = await CharacterService.updateCharacter(characterId, data)

      const index = characters.value.findIndex((char) => char.id === characterId)
      if (index !== -1) {
        characters.value[index] = updatedCharacter
      }

      if (currentCharacter.value && currentCharacter.value.id === characterId) {
        currentCharacter.value = updatedCharacter
      }

      return updatedCharacter
    } catch (error) {
      console.error('Failed to update character:', error)
      notificationStore.addNotification('Failed to update character.', 'error')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function updateCharacterField(characterId, field, value) {
    const notificationStore = useNotificationStore()
    isLoading.value = true

    try {
      const updatedCharacter = await CharacterService.updateCharacterField(
        characterId,
        field,
        value,
      )

      const index = characters.value.findIndex((char) => char.id === characterId)
      if (index !== -1) {
        characters.value[index] = updatedCharacter
      }

      if (currentCharacter.value && currentCharacter.value.id === characterId) {
        currentCharacter.value = updatedCharacter
      }

      return updatedCharacter
    } catch (error) {
      console.error('Failed to update character field:', error)
      notificationStore.addNotification(`Failed to update ${field}.`, 'error')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function uploadCharacterImage(characterId, imageFile) {
    const notificationStore = useNotificationStore()

    try {
      const updatedCharacter = await CharacterService.uploadCharacterImage(characterId, imageFile)
      if (characters.value.length > 0) {
        const index = characters.value.findIndex((c) => c.id === characterId)
        if (index !== -1) {
          characters.value[index] = updatedCharacter
        }
      }

      return updatedCharacter.imageUrl
    } catch (error) {
      const errorMessage =
        error.response && typeof error.response.data === 'string'
          ? error.response.data
          : 'Failed to upload character image.'

      notificationStore.addNotification(errorMessage, 'error', 5000)
      console.error('Error in store uploadCharacterImage:', error)
      throw error
    }
  }

  async function deleteCharacter(characterId) {
    const notificationStore = useNotificationStore()
    isLoading.value = true

    try {
      await CharacterService.deleteCharacter(characterId)

      characters.value = characters.value.filter((char) => char.id !== characterId)

      if (currentCharacter.value && currentCharacter.value.id === characterId) {
        currentCharacter.value = null
      }

      return true
    } catch (error) {
      console.error('Failed to delete character:', error)
      notificationStore.addNotification('Failed to delete character.', 'error')
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    characters,
    currentCharacter,
    isLoading,

    // Getters
    getCharacterById,
    getCharacterImageUrl,

    // Actions
    createCharacter,
    fetchCharacter,
    fetchAllCharactersForCurrentUser,
    fetchCharactersWithoutCampaign,
    updateCharacter,
    updateCharacterField,
    uploadCharacterImage,
    deleteCharacter,
  }
})
