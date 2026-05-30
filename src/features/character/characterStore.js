import { defineStore } from 'pinia'
import { useNotificationStore } from '@/stores/notificationStore.js'
import CharacterService from '@/features/character/CharacterService.js'

export const useCharacterStore = defineStore('character', {
  state: () => ({
    characters: [],
    currentCharacter: null,
    isLoading: false,
  }),

  actions: {
    async createCharacter(data) {
      const notificationStore = useNotificationStore()
      this.isLoading = true

      try {
        const newCharacter = await CharacterService.createCharacter(data)
        this.characters.push(newCharacter)
        notificationStore.addNotification('Character created successfully!', 'success')
        return newCharacter
      } catch (error) {
        console.error('Failed to create character:', error)
        notificationStore.addNotification('Failed to create character.', 'error')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async fetchCharacter(characterId) {
      const notificationStore = useNotificationStore()
      this.isLoading = true

      const existingCharacter = this.characters.find((char) => char.id === characterId)

      if (existingCharacter) {
        this.currentCharacter = existingCharacter
        this.isLoading = false
        return existingCharacter
      }

      try {
        const character = await CharacterService.fetchCharacter(characterId)
        this.currentCharacter = character

        if (!this.characters.some((char) => char.id === characterId)) {
          this.characters.push(character)
        }

        return character
      } catch (error) {
        console.error('Failed to fetch character:', error)
        notificationStore.addNotification('Failed to fetch character.', 'error')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async fetchAllCharactersForCurrentUser() {
      const notificationStore = useNotificationStore()
      this.isLoading = true
      try {
        const characters = await CharacterService.fetchAllCharactersForCurrentUser()
        this.characters = characters
        return characters
      } catch (error) {
        console.error('Failed to fetch characters:', error)
        notificationStore.addNotification('Failed to fetch characters.', 'error')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async fetchCharactersWithoutCampaign() {
      const notificationStore = useNotificationStore()
      try {
        this.isLoading = true
        const characters = await CharacterService.fetchCharactersWithoutCampaign()
        console.log('Characters returned from service:', characters)

        return Array.isArray(characters) ? characters : []
      } catch (error) {
        console.error('Failed to fetch characters without campaign:', error)
        notificationStore.addNotification('Failed to fetch characters without campaign.', 'error')
        return []
      } finally {
        this.isLoading = false
      }
    },

    async updateCharacter(characterId, data) {
      const notificationStore = useNotificationStore()
      this.isLoading = true

      try {
        const updatedCharacter = await CharacterService.updateCharacter(characterId, data)

        const index = this.characters.findIndex((char) => char.id === characterId)
        if (index !== -1) {
          this.characters[index] = updatedCharacter
        }

        if (this.currentCharacter && this.currentCharacter.id === characterId) {
          this.currentCharacter = updatedCharacter
        }

        return updatedCharacter
      } catch (error) {
        console.error('Failed to update character:', error)
        notificationStore.addNotification('Failed to update character.', 'error')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async updateCharacterField(characterId, field, value) {
      const notificationStore = useNotificationStore()
      this.isLoading = true

      try {
        const updatedCharacter = await CharacterService.updateCharacterField(
          characterId,
          field,
          value,
        )

        const index = this.characters.findIndex((char) => char.id === characterId)
        if (index !== -1) {
          this.characters[index] = updatedCharacter
        }

        if (this.currentCharacter && this.currentCharacter.id === characterId) {
          this.currentCharacter = updatedCharacter
        }

        return updatedCharacter
      } catch (error) {
        console.error('Failed to update character field:', error)
        notificationStore.addNotification(`Failed to update ${field}.`, 'error')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async uploadCharacterImage(characterId, imageFile) {
      const notificationStore = useNotificationStore()

      try {
        const updatedCharacter = await CharacterService.uploadCharacterImage(characterId, imageFile)
        if (this.characters.length > 0) {
          const index = this.characters.findIndex((c) => c.id === characterId)
          if (index !== -1) {
            this.characters[index] = updatedCharacter
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
    },

    async deleteCharacter(characterId) {
      const notificationStore = useNotificationStore()
      this.isLoading = true

      try {
        await CharacterService.deleteCharacter(characterId)

        this.characters = this.characters.filter((char) => char.id !== characterId)

        if (this.currentCharacter && this.currentCharacter.id === characterId) {
          this.currentCharacter = null
        }

        return true
      } catch (error) {
        console.error('Failed to delete character:', error)
        notificationStore.addNotification('Failed to delete character.', 'error')
        return false
      } finally {
        this.isLoading = false
      }
    },
  },

  getters: {
    getCharacterById: (state) => (id) => {
      return state.characters.find(
        (character) => character.id === parseInt(id) || character.id === id,
      )
    },
    getCharacterImageUrl: (state) => (id) => {
      const character = state.characters.find((char) => char.id === id)
      return character?.imageUrl || '/defaultCharacter.svg'
    },
  },
})
