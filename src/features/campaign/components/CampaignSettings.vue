<script setup>
/**
 * Personal campaign settings (available to every participant).
 *
 * Currently only holds the participant's own nickname for this campaign.
 * Campaign-level/destructive settings live in `CampaignSettingsSection.vue`
 * (owner only) and participant management lives in `CampaignParticipants.vue`.
 */
import { computed, ref, watch } from 'vue'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import BaseButton from '@/components/base/BaseButton.vue'

const props = defineProps({
  campaignId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['updated'])

const campaignStore = useCampaignStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const campaign = ref(null)
const nickname = ref('')
const isEditingNickname = ref(false)
const isSaving = ref(false)

const loadCampaignData = async () => {
  try {
    campaign.value = await campaignStore.fetchCampaign(props.campaignId)
    nickname.value = campaign.value.nickname
  } catch (error) {
    console.error('Failed to load campaign:', error)
  }
}

const currentUserNickname = computed(() => {
  if (!campaign.value || !userStore.currentUser) return ''
  const participant = campaign.value.participants.find(
    (p) => String(p.id) === String(userStore.userId),
  )
  return participant ? participant.nickname : ''
})

watch(() => props.campaignId, loadCampaignData, { immediate: true })

// Keep the locally rendered campaign in sync when the parent refreshes the
// shared store after a mutation.
watch(
  () => campaignStore.currentCampaign,
  (updated) => {
    if (updated && String(updated.id) === String(props.campaignId)) {
      campaign.value = updated
    }
  },
)

const startEditingNickname = () => {
  isEditingNickname.value = true
}

const cancelEditingNickname = () => {
  isEditingNickname.value = false
  nickname.value = campaign.value.nickname
}

const saveNickname = async () => {
  const value = (nickname.value || '').trim()
  if (!value) {
    notificationStore.addNotification('Nickname cannot be empty', 'error')
    return
  }
  try {
    isSaving.value = true
    await campaignStore.updateParticipantNickname(props.campaignId, userStore.userId, value)
    isEditingNickname.value = false
    emit('updated')
  } catch (error) {
    notificationStore.addNotification(`Failed to update nickname: ${error.message}`, 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="rounded-lg shadow-md p-4" style="background-color: var(--color-primary-200)">
    <div class="border border-section rounded-lg p-4 max-w-lg">
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
        <BaseButton variant="ghost" class="flex-1" :disabled="isSaving" @click="cancelEditingNickname">
          Cancel
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
