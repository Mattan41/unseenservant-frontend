<script setup>
/**
 * Campaign participants — roster + (owner/GM) management.
 *
 * Everyone can view the roster; adding, role changes, nickname edits and
 * removal are gated by `canManage` (campaign owner or a GM). Ownership transfer
 * and campaign deletion live in the owner-only `CampaignSettingsSection.vue`.
 */
import { computed, ref, watch } from 'vue'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
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
const updatingRoles = ref(new Set())

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

const isOwner = computed(() => {
  if (!campaign.value || !userStore.currentUser) return false
  return String(campaign.value.ownerId) === String(userStore.userId)
})

const isGm = computed(() => {
  if (!campaign.value || !userStore.currentUser) return false
  return campaignStore.isUserGM(campaign.value.id, userStore.userId)
})

const canManage = computed(() => isOwner.value || isGm.value)

const gmCount = computed(() => participants.value.filter((p) => p.role === 'GM').length)
const playerCount = computed(() => participants.value.filter((p) => p.role !== 'GM').length)

// A non-owner GM must not modify the campaign owner's entry.
const canModifyParticipant = (participant) => {
  if (!canManage.value) return false
  if (isOwner.value) return true
  return String(participant.id) !== String(campaign.value.ownerId)
}

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
    updatingRoles.value.add(participant.id)
    const newRole = participant.role === 'PLAYER' ? 'GM' : 'PLAYER'
    await campaignStore.updateParticipantRole(props.campaignId, participant.id, newRole)
    emit('participants-updated', `${getParticipantDisplayName(participant)} updated to ${newRole}`)
  } catch (error) {
    console.error('Failed to toggle role:', error)
    notificationStore.addNotification(
      `Failed to update role for ${getParticipantDisplayName(participant)}`,
    )
  } finally {
    updatingRoles.value.delete(participant.id)
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

    <!-- Roster (everyone) -->
    <ul v-if="participants.length" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <li
        v-for="participant in participants"
        :key="participant.id"
        class="flex items-center justify-between gap-2 border border-section rounded-md px-3 py-2"
      >
        <span
          class="text-default font-medium truncate"
          :title="getParticipantDisplayName(participant)"
        >
          {{ getParticipantDisplayName(participant) }}
        </span>
        <span class="flex items-center gap-1 flex-shrink-0">
          <span
            v-if="String(participant.id) === String(userStore.userId)"
            class="text-subtle text-xs"
          >
            You
          </span>
          <span class="badge" :class="getRoleBadgeClass(participant.role)">
            {{ participant.role || 'PLAYER' }}
          </span>
          <span v-if="String(participant.id) === String(campaign.ownerId)" class="badge badge-info">
            Owner
          </span>
        </span>
      </li>
    </ul>
    <p v-else class="text-muted text-sm italic">No participants yet.</p>
    <!-- Management (campaign owner or GM) -->
    <div v-if="canManage" class="space-y-6">
      <!-- Add Participants -->
      <div class="border border-section rounded-lg p-4">
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

      <!-- Manage Participants -->
      <div class="border border-section rounded-lg p-4">
        <h4 class="text-lg font-semibold mb-3">Manage Participants</h4>

        <ul class="space-y-4">
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

              <div
                v-if="String(participant.id) === String(campaign.ownerId)"
                class="text-sm text-muted"
              >
                Campaign owner
              </div>
              <div
                v-else-if="String(participant.id) === String(userStore.userId)"
                class="text-sm text-muted"
              >
                This is you
              </div>

              <div class="flex flex-wrap gap-2">
                <BaseButton
                  v-if="canModifyParticipant(participant)"
                  variant="update"
                  @click="toggleRole(participant)"
                >
                  Change to {{ participant.role === 'PLAYER' ? 'GM' : 'Player' }}
                </BaseButton>
                <BaseButton
                  v-if="canModifyParticipant(participant)"
                  variant="update"
                  @click="updateNicknameForParticipant(participant)"
                >
                  Edit Nickname
                </BaseButton>
                <BaseButton
                  v-if="canModifyParticipant(participant)"
                  variant="remove"
                  :confirm-message="`Are you sure you want to remove ${getParticipantDisplayName(participant)}?`"
                  @click="removeParticipant(participant)"
                >
                  Remove
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
      </div>
    </div>
  </div>
</template>

<style scoped></style>
