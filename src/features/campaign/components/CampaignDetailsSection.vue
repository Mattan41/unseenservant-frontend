<script setup>
/**
 * GM-only campaign details (name, short description, game system, image).
 *
 * The two longer markdown blocks — world lore and the GM-only notes — are
 * edited in place in the "World Lore & Background" section, next to the read
 * view they belong to (see `CampaignView`); this form sends them back verbatim
 * so saving here never clears them.
 *
 * Gated by `canEditCampaignDetails` (campaign GM): campaign content is a
 * world-building concern, separate from ownership.
 */
import { computed, ref, watch } from 'vue'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { getCampaignPermissions } from '@/features/campaign/campaignPermissions.js'
import CampaignDetailsForm from '@/features/campaign/components/CampaignDetailsForm.vue'

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
const isSaving = ref(false)

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

// Shape handed to the presentational form. World lore and the GM notes are not
// part of it: they are edited in place in the "World Lore & Background" section.
const details = computed(() => ({
  id: campaign.value?.id,
  title: campaign.value?.name || '',
  description: campaign.value?.description || '',
  primarySystem: campaign.value?.primarySystem || null,
  imageUrl: campaign.value?.imageUrl || '/default-campaign.svg',
}))

const saveDetails = async (updated) => {
  if (!permissions.value.canEditCampaignDetails) return
  isSaving.value = true
  try {
    // The PUT replaces every campaign detail, so the two lore blocks (which this
    // form does not own) are sent back verbatim, or saving here would clear them.
    await campaignStore.updateCampaignInfo(campaign.value.id, {
      name: updated.title,
      description: updated.description,
      worldLore: campaign.value.worldLore,
      privateDescription: campaign.value.privateDescription,
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
</script>

<template>
  <div
    v-if="campaign"
    class="rounded-lg shadow-md p-4"
    style="background-color: var(--color-primary-200)"
  >
    <h4 class="text-lg font-semibold mb-4">Campaign Details</h4>
    <CampaignDetailsForm :campaign="details" :saving="isSaving" @save="saveDetails" />
  </div>
</template>

<style scoped></style>
