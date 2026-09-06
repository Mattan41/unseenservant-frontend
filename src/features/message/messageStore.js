import { defineStore } from 'pinia'
import { ref } from 'vue'
import MessageService from './MessageService.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { extractErrorMessage } from '@/utils/errorUtils.js'

export const useMessageStore = defineStore('message', () => {
  // ==========================================================================
  // State
  // ==========================================================================
  const messages = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Fetch all messages for a campaign.
   * @param {number|string} campaignId
   * @returns {Promise<Array>} Array of MessageDTO
   */
  async function fetchMessagesForCampaign(campaignId) {
    const notificationStore = useNotificationStore()
    isLoading.value = true
    error.value = null

    try {
      const data = await MessageService.fetchCampaignMessages(campaignId)
      messages.value = Array.isArray(data) ? data : []
      return messages.value
    } catch (err) {
      console.error('Failed to fetch campaign messages:', err)
      error.value = 'Failed to load messages.'
      if (!err.handled) {
        notificationStore.addNotification(
          extractErrorMessage(err, 'Failed to load messages.'),
          'error',
        )
      }
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new message in a campaign.
   * @param {number|string} campaignId
   * @param {string} messageBody
   * @returns {Promise<object>} The created MessageDTO
   */
  async function createMessage(campaignId, messageBody) {
    const notificationStore = useNotificationStore()
    isLoading.value = true

    try {
      const newMessage = await MessageService.createMessage(campaignId, messageBody)
      messages.value.push(newMessage)
      notificationStore.addNotification('Message posted.', 'success')
      return newMessage
    } catch (err) {
      console.error('Failed to create message:', err)
      if (!err.handled) {
        notificationStore.addNotification(
          extractErrorMessage(err, 'Failed to post message.'),
          'error',
        )
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete a message. Only the message's sender can delete it (backend-enforced).
   * @param {number|string} messageId
   * @returns {Promise<boolean>}
   */
  async function deleteMessage(messageId) {
    const notificationStore = useNotificationStore()

    try {
      await MessageService.deleteMessage(messageId)
      messages.value = messages.value.filter((m) => String(m.id) !== String(messageId))
      notificationStore.addNotification('Message deleted.', 'success')
      return true
    } catch (err) {
      console.error('Failed to delete message:', err)
      if (!err.handled) {
        notificationStore.addNotification(
          extractErrorMessage(err, 'Failed to delete message.'),
          'error',
        )
      }
      return false
    }
  }

  /**
   * Clear all messages (e.g. when leaving a campaign).
   */
  function clearMessages() {
    messages.value = []
    error.value = null
    isLoading.value = false
  }

  // ==========================================================================
  // Return all public state and actions
  // ==========================================================================
  return {
    // State
    messages,
    isLoading,
    error,

    // Actions
    fetchMessagesForCampaign,
    createMessage,
    deleteMessage,
    clearMessages,
  }
})