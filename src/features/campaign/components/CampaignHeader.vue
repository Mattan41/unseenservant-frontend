<script setup>
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
})
</script>

<template>
  <div class="mb-6">
    <!-- Title is shown on desktop; on mobile it lives in the campaign top bar -->
    <h2 class="hidden md:block text-xl sm:text-2xl font-bold break-words">{{ title }}</h2>
    <CampaignImage :src="imageUrl" :alt="title" class="w-full h-48 object-cover rounded mt-3" />
  </div>
</template>
