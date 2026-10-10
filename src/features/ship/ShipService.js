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
}

export default ShipService
