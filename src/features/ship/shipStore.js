import { defineStore } from 'pinia'
import { ref } from 'vue'
import ShipService from './ShipService.js'
import { buildShipPayload } from './shipPayload.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { extractErrorMessage } from '@/utils/errorUtils.js'
import {
  buildCrewPayload,
  createEmptyShipData,
  normalizeCrew,
  normalizeCrewMember,
  normalizeShipData,
} from '@/systems/offworlders/shipConstants.js'

export const useShipStore = defineStore('ship', () => {
  // ==========================================================================
  // State
  // ==========================================================================
  const ship = ref(null)
  // One crew entry per current participant (see `fetchCrew`).
  const crew = ref([])
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
          notificationStore.addNotification(
            extractErrorMessage(err, 'Failed to save the ship.'),
            'error',
          )
        }
      }
      throw err
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Quick-edit a single numeric ship field (Hull, Drive Fuel, Credits) and save
   * immediately. Same optimistic-concurrency flow as `saveShip`, but quiet: no
   * success toast, since these steppers are clicked repeatedly during play.
   * @param {number|string} campaignId
   * @param {string} field
   * @param {number} value
   * @returns {Promise<object|null>}
   */
  async function adjustShipField(campaignId, field, value) {
    const notificationStore = useNotificationStore()
    if (!ship.value) return null
    isSaving.value = true
    hasConflict.value = false

    try {
      const payload = { ...buildShipPayload(ship.value), [field]: value }
      const saved = await ShipService.saveShip(campaignId, payload)
      ship.value = normalizeShipData(saved)
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
        console.error('Failed to adjust the ship:', err)
        if (!err.handled) {
          notificationStore.addNotification(
            extractErrorMessage(err, 'Failed to update the ship.'),
            'error',
          )
        }
      }
      throw err
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Fetch the ship's crew manifest (one entry per current participant). Kept in
   * the ship store so the sheet and its shared gallery read one source of truth.
   * @param {number|string} campaignId
   * @returns {Promise<Array<object>>}
   */
  async function fetchCrew(campaignId) {
    const notificationStore = useNotificationStore()
    try {
      crew.value = normalizeCrew(await ShipService.fetchCrew(campaignId))
      return crew.value
    } catch (err) {
      console.error('Failed to load the ship crew:', err)
      if (!err.handled) {
        notificationStore.addNotification(
          extractErrorMessage(err, 'Failed to load the ship crew.'),
          'error',
        )
      }
      return []
    }
  }

  /** Replace one crew entry in local state with the freshly saved version. */
  function replaceCrewMember(saved) {
    const normalized = normalizeCrewMember(saved)
    const index = crew.value.findIndex(
      (member) => String(member.userId) === String(normalized.userId),
    )
    if (index === -1) crew.value.push(normalized)
    else crew.value[index] = normalized
  }

  /** Save the caller's own crew entry (notes + characters). */
  async function saveMyCrewEntry(campaignId, entry) {
    const notificationStore = useNotificationStore()
    isSaving.value = true
    try {
      const saved = await ShipService.saveMyCrewEntry(campaignId, buildCrewPayload(entry))
      replaceCrewMember(saved)
      notificationStore.addNotification('Crew entry saved.', 'success')
      return saved
    } catch (err) {
      console.error('Failed to save the crew entry:', err)
      if (!err.handled) {
        notificationStore.addNotification(
          extractErrorMessage(err, 'Failed to save the crew entry.'),
          'error',
        )
      }
      throw err
    } finally {
      isSaving.value = false
    }
  }

  /** Add an image to the caller's own crew entry (shown in the ship's gallery). */
  async function addCrewImage(campaignId, file) {
    const notificationStore = useNotificationStore()
    isSaving.value = true
    try {
      const saved = await ShipService.addCrewImage(campaignId, file)
      replaceCrewMember(saved)
      notificationStore.addNotification('Image added to your crew entry.', 'success')
      return saved
    } catch (err) {
      console.error('Failed to add the crew image:', err)
      if (!err.handled) {
        notificationStore.addNotification(
          extractErrorMessage(err, 'Failed to add the image.'),
          'error',
        )
      }
      throw err
    } finally {
      isSaving.value = false
    }
  }

  /** Remove an image from the caller's own crew entry by its stored URL. */
  async function removeCrewImage(campaignId, url) {
    const notificationStore = useNotificationStore()
    isSaving.value = true
    try {
      const saved = await ShipService.removeCrewImage(campaignId, url)
      replaceCrewMember(saved)
      notificationStore.addNotification('Image removed from your crew entry.', 'success')
      return saved
    } catch (err) {
      console.error('Failed to remove the crew image:', err)
      if (!err.handled) {
        notificationStore.addNotification(
          extractErrorMessage(err, 'Failed to remove the image.'),
          'error',
        )
      }
      throw err
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Shared handler for the image endpoints: they all return the updated ship.
   * @param {Promise<object>} request
   * @param {string} successMessage
   */
  async function applyImageResult(request, successMessage) {
    const notificationStore = useNotificationStore()
    isSaving.value = true
    try {
      const saved = await request
      ship.value = normalizeShipData(saved)
      notificationStore.addNotification(successMessage, 'success')
      return ship.value
    } catch (err) {
      console.error('Ship image operation failed:', err)
      if (!err.handled) {
        notificationStore.addNotification(
          extractErrorMessage(err, 'Failed to update the ship images.'),
          'error',
        )
      }
      throw err
    } finally {
      isSaving.value = false
    }
  }

  /** Upload/replace the ship's profile image. */
  function uploadShipImage(campaignId, imageFile) {
    return applyImageResult(
      ShipService.uploadShipImage(campaignId, imageFile),
      'Ship image updated.',
    )
  }

  /** Add a drawing/map/photo to the ship's gallery. */
  function addGalleryImage(campaignId, imageFile) {
    return applyImageResult(
      ShipService.addShipGalleryImage(campaignId, imageFile),
      'Image added to the ship gallery.',
    )
  }

  /** Remove an image from the ship's gallery. */
  function removeGalleryImage(campaignId, url) {
    return applyImageResult(
      ShipService.removeShipGalleryImage(campaignId, url),
      'Image removed from the ship gallery.',
    )
  }

  /** Clear ship state (e.g. when leaving a campaign). */
  function clearShip() {
    ship.value = null
    crew.value = []
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
    crew,
    isLoading,
    isSaving,
    error,
    hasConflict,

    // Actions
    fetchShip,
    saveShip,
    adjustShipField,
    fetchCrew,
    saveMyCrewEntry,
    addCrewImage,
    removeCrewImage,
    uploadShipImage,
    addGalleryImage,
    removeGalleryImage,
    clearShip,
  }
})
