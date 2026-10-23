<script setup>
/**
 * Campaign header: the (desktop) title plus the campaign image.
 *
 * The image URL is resolved by the smart parent (from `campaignStore`), and
 * `systemType` is passed straight through so the placeholder behind a missing or
 * broken image is the campaign's own system's art.
 */
import CampaignImage from '@/features/campaign/components/CampaignImage.vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    default: '',
  },
  /** The campaign's `primarySystem`, for the placeholder art. */
  systemType: {
    type: String,
    default: null,
  },
})
</script>

<template>
  <div class="mb-6">
    <!-- Title is shown on desktop; on mobile it lives in the campaign top bar -->
    <h2 class="hidden md:block text-xl sm:text-2xl font-bold break-words">{{ title }}</h2>
    <CampaignImage
      :src="imageUrl"
      :alt="title"
      :system-type="systemType"
      class="w-full h-48 object-cover rounded mt-3"
    />
  </div>
</template>
