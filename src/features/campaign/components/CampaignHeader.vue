<script setup>
import CampaignImage from '@/features/campaign/components/CampaignImage.vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
  descriptionExpanded: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['edit-click', 'toggle-description'])
</script>

<template>
  <div class="mb-6">
    <div class="group relative">
      <div class="flex justify-between items-start">
        <h2 class="text-xl sm:text-2xl font-bold">
          {{ title }}
        </h2>
        <button
          v-if="isOwner"
          @click="$emit('edit-click')"
          class="button button-primary button-small button-outline"
        >
          Edit Campaign
        </button>
      </div>

      <!-- Campaign image -->
      <CampaignImage :src="imageUrl" :alt="title" class="w-full h-48 object-cover rounded" />

      <!-- Campaign description with line clamp -->
      <div class="mt-3 break-words whitespace-pre-line">
        <p v-if="!description" class="italic text-gray-500 text-sm">No description available.</p>

        <template v-else>
          <p :class="{ 'line-clamp-2': !descriptionExpanded }" class="text-sm text-gray-700">
            {{ description }}
          </p>

          <button
            v-if="description && description.length > 60"
            @click="$emit('toggle-description')"
            class="text-xs text-primary-500 mt-1 hover:underline"
          >
            {{ descriptionExpanded ? 'Show less' : 'Read more' }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
