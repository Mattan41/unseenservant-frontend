import apiClient from '@/api/apiClient'

/**
 * Offworlders ship API calls, scoped to a campaign.
 *
 * A ship is 1:1 with a campaign. Every campaign participant may view and edit
 * it; there is no delete (the ship is retained even if the campaign's primary
 * system changes away from OFFWORLDERS).
 */
const ShipService = {
  /**
   * Fetch the ship for a campaign.
   * @param {number|string} campaignId
   * @returns {Promise<object>} ShipDTO
   */
  async fetchShip(campaignId) {
    const response = await apiClient.get(`api/campaigns/${campaignId}/ship`)
    return response.data
  },

  /**
   * Upsert (create-if-missing or update) the ship for a campaign.
   * @param {number|string} campaignId
   * @param {object} ship - ShipData including the optimistic-concurrency `version`
   * @returns {Promise<object>} ShipDTO
   */
  async saveShip(campaignId, ship) {
    const response = await apiClient.put(`api/campaigns/${campaignId}/ship`, ship)
    return response.data
  },

  /**
   * Upload (or replace) the ship's profile image.
   * @param {number|string} campaignId
   * @param {File} imageFile
   * @returns {Promise<object>} ShipDTO
   */
  async uploadShipImage(campaignId, imageFile) {
    const formData = new FormData()
    formData.append('file', imageFile)
    const response = await apiClient.post(`api/campaigns/${campaignId}/ship/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * Add an image (drawing, map, ...) to the ship's gallery.
   * @param {number|string} campaignId
   * @param {File} imageFile
   * @returns {Promise<object>} ShipDTO
   */
  async addShipGalleryImage(campaignId, imageFile) {
    const formData = new FormData()
    formData.append('file', imageFile)
    const response = await apiClient.post(`api/campaigns/${campaignId}/ship/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * Remove an image from the ship's gallery by its stored URL.
   * @param {number|string} campaignId
   * @param {string} url
   * @returns {Promise<object>} ShipDTO
   */
  async removeShipGalleryImage(campaignId, url) {
    const response = await apiClient.delete(`api/campaigns/${campaignId}/ship/images`, {
      params: { url },
    })
    return response.data
  },

  /**
   * Fetch the ship's crew manifest (one entry per current participant).
   * @param {number|string} campaignId
   * @returns {Promise<Array<object>>} ShipCrewMemberDTO[]
   */
  async fetchCrew(campaignId) {
    const response = await apiClient.get(`api/campaigns/${campaignId}/ship/crew`)
    return response.data
  },

  /**
   * Create/update the caller's own crew entry.
   * @param {number|string} campaignId
   * @param {{notes: string, characters: Array<object>}} entry
   * @returns {Promise<object>} ShipCrewMemberDTO
   */
  async saveMyCrewEntry(campaignId, entry) {
    const response = await apiClient.put(`api/campaigns/${campaignId}/ship/crew/me`, entry)
    return response.data
  },

  /**
   * Add an image to the caller's own crew entry (shown in the ship's gallery).
   * @param {number|string} campaignId
   * @param {File} imageFile
   * @returns {Promise<object>} ShipCrewMemberDTO
   */
  async addCrewImage(campaignId, imageFile) {
    const formData = new FormData()
    formData.append('file', imageFile)
    const response = await apiClient.post(
      `api/campaigns/${campaignId}/ship/crew/me/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },

  /**
   * Remove an image from the caller's own crew entry by its stored URL.
   * @param {number|string} campaignId
   * @param {string} url
   * @returns {Promise<object>} ShipCrewMemberDTO
   */
  async removeCrewImage(campaignId, url) {
    const response = await apiClient.delete(`api/campaigns/${campaignId}/ship/crew/me/images`, {
      params: { url },
    })
    return response.data
  },
}

export default ShipService
