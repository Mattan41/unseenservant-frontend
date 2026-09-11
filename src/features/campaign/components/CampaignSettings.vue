<script setup>
import { computed, ref, watch } from 'vue'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import router from '@/router/index.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import BaseButton from '@/components/base/BaseButton.vue'

const props = defineProps({
  campaignId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['participants-updated'], ['close-modal'])
const notificationStore = useNotificationStore()

const campaignStore = useCampaignStore()
const userStore = useUserStore()

const campaign = ref(null)
const nickname = ref('')
const isEditingNickname = ref(false)
const isSaving = ref(false)
const editingParticipantId = ref(null)
const updatingRoles = ref(new Set())

// Search functionality
const searchTerm = ref('')
const searchResults = ref([])
const isSearching = ref(false)

// Load campaign data before rendering the component
const loadCampaignData = async () => {
  try {
    campaign.value = await campaignStore.fetchCampaign(props.campaignId)
    nickname.value = campaign.value.nickname
  } catch (error) {
    console.error('Failed to load campaign:', error)
  }
}

// Use a computed property determine ownership based on the campaign data
const isOwner = computed(() => {
  if (!campaign.value || !userStore.currentUser) return false
  return campaign.value.ownerId === userStore.userId
})

// Computed property to get the current user's nickname
const currentUserNickname = computed(() => {
  if (!campaign.value || !userStore.currentUser) return ''
  const participant = campaign.value.participants.find((p) => p.id === userStore.userId)
  return participant ? participant.nickname : ''
})

watch(() => props.campaignId, loadCampaignData, { immediate: true })

// Search for users by username or email
const searchUsers = async () => {
  const notificationStore = useNotificationStore()
  if (!searchTerm.value.trim()) return

  try {
    isSearching.value = true

    const users = await campaignStore.searchUsers(searchTerm.value)

    // Filter out users who are already participants
    searchResults.value = users.filter(
      (user) => !campaign.value.participants.some((p) => p.id === user.id),
    )
    // If no users found, set an error message - display for  3 seconds
    if (searchResults.value.length === 0) {
      notificationStore.addNotification(`No users found matching "${searchTerm.value}"`, 'error')
    }
  } catch (error) {
    console.error('Search error:', error)
    notificationStore.addNotification(`Error searching for users: ${error.message}`, 'error')
  } finally {
    isSearching.value = false
  }
}

// nickname editing functions
const startEditingNickname = () => {
  isEditingNickname.value = true
}
const cancelEditingNickname = () => {
  isEditingNickname.value = false
  nickname.value = campaign.value.nickname
}

// Function to save the updated the nickname for a participant
const saveParticipantNickname = async (participant) => {
  if (!participant.nickname.trim()) {
    notificationStore.addNotification('Nickname cannot be empty', 'error')
    return
  }

  try {
    isSaving.value = true
    await campaignStore.updateParticipantNickname(
      props.campaignId,
      participant.id,
      participant.nickname.trim(),
    )

    editingParticipantId.value = null

    emit('participants-updated', 'Nickname updated successfully!')
  } catch (error) {
    console.error('Failed to update participant nickname:', error)
    notificationStore.addNotification(
      `Failed to update participant nickname: ${error.message}`,
      'error',
    )
  } finally {
    isSaving.value = false
  }
}
// Function to save the current user's nickname
const saveNickname = async () => {
  const participant = {
    id: userStore.userId,
    nickname: nickname.value,
  }
  try {
    await saveParticipantNickname(participant)
    isEditingNickname.value = false
  } catch (error) {
    notificationStore.addNotification(`Failed to update nickname: ${error.message}`, 'error')
  }
}
const updateNicknameForParticipant = (participant) => {
  editingParticipantId.value = participant.id
}

const addParticipant = async (user) => {
  try {
    // Keep campaignId as string to support both numeric and guest mode IDs
    const campaignId = props.campaignId

    // call the store method to add the participant
    await campaignStore.addParticipantsToCampaign(campaignId, [
      { id: user, nickname: user.username, role: 'PLAYER' },
    ])

    // remove the added user from the search results
    searchResults.value = searchResults.value.filter((u) => u.id !== user.id)

    emit(
      'participants-updated',
      `Participant ${user.displayName || user.username} added successfully!`,
    )
  } catch (error) {
    notificationStore.addNotification(`Failed to add participant: ${error.message}`, 'error')
  }
}

const removeParticipant = async (participant) => {
  try {
    // Keep campaignId as string to support both numeric and guest mode IDs
    const campaignId = props.campaignId

    await campaignStore.removeParticipantsFromCampaign(campaignId, [participant.id])
    emit(
      'participants-updated',
      `Participant ${participant.nickname || participant.displayName || participant.username || participant.name} removed successfully!`,
    )
  } catch (error) {
    console.error('Failed to remove participant:', error)
    notificationStore.addNotification(`Failed to remove participant: ${error.message}`, 'error')
  }
}

const toggleRole = async (participant) => {
  try {
    // set a participant as updating
    updatingRoles.value.add(participant.id)

    const newRole = participant.role === 'PLAYER' ? 'GM' : 'PLAYER'

    // call the store method to update the participant's role
    await campaignStore.updateParticipantRole(props.campaignId, participant.id, newRole)

    emit(
      'participants-updated',
      `${participant.nickname || participant.displayName || participant.username || participant.name} updated to ${newRole}`,
    )
  } catch (error) {
    console.error('Failed to toggle role:', error)
    notificationStore.addNotification(
      `Failed to update role for ${participant.displayName || participant.username}`,
    )
  } finally {
    updatingRoles.value.delete(participant.id)
  }
}

const deleteCampaign = () => {
  console.log('Deleting campaign:', props.campaignId)
  const notificationStore = useNotificationStore()

  if (
    confirm('You are about to delete this campaign. This action cannot be undone. Are you sure?')
  ) {
    campaignStore
      .deleteCampaign(props.campaignId)
      .then(() => {
        campaign.value = null

        setTimeout(() => {
          router.push({ name: 'CampaignsView' })
        }, 100)
      })
      .catch((error) => {
        notificationStore.addNotification(error.message || 'Failed to delete campaign', 'error')
        console.error('Failed to delete campaign:', error)
      })
  }
}

const transferOwnership = (participant) => {
  campaignStore
    .transferCampaignOwnership(props.campaignId, participant.id)
    .then(() => {
      emit('close-modal')
    })
    .catch((error) => {
      console.error('Error transferring ownership:', error)
    })
}
</script>

<template>
  <div class="rounded-lg shadow-md p-4" style="background-color: var(--color-primary-200)">
    <!-- Non-owner settings -->
    <div v-if="!isOwner" class="mb-6">
      <div class="border rounded-lg p-4">
        <h5 class="font-medium mb-2">Your Nickname in Campaign</h5>

        <input
          v-model="nickname"
          type="text"
          class="p-3 rounded w-full mb-3"
          style="background-color: var(--color-primary-50)"
          :readonly="!isEditingNickname"
          :disabled="isSaving"
          :placeholder="currentUserNickname || 'Enter your nickname'"
          @click="startEditingNickname"
        />

        <div v-if="isEditingNickname" class="flex gap-2">
          <BaseButton
            variant="add"
            class="flex-1"
            :disabled="isSaving"
            :loading="isSaving"
            @click="saveNickname"
          >
            Save
          </BaseButton>
          <BaseButton
            variant="ghost"
            class="flex-1"
            :disabled="isSaving"
            @click="cancelEditingNickname"
          >
            Cancel
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Owner-only settings -->
    <div v-if="isOwner" class="space-y-6">
      <!-- Add Participants Section -->
      <div class="border rounded-lg p-4">
        <h4 class="text-lg font-semibold mb-3">Add Participants</h4>

        <div class="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            v-model="searchTerm"
            type="text"
            class="p-3 rounded flex-grow"
            style="background-color: var(--color-primary-50)"
            placeholder="username or email"
            @keyup.enter="searchUsers"
          />

          <BaseButton
            variant="default"
            :disabled="isSearching"
            :loading="isSearching"
            @click="searchUsers"
          >
            Search
          </BaseButton>
        </div>

        <!-- Search results -->
        <div v-if="searchResults.length" class="mt-3 border-t pt-3">
          <h5 class="font-medium mb-2">Search Results</h5>

          <ul class="divide-y divide-gray-200">
            <li
              v-for="user in searchResults"
              :key="user.id"
              class="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="mb-2 sm:mb-0">
                <div class="font-medium">{{ user.displayName || user.username }}</div>
                <div class="text-sm text-muted">{{ user.email }}</div>
              </div>
              <!--             todo: can we have a checkbox here instead of button? and add all selected users with a button -->
              <BaseButton
                variant="add"
                class="self-end sm:self-auto"
                :disabled="isSaving"
                @click="addParticipant(user.id)"
              >
                Add to Campaign
              </BaseButton>
            </li>
          </ul>
        </div>
      </div>

      <!-- Manage Participants Section -->
      <div class="border rounded-lg p-4">
        <h4 class="text-lg font-semibold mb-3">Manage Participants</h4>

        <ul class="space-y-4">
          <li
            v-for="participant in campaign?.participants || []"
            :key="participant.id"
            class="border rounded p-3"
            :class="{
              'bg-primary-100': participant.id === userStore.userId,
              'bg-primary-200': participant.id !== userStore.userId,
            }"
          >
            <!-- View mode -->
            <div v-if="editingParticipantId !== participant.id" class="space-y-3">
              <!-- Participant info -->
              <div class="flex justify-between items-center">
                <div class="font-medium">{{ participant.nickname }}</div>
                <div
                  class="px-2 py-1 rounded text-sm"
                  style="background-color: var(--color-primary-300)"
                >
                  {{ participant.role }}
                </div>
              </div>

              <!-- Owner info -->
              <div v-if="participant.id === userStore.userId" class="text-sm text-muted">
                This is you
              </div>

              <!-- Action buttons -->
              <div class="flex flex-wrap gap-2">
                <BaseButton variant="update" @click="toggleRole(participant)">
                  change to {{ participant.role === 'PLAYER' ? 'GM' : 'PLAYER' }}
                </BaseButton>
                <BaseButton variant="update" @click="updateNicknameForParticipant(participant)">
                  Edit Nickname
                </BaseButton>
                <BaseButton
                  variant="remove"
                  :confirm-message="`Are you sure you want to remove ${participant.nickname || 'this participant'}?`"
                  @click="removeParticipant(participant)"
                >
                  Remove
                </BaseButton>
                <BaseButton
                  variant="update"
                  confirm-message="Are you sure you want to transfer ownership?"
                  @click="transferOwnership(participant)"
                >
                  Transfer Ownership of campaign
                </BaseButton>
              </div>
            </div>

            <!-- Edit nickname mode -->
            <div v-else class="space-y-3">
              <input
                v-model="participant.nickname"
                type="text"
                class="p-2 rounded w-full"
                style="background-color: var(--color-primary-50)"
                :disabled="isSaving"
                placeholder="Enter new nickname"
              />

              <div class="flex gap-2">
                <BaseButton
                  variant="add"
                  class="flex-1"
                  :disabled="isSaving"
                  :loading="isSaving"
                  @click="saveParticipantNickname(participant)"
                >
                  Save
                </BaseButton>
                <BaseButton
                  variant="ghost"
                  class="flex-1"
                  :disabled="isSaving"
                  @click="editingParticipantId = null"
                >
                  Cancel
                </BaseButton>
              </div>
            </div>
          </li>
        </ul>

        <div v-if="(campaign?.participants || []).length === 0" class="text-center py-3 text-muted">
          No participants in this campaign yet.
        </div>
      </div>

      <!-- Campaign Management Buttons -->
      <div class="border rounded-lg p-4">
        <h4 class="text-lg font-semibold mb-3">Campaign Management</h4>

        <div class="flex flex-col sm:flex-row gap-3">
          <BaseButton
            variant="remove"
            confirm-message="Are you sure you want to delete this campaign?"
            @click="deleteCampaign"
          >
            Delete Campaign
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
