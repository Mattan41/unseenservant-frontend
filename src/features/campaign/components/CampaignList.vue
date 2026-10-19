<script setup>
import { computed, onMounted, ref } from 'vue'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import CreateCampaign from '@/features/campaign/components/CreateCampaign.vue'
import CampaignImage from '@/features/campaign/components/CampaignImage.vue'
import { toPlainText } from '@/utils/markdown.js'

const campaignStore = useCampaignStore()
const expandedDescriptions = ref({})

// The rendered order is the store's derived, per-user one: most recently viewed
// campaign first (see `campaignStore.sortedCampaigns` and `viewHistory.js`).

/**
 * Descriptions as plain text, keyed by campaign id.
 *
 * The card shows a truncation of the description inside a link, so the markdown
 * syntax is stripped: a cut must never land inside `**bold**`, and rendered
 * links cannot be nested inside the card's own anchor. The full, rendered
 * description lives on the campaign page.
 */
const descriptionPreviews = computed(() => {
  const previews = {}
  for (const campaign of campaignStore.campaigns) {
    previews[campaign.id] = toPlainText(campaignStore.getCampaignDescription(campaign.id) || '')
  }
  return previews
})

const toggleDescription = (campaignId) => {
  expandedDescriptions.value[campaignId] = !expandedDescriptions.value[campaignId]
}

onMounted(async () => {
  await campaignStore.fetchAllCampaignsForCurrentUser()
})
</script>
<template>
  <div>
    <h2 class="mb-4">Campaigns</h2>

    <div v-if="campaignStore.isLoading" class="text-center p-8">
      <div class="spinner h-8 w-8 border-b-2"></div>
      <p class="mt-2">Loading campaigns...</p>
    </div>

    <!-- Empty state: the dashed discovery tile, as on the characters list. -->
    <div
      v-else-if="!campaignStore.sortedCampaigns.length"
      class="mx-auto max-w-xs py-4 text-center"
    >
      <p class="text-secondary mb-3">You aren't in any campaign yet.</p>
      <CreateCampaign />
    </div>

    <ul v-else>
      <!-- First row: the same dashed tile, so creating a campaign reads like
           adding a row to the list. -->
      <li class="mb-4">
        <CreateCampaign />
      </li>
      <li
        v-for="campaign in campaignStore.sortedCampaigns"
        :key="campaign.id"
        class="mb-4 p-4 rounded"
        style="background-color: var(--color-primary-100)"
      >
        <RouterLink
          :to="{ name: 'CampaignView', params: { id: campaign.id } }"
          class="element-link"
        >
          <h3 class="text-lg font-bold break-words">
            {{ campaignStore.getCampaignTitle(campaign.id) }}
          </h3>

          <CampaignImage
            :src="campaignStore.getCampaignImageUrl(campaign.id)"
            :alt="campaignStore.getCampaignTitle(campaign.id)"
            class="w-full h-48 object-cover rounded"
          />

          <!-- Description preview with read more/less (plain text: see
               `descriptionPreviews` above) -->
          <div class="break-words">
            <p
              v-if="
                descriptionPreviews[campaign.id].length <= 150 || expandedDescriptions[campaign.id]
              "
            >
              {{ descriptionPreviews[campaign.id] }}
            </p>
            <p v-else>{{ descriptionPreviews[campaign.id].substring(0, 150) }}...</p>
            <button
              v-if="descriptionPreviews[campaign.id].length > 150"
              @click.prevent="toggleDescription(campaign.id)"
              class="read-more-link text-sm mt-1"
            >
              {{ expandedDescriptions[campaign.id] ? 'Show Less' : 'Read More' }}
            </button>
          </div>

          <ul class="mt-2">
            <li v-for="participant in campaign.participants" :key="participant.id">
              {{ participant.nickname }} ( {{ participant.role }} )
            </li>
          </ul>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped></style>
