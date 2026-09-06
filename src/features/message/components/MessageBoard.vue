<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMessageStore } from '@/features/message/messageStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import BaseButton from '@/components/base/BaseButton.vue'

const props = defineProps({
  campaignId: {
    type: [Number, String],
    required: true,
  },
  participants: {
    type: Array,
    default: () => [],
  },
})

const messageStore = useMessageStore()
const userStore = useUserStore()

const { messages, isLoading, error } = storeToRefs(messageStore)

const newMessageBody = ref('')
const isSending = ref(false)

/**
 * Resolve a user ID to a display nickname from the participants list.
 * @param {number|string} userId
 * @returns {string}
 */
function getSenderNickname(userId) {
  if (!props.participants || !props.participants.length) return 'Unknown User'
  const participant = props.participants.find(
    (p) => String(p.id) === String(userId),
  )
  return participant?.nickname || 'Unknown User'
}

/**
 * Format an ISO 8601 timestamp for display.
 * @param {string} timestamp
 * @returns {string}
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
}

/**
 * Is the current user the sender of this message?
 * @param {object} message
 * @returns {boolean}
 */
function isOwnMessage(message) {
  return userStore.currentUser && String(userStore.userId) === String(message.userId)
}

async function handleSubmit() {
  const body = newMessageBody.value.trim()
  if (!body || isSending.value) return

  isSending.value = true
  try {
    await messageStore.createMessage(props.campaignId, body)
    newMessageBody.value = ''
  } catch {
    // Error handled by the store (notification already shown)
  } finally {
    isSending.value = false
  }
}

async function handleDelete(messageId) {
  await messageStore.deleteMessage(messageId)
}

onMounted(async () => {
  await messageStore.fetchMessagesForCampaign(props.campaignId)
})

onUnmounted(() => {
  messageStore.clearMessages()
})
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-4">
      <div
        class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"
      ></div>
      <span class="ml-2 text-gray-500">Loading messages...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="py-4 text-center">
      <p class="text-red-500 mb-2">{{ error }}</p>
      <BaseButton
        variant="retry"
        @click="messageStore.fetchMessagesForCampaign(campaignId)"
      >
        Retry
      </BaseButton>
    </div>

    <!-- Messages list -->
    <div v-else-if="messages.length" class="space-y-3 mb-4">
      <div
        v-for="message in messages"
        :key="message.id"
        class="bg-white border border-third-100 rounded-lg p-3"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 mb-1">
              <span class="font-semibold text-third-800 text-sm">
                {{ getSenderNickname(message.userId) }}
              </span>
              <span class="text-xs text-gray-400">
                {{ formatTimestamp(message.createdAt) }}
              </span>
            </div>
            <p class="text-gray-700 whitespace-pre-wrap break-words">
              {{ message.messageBody }}
            </p>
          </div>

          <BaseButton
            v-if="isOwnMessage(message)"
            variant="remove"
            class="flex-shrink-0 text-xs"
            :confirm-message="'Delete this message?'"
            @click="handleDelete(message.id)"
          >
            Delete
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="py-4 text-center text-gray-500 text-sm italic">
      No messages yet. Be the first to post!
    </div>

    <!-- New message form -->
    <div class="border-t border-third-100 pt-3">
      <textarea
        v-model="newMessageBody"
        class="w-full border border-third-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
        rows="3"
        maxlength="10000"
        placeholder="Write a message..."
        :disabled="isSending"
      ></textarea>
      <div class="flex justify-end mt-2">
        <BaseButton
          variant="add"
          :disabled="!newMessageBody.trim() || isSending"
          :loading="isSending"
          @click="handleSubmit"
        >
          Post Message
        </BaseButton>
      </div>
    </div>
  </div>
</template>