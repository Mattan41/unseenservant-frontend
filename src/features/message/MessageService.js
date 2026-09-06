import apiClient from '@/api/apiClient'

const MessageService = {
  /**
   * Fetch all messages for a specific campaign.
   * @param {number|string} campaignId
   * @returns {Promise<Array>} Array of MessageDTO
   */
  async fetchCampaignMessages(campaignId) {
    const response = await apiClient.get(`api/messages/campaign/${campaignId}`)
    return response.data
  },

  /**
   * Fetch a single message by ID.
   * @param {number|string} id
   * @returns {Promise<object>} MessageDTO
   */
  async fetchMessage(id) {
    const response = await apiClient.get(`api/messages/${id}`)
    return response.data
  },

  /**
   * Create a new message in a campaign.
   * @param {number|string} campaignId
   * @param {string} messageBody
   * @returns {Promise<object>} MessageDTO
   */
  async createMessage(campaignId, messageBody) {
    const response = await apiClient.post('api/messages', { campaignId, messageBody })
    return response.data
  },

  /**
   * Delete a message. Only the message sender can delete it (backend-enforced).
   * @param {number|string} id
   * @returns {Promise<object>} { success: true }
   */
  async deleteMessage(id) {
    await apiClient.delete(`api/messages/${id}`)
    return { success: true }
  },
}

export default MessageService