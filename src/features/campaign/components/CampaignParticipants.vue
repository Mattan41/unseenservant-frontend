<script setup>
/**
 * Campaign participants — roster + owner-only management.
 *
 * Rendered inside "Campaign Settings" for the campaign owner only; the public
 * roster also appears on the Overview. Adding participants, changing roles,
 * removing them, and editing other participants' nicknames are all owner
 * rights (see `campaignPermissions.js`); your own nickname lives in "My
 * Settings".
 */
import { computed, ref, watch } from 'vue'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { getCampaignPermissions } from '@/features/campaign/campaignPermissions.js'
import BaseButton from '@/components/base/BaseButton.vue'
import { getRoleBadgeClass, getParticipantDisplayName } from '@/features/campaign/campaignUtils.js'

const props = defineProps({
  campaignId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['participants-updated'])

const campaignStore = useCampaignStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const campaign = ref(null)
const isSaving = ref(false)
const editingParticipantId = ref(null)

// Search functionality
const searchTerm = ref('')
const searchResults = ref([])
const isSearching = ref(false)

const loadCampaignData = async () => {
  try {
    campaign.value = await campaignStore.fetchCampaign(props.campaignId)
  } catch (error) {
    console.error('Failed to load campaign:', error)
  }
}

watch(() => props.campaignId, loadCampaignData, { immediate: true })

// Keep the local copy in sync when the parent refreshes the shared store.
watch(
  () => campaignStore.currentCampaign,
  (updated) => {
    if (updated && String(updated.id) === String(props.campaignId)) {
      campaign.value = updated
    }
  },
)

const participants = computed(() => campaign.value?.participants || [])

const permissions = computed(() => getCampaignPermissions(campaign.value, userStore.userId))
const canManageParticipants = computed(() => permissions.value.canManageParticipants)
const canChangeRoles = computed(() => permissions.value.canChangeParticipantRoles)
const canEditOthersNicknames = computed(() => permissions.value.canEditOthersNicknames)

const gmCount = computed(() => participants.value.filter((p) => p.role === 'GM').length)
const playerCount = computed(() => participants.value.filter((p) => p.role !== 'GM').length)

const isSelf = (participant) => String(participant.id) === String(userStore.userId)
const isCampaignOwner = (participant) => String(participant.id) === String(campaign.value?.ownerId)

// The owner manages membership and other people's nicknames. Neither applies to
// your own row (your nickname lives in "My Settings", and the owner cannot
// remove themselves).
const canEditNicknameFor = (participant) => canEditOthersNicknames.value && !isSelf(participant)
const canRemoveFor = (participant) => canManageParticipants.value && !isSelf(participant)

const searchUsers = async () => {
  if (!searchTerm.value.trim()) return
  try {
    isSearching.value = true
    const users = await campaignStore.searchUsers(searchTerm.value)
    searchResults.value = users.filter(
      (user) => !participants.value.some((p) => String(p.id) === String(user.id)),
    )
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

const addParticipant = async (user) => {
  try {
    isSaving.value = true
    await campaignStore.addParticipantsToCampaign(props.campaignId, [
      { id: user.id, nickname: user.displayName || user.username, role: 'PLAYER' },
    ])
    searchResults.value = searchResults.value.filter((u) => u.id !== user.id)
    const name = user.displayName || user.username
    notificationStore.addNotification(`${name} added successfully to the campaign!`, 'success')
    emit('participants-updated')
  } catch {
    /* handled in campaignStore */
  } finally {
    isSaving.value = false
  }
}

const removeParticipant = async (participant) => {
  try {
    await campaignStore.removeParticipantsFromCampaign(props.campaignId, [participant.id])
    emit('participants-updated', `Participant ${getParticipantDisplayName(participant)} removed.`)
  } catch (error) {
    console.error('Failed to remove participant:', error)
    notificationStore.addNotification(`Failed to remove participant: ${error.message}`, 'error')
  }
}

const toggleRole = async (participant) => {
  try {
    const newRole = participant.role === 'PLAYER' ? 'GM' : 'PLAYER'
    await campaignStore.updateParticipantRole(props.campaignId, participant.id, newRole)
    emit('participants-updated', `${getParticipantDisplayName(participant)} updated to ${newRole}`)
  } catch (error) {
    console.error('Failed to toggle role:', error)
    notificationStore.addNotification(
      `Failed to update role for ${getParticipantDisplayName(participant)}`,
    )
  }
}

const updateNicknameForParticipant = (participant) => {
  editingParticipantId.value = participant.id
}

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
</script>

<template>
  <div class="space-y-6">
    <!-- Role summary (makes the multi-GM model explicit) -->
    <div class="flex flex-wrap gap-2">
      <span class="badge badge-primary">{{ gmCount }} GM{{ gmCount === 1 ? '' : 's' }}</span>
      <span class="badge badge-secondary">
        {{ playerCount }} Player{{ playerCount === 1 ? '' : 's' }}
      </span>
    </div>

    <!-- Add Participants (campaign owner only) -->
    <div v-if="canManageParticipants" class="border border-section rounded-lg p-4">
      <h4 class="text-lg font-semibold mb-3">Add Participants</h4>

      <div class="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          id="participant-search-input"
          v-model="searchTerm"
          type="text"
          class="input-field p-3 rounded flex-grow"
          placeholder="username or email"
          aria-label="Search users by username or email"
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

      <div v-if="searchResults.length" class="mt-3 border-t border-subtle pt-3">
        <h5 class="font-medium mb-2">Search Results</h5>
        <ul class="divide-y divide-primary-200">
          <li
            v-for="user in searchResults"
            :key="user.id"
            class="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <div>
              <div class="font-medium">{{ user.displayName || user.username }}</div>
              <div class="text-sm text-muted">{{ user.email }}</div>
            </div>
            <BaseButton
              variant="add"
              class="self-end sm:self-auto"
              :disabled="isSaving"
              @click="addParticipant(user)"
            >
              Add to Campaign
            </BaseButton>
          </li>
        </ul>
      </div>
    </div>

    <!-- Roster (everyone) with per-role actions -->
    <div class="border border-section rounded-lg p-4">
      <h4 class="text-lg font-semibold mb-3">Participants</h4>

      <ul v-if="participants.length" class="space-y-3">
        <li
          v-for="participant in participants"
          :key="participant.id"
          class="border border-section rounded p-3"
        >
          <!-- View mode -->
          <div v-if="editingParticipantId !== participant.id" class="space-y-3">
            <div class="flex justify-between items-center gap-2">
              <div class="font-medium truncate">{{ getParticipantDisplayName(participant) }}</div>
              <span class="badge" :class="getRoleBadgeClass(participant.role)">
                {{ participant.role || 'PLAYER' }}
              </span>
            </div>

            <div v-if="isCampaignOwner(participant)" class="text-sm text-muted">Campaign owner</div>
            <div v-else-if="isSelf(participant)" class="text-sm text-muted">This is you</div>

            <div class="flex flex-wrap gap-2">
              <BaseButton v-if="canChangeRoles" variant="update" @click="toggleRole(participant)">
                Change to {{ participant.role === 'PLAYER' ? 'GM' : 'Player' }}
              </BaseButton>
              <BaseButton
                v-if="canEditNicknameFor(participant)"
                variant="update"
                @click="updateNicknameForParticipant(participant)"
              >
                Edit Nickname
              </BaseButton>
              <BaseButton
                v-if="canRemoveFor(participant)"
                variant="remove"
                :confirm-message="`Are you sure you want to remove ${getParticipantDisplayName(participant)}?`"
                @click="removeParticipant(participant)"
              >
                Remove
              </BaseButton>
            </div>
          </div>

          <!-- Edit nickname mode (a GM managing another participant) -->
          <div v-else class="space-y-3">
            <input
              :id="`participant-nickname-${participant.id}`"
              v-model="participant.nickname"
              type="text"
              class="input-field p-2 rounded w-full"
              :disabled="isSaving"
              :aria-label="`New nickname for ${getParticipantDisplayName(participant)}`"
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
      <p v-else class="text-muted text-sm italic">No participants yet.</p>
    </div>
  </div>
</template>
