<script setup>
/**
 * Owner-only campaign settings.
 *
 * Renders the campaign details form plus a Danger Zone (delete campaign,
 * transfer ownership). Replaces the former Edit Campaign modal and absorbs
 * delete/transfer from the old Settings tab so every owner-level control lives
 * in one clearly-gated section.
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import CampaignDetailsForm from '@/features/campaign/components/CampaignDetailsForm.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { getParticipantDisplayName } from '@/features/campaign/campaignUtils.js'

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
const isSaving = ref(false)
const transferTargetId = ref('')

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

const isOwner = computed(() => {
  if (!campaign.value || !userStore.currentUser) return false
  return String(campaign.value.ownerId) === String(userStore.userId)
})

// Everyone except the current owner is a valid transfer target.
const transferCandidates = computed(() =>
  (campaign.value?.participants || []).filter(
    (p) => String(p.id) !== String(campaign.value?.ownerId),
  ),
)

// Shape handed to the presentational form.
const details = computed(() => ({
  id: campaign.value?.id,
  title: campaign.value?.name || '',
  description: campaign.value?.description || '',
  primarySystem: campaign.value?.primarySystem || null,
  imageUrl: campaign.value?.imageUrl || '/default-campaign.svg',
}))

const saveDetails = async (updated) => {
  if (!isOwner.value) return
  isSaving.value = true
  try {
    await campaignStore.updateCampaignInfo(campaign.value.id, {
      name: updated.title,
      description: updated.description,
      primarySystem: updated.primarySystem,
    })

    if (updated.imageFile) {
      const response = await campaignStore.uploadCampaignImage(campaign.value.id, updated.imageFile)
      campaign.value.imageUrl = response.imageUrl
    }

    campaign.value.name = updated.title
    campaign.value.description = updated.description
    campaign.value.primarySystem = updated.primarySystem
    emit('updated')
    notificationStore.addNotification('Campaign updated successfully!', 'success', 3000)
  } catch (error) {
    console.error('Campaign update failed:', error)
  } finally {
    isSaving.value = false
  }
}

const deleteCampaign = () => {
  if (!isOwner.value) return
  if (
    !confirm('You are about to delete this campaign. This action cannot be undone. Are you sure?')
  ) {
    return
  }

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

const transferOwnership = () => {
  if (!isOwner.value || !transferTargetId.value) return
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
</script>
<template>
  <div v-if="campaign && isOwner" class="space-y-6">
    <!-- Details -->
    <div class="rounded-lg shadow-md p-4" style="background-color: var(--color-primary-200)">
      <h4 class="text-lg font-semibold mb-4">Campaign Details</h4>
      <CampaignDetailsForm :campaign="details" :saving="isSaving" @save="saveDetails" />
    </div>

    <!-- Danger Zone -->
    <div class="danger-zone">
      <h4 class="danger-zone-title">Danger Zone</h4>

      <!-- Transfer ownership -->
      <div class="mb-6">
        <h5 class="font-medium mb-1">Transfer ownership</h5>
        <p class="text-sm text-muted mb-2">
          Hand over full control of this campaign to another participant.
        </p>
        <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            v-model="transferTargetId"
            class="p-2 rounded"
            style="background-color: var(--color-primary-50)"
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
          confirm-message="Are you sure you want to delete this campaign?"
          @click="deleteCampaign"
        >
          Delete Campaign
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
