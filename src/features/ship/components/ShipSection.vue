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
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import ShipSheet from '@/features/ship/components/ShipSheet.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import ExportMenu from '@/components/base/ExportMenu.vue'
import { buildShipExport } from '@/features/ship/shipExport.js'
import { downloadTextFile, dateStamp, slugifyFileName } from '@/utils/download.js'

const props = defineProps({
  campaignId: {
    type: [Number, String],
    required: true,
  },
})

const shipStore = useShipStore()
const campaignStore = useCampaignStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const { ship, crew, isLoading, isSaving, error, hasConflict } = storeToRefs(shipStore)

// The ship is Offworlders-only, and its images are exempt from export.
const SHIP_EXPORT_FORMATS = [
  { id: 'md', label: 'Markdown (.md)' },
  { id: 'txt', label: 'Plain text (.txt)' },
]

/**
 * Build and download the ship as markdown or plain text.
 * @param {'md'|'txt'} format
 */
function exportShip(format) {
  if (!ship.value) return
  const campaignName = campaignStore.getCampaignById(props.campaignId)?.name || ''
  const content = buildShipExport(ship.value, { format, campaignName })
  const base = `${slugifyFileName(ship.value.name, 'ship')}-${dateStamp()}`
  downloadTextFile({
    filename: `${base}.${format}`,
    content,
    mime: format === 'md' ? 'text/markdown' : 'text/plain',
  })
  notificationStore.addNotification(`Exported ship as .${format}`, 'success')
}

async function loadShip() {
  await Promise.all([shipStore.fetchShip(props.campaignId), shipStore.fetchCrew(props.campaignId)])
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

// Inline Hull / Drive fuel / Credits steppers save immediately (no edit mode).
async function handleAdjustVital({ field, value }) {
  try {
    await shipStore.adjustShipField(props.campaignId, field, value)
  } catch {
    // Error is surfaced by the store (notification + conflict banner).
  }
}

// Crew manifest: the signed-in user's entry (notes, characters, images).
async function handleSaveCrew(entry) {
  try {
    await shipStore.saveMyCrewEntry(props.campaignId, entry)
  } catch {
    // Error is surfaced by the store.
  }
}

async function handleAddCrewImage(file) {
  try {
    await shipStore.addCrewImage(props.campaignId, file)
  } catch {
    // Error is surfaced by the store.
  }
}

async function handleRemoveCrewImage(url) {
  try {
    await shipStore.removeCrewImage(props.campaignId, url)
  } catch {
    // Error is surfaced by the store.
  }
}

/** An image over the upload limit: show the sentence the sheet produced. */
function handleSizeError(message) {
  notificationStore.addNotification(message, 'error')
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

    <div v-else-if="ship">
      <div class="flex justify-end mb-3">
        <ExportMenu :formats="SHIP_EXPORT_FORMATS" @export="exportShip" />
      </div>

      <ShipSheet
        :ship="ship"
        :saving="isSaving"
        :conflict="hasConflict"
        :crew="crew"
        :current-user-id="userStore.userId"
        @save="handleSave"
        @reload="loadShip"
        @upload-profile="handleUploadProfile"
        @add-gallery="handleAddGallery"
        @remove-gallery="handleRemoveGallery"
        @adjust-vital="handleAdjustVital"
        @save-crew="handleSaveCrew"
        @add-crew-image="handleAddCrewImage"
        @remove-crew-image="handleRemoveCrewImage"
        @size-error="handleSizeError"
      />
    </div>
  </div>
</template>
