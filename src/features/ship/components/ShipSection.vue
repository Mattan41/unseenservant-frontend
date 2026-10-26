<script setup>
/**
 * Smart container for the Offworlders ship (rendered inside CampaignView like
 * `MessageBoard`). Owns the section's store interaction: refreshing on mount and
 * handling saving/image events. Loading and clearing are owned by CampaignView,
 * which shares the ship store with the Overview summary card.
 *
 * The crew is the campaign's characters, so it comes from the campaign store
 * rather than the ship store — the ship sheet only presents it.
 */
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useShipStore } from '@/features/ship/shipStore.js'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
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
const notificationStore = useNotificationStore()
const { ship, isLoading, isSaving, error, hasConflict } = storeToRefs(shipStore)

/** The campaign, for the crew cards' player names and roles. */
const campaign = computed(() => campaignStore.getCampaignById(props.campaignId) || null)

/** The crew: the campaign's characters, in the store's fixed party order. */
const crewCharacters = computed(() => campaignStore.getCharactersByCampaignId(props.campaignId))

/** The campaign's participants, so a crew card can name each character's player. */
const participants = computed(() => campaign.value?.participants || [])

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
  const campaignName = campaign.value?.name || ''
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
  // The crew is the campaign's characters; the store keeps them cached, so a
  // revisit re-reads them from there.
  await Promise.all([
    shipStore.fetchShip(props.campaignId),
    campaignStore.fetchCharactersForCampaign(props.campaignId),
  ])
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
        :characters="crewCharacters"
        :participants="participants"
        @save="handleSave"
        @reload="loadShip"
        @upload-profile="handleUploadProfile"
        @add-gallery="handleAddGallery"
        @remove-gallery="handleRemoveGallery"
        @adjust-vital="handleAdjustVital"
        @size-error="handleSizeError"
      />
    </div>
  </div>
</template>
