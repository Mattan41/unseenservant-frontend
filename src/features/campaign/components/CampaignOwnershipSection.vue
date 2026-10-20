<script setup>
/**
 * Owner-only campaign administration — the "Danger Zone".
 *
 * Transfers ownership to another participant and deletes the campaign. This is
 * the ownership axis only; world-building lives in `CampaignDetailsSection.vue`
 * and roster management in `CampaignParticipants.vue`.
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { getCampaignPermissions } from '@/features/campaign/campaignPermissions.js'
import { getParticipantDisplayName } from '@/features/campaign/campaignUtils.js'
import BaseButton from '@/components/base/BaseButton.vue'

const props = defineProps({
  campaignId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['updated'])

const router = useRouter()
const campaignStore = useCampaignStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const campaign = ref(null)
const transferTargetId = ref('')

const permissions = computed(() => getCampaignPermissions(campaign.value, userStore.userId))

const loadCampaignData = async () => {
  try {
    campaign.value = await campaignStore.fetchCampaign(props.campaignId)
  } catch (error) {
    console.error('Failed to load campaign:', error)
  }
}

watch(() => props.campaignId, loadCampaignData, { immediate: true })

watch(
  () => campaignStore.currentCampaign,
  (updated) => {
    if (updated && String(updated.id) === String(props.campaignId)) {
      campaign.value = updated
    }
  },
)

// Everyone except the current owner is a valid transfer target.
const transferCandidates = computed(() =>
  (campaign.value?.participants || []).filter(
    (p) => String(p.id) !== String(campaign.value?.ownerId),
  ),
)

const transferOwnership = () => {
  if (!permissions.value.canTransferOwnership || !transferTargetId.value) return
  campaignStore
    .transferCampaignOwnership(props.campaignId, transferTargetId.value)
    .then(() => {
      transferTargetId.value = ''
      emit('updated')
      notificationStore.addNotification('Campaign ownership transferred successfully!', 'success')
    })
    .catch((error) => {
      console.error('Error transferring ownership:', error)
    })
}

// Confirmation is handled by the button's `confirm-message`, so no second
// `window.confirm` here.
const deleteCampaign = () => {
  if (!permissions.value.canDeleteCampaign) return
  campaignStore
    .deleteCampaign(props.campaignId)
    .then(() => {
      campaign.value = null
      setTimeout(() => router.push({ name: 'CampaignsView' }), 100)
    })
    .catch((error) => {
      notificationStore.addNotification(error.message || 'Failed to delete campaign', 'error')
      console.error('Failed to delete campaign:', error)
    })
}
</script>

<template>
  <div v-if="campaign" class="danger-zone">
    <h4 class="danger-zone-title">Danger Zone</h4>

    <!-- Transfer ownership -->
    <div class="mb-6">
      <h5 class="font-medium mb-1">Transfer ownership</h5>
      <p class="text-sm text-muted mb-2">
        Hand over full control of this campaign to another participant.
      </p>
      <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
        <select
          id="campaign-transfer-target"
          v-model="transferTargetId"
          class="input-field p-2 rounded"
          aria-label="Participant to transfer ownership to"
        >
          <option value="">Select a participant…</option>
          <option
            v-for="participant in transferCandidates"
            :key="participant.id"
            :value="participant.id"
          >
            {{ getParticipantDisplayName(participant) }}
          </option>
        </select>
        <BaseButton
          variant="update"
          :disabled="!transferTargetId"
          confirm-message="Are you sure you want to transfer ownership?"
          @click="transferOwnership"
        >
          Transfer ownership
        </BaseButton>
      </div>
      <p v-if="!transferCandidates.length" class="text-sm text-muted mt-2">
        There are no other participants to transfer ownership to yet.
      </p>
    </div>

    <!-- Delete -->
    <div>
      <h5 class="font-medium mb-1">Delete campaign</h5>
      <p class="text-sm text-muted mb-2">
        Permanently delete this campaign. This cannot be undone.
      </p>
      <BaseButton
        variant="remove"
        confirm-message="You are about to delete this campaign. This action cannot be undone. Are you sure?"
        @click="deleteCampaign"
      >
        Delete Campaign
      </BaseButton>
    </div>
  </div>
</template>

<style scoped></style>
