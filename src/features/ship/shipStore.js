import { defineStore } from 'pinia'
import { ref } from 'vue'
import ShipService from './ShipService.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { extractErrorMessage } from '@/utils/errorUtils.js'
import { createEmptyShipData, normalizeShipData } from '@/systems/offworlders/shipConstants.js'

export const useShipStore = defineStore('ship', () => {
  // ==========================================================================
  // State
  // ==========================================================================
  const ship = ref(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref(null)
  // Set when a save is rejected because someone else edited the ship first.
  const hasConflict = ref(false)

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Fetch the campaign's ship. A 404 means no ship exists yet, so the store
   * falls back to the rulebook defaults and lets the first save create it.
   * @param {number|string} campaignId
   * @returns {Promise<object>} ShipData
   */
  async function fetchShip(campaignId) {
    const notificationStore = useNotificationStore()
    isLoading.value = true
    error.value = null
    hasConflict.value = false

    try {
      const data = await ShipService.fetchShip(campaignId)
      ship.value = normalizeShipData(data)
      return ship.value
    } catch (err) {
      if (err?.response?.status === 404) {
        ship.value = { ...createEmptyShipData(), campaignId }
        return ship.value
      }
      console.error('Failed to fetch ship:', err)
      error.value = 'Failed to load the ship.'
      if (!err.handled) {
        notificationStore.addNotification(
          extractErrorMessage(err, 'Failed to load the ship.'),
          'error',
        )
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Save the ship (upsert). Optimistic concurrency: a stale `version` is
   * rejected by the backend with 409; the store surfaces a reload prompt
   * instead of overwriting whatever someone else just changed.
   * @param {number|string} campaignId
   * @param {object} shipData
   * @returns {Promise<object|null>}
   */
  async function saveShip(campaignId, shipData) {
    const notificationStore = useNotificationStore()
    isSaving.value = true
    hasConflict.value = false

    try {
      const saved = await ShipService.saveShip(campaignId, shipData)
      ship.value = normalizeShipData(saved)
      notificationStore.addNotification('Ship saved.', 'success')
      return ship.value
    } catch (err) {
      if (err?.response?.status === 409) {
        hasConflict.value = true
        notificationStore.addNotification(
          'This ship was changed by someone else. Reload to see the latest.',
          'error',
          5000,
        )
      } else {
        console.error('Failed to save ship:', err)
        if (!err.handled) {
          notificationStore.addNotification(extractErrorMessage(err, 'Failed to save the ship.'), 'error')
        }
      }
      throw err
    } finally {
      isSaving.value = false
    }
  }

  /** Clear ship state (e.g. when leaving a campaign). */
  function clearShip() {
    ship.value = null
    error.value = null
    isLoading.value = false
    isSaving.value = false
    hasConflict.value = false
  }

  // ==========================================================================
  // Return all public state and actions
  // ==========================================================================
  return {
    // State
    ship,
    isLoading,
    isSaving,
    error,
    hasConflict,

    // Actions
    fetchShip,
    saveShip,
    clearShip,
  }
})
