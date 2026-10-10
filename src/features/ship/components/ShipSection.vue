<script setup>
/**
 * Smart container for the Offworlders ship (rendered inside CampaignView like
 * `MessageBoard`). Owns the section's store interaction: refreshing on mount and
 * handling saving/image events. Loading and clearing are owned by CampaignView,
 * which shares the ship store with the Overview summary card.
 */
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useShipStore } from '@/features/ship/shipStore.js'
import ShipSheet from '@/features/ship/components/ShipSheet.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const props = defineProps({
  campaignId: {
    type: [Number, String],
    required: true,
  },
})

const shipStore = useShipStore()
const { ship, isLoading, isSaving, error, hasConflict } = storeToRefs(shipStore)

async function loadShip() {
  await shipStore.fetchShip(props.campaignId)
}

async function handleSave(shipData) {
  try {
    await shipStore.saveShip(props.campaignId, shipData)
  } catch {
    // Error is surfaced by the store (notification + conflict banner).
  }
}

async function handleUploadProfile(file) {
  try {
    await shipStore.uploadShipImage(props.campaignId, file)
  } catch {
    // Error is surfaced by the store.
  }
}

async function handleAddGallery(file) {
  try {
    await shipStore.addGalleryImage(props.campaignId, file)
  } catch {
    // Error is surfaced by the store.
  }
}

async function handleRemoveGallery(url) {
  try {
    await shipStore.removeGalleryImage(props.campaignId, url)
  } catch {
    // Error is surfaced by the store.
  }
}

// The ship is loaded (and cleared) by the parent CampaignView so the Overview
// summary and this section share one store; mount just refreshes it.
onMounted(loadShip)
</script>

<template>
  <div>
    <div v-if="isLoading" class="flex items-center justify-center py-4">
      <div class="spinner h-6 w-6"></div>
      <span class="ml-2 text-muted">Loading ship...</span>
    </div>

    <div v-else-if="error" class="py-4 text-center">
      <p class="error-message mb-2">{{ error }}</p>
      <BaseButton variant="retry" @click="loadShip">Retry</BaseButton>
    </div>

    <ShipSheet
      v-else-if="ship"
      :ship="ship"
      :saving="isSaving"
      :conflict="hasConflict"
      @save="handleSave"
      @reload="loadShip"
      @upload-profile="handleUploadProfile"
      @add-gallery="handleAddGallery"
      @remove-gallery="handleRemoveGallery"
    />
  </div>
</template>
