<script setup>
/**
 * Presentational Offworlders ship sheet (form/display only).
 *
 * Mirrors the printed ship sheet (p.26) but stays simple: name, vitals,
 * the upgrade checklist and a free-text notes/look area. Every participant may
 * edit; the parent owns saving (and the optimistic-concurrency reload flow).
 *
 * Props in, events out — no store access.
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import CampaignImage from '@/features/campaign/components/CampaignImage.vue'
import BaseStickyActions from '@/components/base/BaseStickyActions.vue'
import CampaignNavIcon from '@/features/campaign/components/CampaignNavIcon.vue'
import ImageRepositionModal from '@/components/base/ImageRepositionModal.vue'
import {
  OFFWORLDERS_SHIP_DEFAULT_IMAGE,
  OFFWORLDERS_SHIP_STARTING_UPGRADES,
  OFFWORLDERS_SHIP_UPGRADES,
  addShipUpgrade,
  createEmptyShipData,
  removeShipUpgrade,
  shipUpgradeCount,
  shipUpgradeMaxCount,
} from '@/systems/offworlders/shipConstants.js'
import { useUnsavedChanges } from '@/utils/useUnsavedChanges.js'

const props = defineProps({
  /** Normalized ship data block. */
  ship: {
    type: Object,
    required: true,
  },
  /** Parent-controlled saving state. */
  saving: {
    type: Boolean,
    default: false,
  },
  /** True when the last save was rejected because someone else edited first. */
  conflict: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save', 'reload', 'upload-profile', 'add-gallery', 'remove-gallery'])

const editing = ref(false)
const draft = reactive(createEmptyShipData())

// Signature of the editable fields, used to detect unsaved edits so we can warn
// before navigating away (image fields are excluded — they save on their own).
const baseline = ref('')

function draftSignature() {
  return JSON.stringify({
    name: draft.name,
    hull: draft.hull,
    hullMax: draft.hullMax,
    armor: draft.armor,
    damage: draft.damage,
    driveFuel: draft.driveFuel,
    maxDriveFuel: draft.maxDriveFuel,
    upgrades: draft.upgrades,
    notes: draft.notes,
  })
}

function resetDraft() {
  Object.assign(draft, createEmptyShipData(), props.ship)
  draft.upgrades = [...(props.ship.upgrades || [])]
  baseline.value = draftSignature()
}

// A pending image upload/replace also replaces `ship`, but must not drop the
// user's in-progress field edits or close edit mode.
let pendingImageOp = false

// Reset the draft (and leave edit mode) whenever the source ship changes —
// e.g. after a successful save or a reload.
watch(
  () => props.ship,
  () => {
    if (pendingImageOp) {
      pendingImageOp = false
      return
    }
    resetDraft()
    editing.value = false
  },
  { immediate: true, deep: true },
)

function startEditing() {
  resetDraft()
  editing.value = true
}

function cancelEditing() {
  resetDraft()
  editing.value = false
}

function count(upgrade) {
  return shipUpgradeCount(draft.upgrades, upgrade.name)
}

function maxCount(upgrade) {
  return shipUpgradeMaxCount(upgrade.name)
}

function addUpgrade(name) {
  draft.upgrades = addShipUpgrade(draft.upgrades, name)
}

function removeUpgrade(name) {
  draft.upgrades = removeShipUpgrade(draft.upgrades, name)
}

function submit() {
  pendingImageOp = false
  // Images are managed by their own endpoints, so they are not part of this payload.
  emit('save', {
    name: draft.name,
    hull: draft.hull,
    hullMax: draft.hullMax,
    armor: draft.armor,
    damage: draft.damage,
    driveFuel: draft.driveFuel,
    maxDriveFuel: draft.maxDriveFuel,
    upgrades: draft.upgrades,
    notes: draft.notes,
    version: props.ship.version,
  })
}

// In view mode only show the upgrades the ship actually has; the full catalog
// is shown while editing so upgrades can be added.
const visibleUpgrades = computed(() =>
  editing.value
    ? OFFWORLDERS_SHIP_UPGRADES
    : OFFWORLDERS_SHIP_UPGRADES.filter(
        (upgrade) => shipUpgradeCount(props.ship.upgrades, upgrade.name) > 0,
      ),
)

const profileInput = ref(null)
const galleryInput = ref(null)
const repositionFile = ref(null)
const lightboxUrl = ref(null)

// The profile image is shown as the first thumbnail of the gallery grid so it
// appears alongside the other ship images.
const galleryImages = computed(() => {
  const urls = [...(props.ship.imageUrls || [])]
  return props.ship.imageUrl ? [props.ship.imageUrl, ...urls] : urls
})

/** True when `url` is the ship's profile image (not a gallery image). */
function isProfileImage(url) {
  return Boolean(props.ship.imageUrl) && url === props.ship.imageUrl
}

/** Close the lightbox and open the profile-image picker. */
function changeProfileFromLightbox() {
  lightboxUrl.value = null
  triggerProfileInput()
}

function triggerProfileInput() {
  profileInput.value?.click()
}

function triggerGalleryInput() {
  galleryInput.value?.click()
}

function onProfileFileChange(event) {
  const file = event.target.files[0]
  event.target.value = ''
  if (file) repositionFile.value = file
}

function applyRepositionedImage(file) {
  repositionFile.value = null
  pendingImageOp = true
  emit('upload-profile', file)
}

function cancelReposition() {
  repositionFile.value = null
}

function onGalleryFileChange(event) {
  const file = event.target.files[0]
  event.target.value = ''
  if (file) {
    pendingImageOp = true
    emit('add-gallery', file)
  }
}

function removeGalleryImage(url) {
  pendingImageOp = true
  emit('remove-gallery', url)
  if (lightboxUrl.value === url) lightboxUrl.value = null
}

/** Step the lightbox to the previous/next image, wrapping around at the ends. */
function stepLightbox(offset) {
  const images = galleryImages.value
  const index = images.indexOf(lightboxUrl.value)
  if (index === -1) return
  lightboxUrl.value = images[(index + offset + images.length) % images.length]
}

function showPreviousImage() {
  stepLightbox(-1)
}

function showNextImage() {
  stepLightbox(1)
}

/** Arrow-key navigation while the lightbox is open. */
function onLightboxKeydown(event) {
  if (!lightboxUrl.value) return
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    showPreviousImage()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    showNextImage()
  }
}

onMounted(() => window.addEventListener('keydown', onLightboxKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onLightboxKeydown))

const isDirty = computed(() => editing.value && draftSignature() !== baseline.value)

// Warn before leaving the campaign while the ship has unsaved edits.
useUnsavedChanges(
  () => isDirty.value,
  'You have unsaved changes to the ship. Leave without saving?',
)
</script>

<template>
  <div class="space-y-6">
    <!-- Optimistic-concurrency notice -->
    <div v-if="conflict" class="error-message flex flex-wrap items-center justify-between gap-2">
      <span>This ship was changed by someone else. Reload to see the latest before editing.</span>
      <BaseButton variant="retry" @click="$emit('reload')">Reload</BaseButton>
    </div>

    <!-- Name (editable only while editing — the value itself is in the section
         heading). In view mode this row carries the primary action. -->
    <div v-if="editing" class="min-w-0">
      <label for="ship-name" class="block text-sm font-medium text-default mb-1">Name</label>
      <input
        id="ship-name"
        v-model="draft.name"
        type="text"
        class="input-field p-2 rounded w-full"
        placeholder="The Desert Rose"
      />
    </div>
    <div v-else class="flex justify-end">
      <BaseButton variant="update" icon="edit" @click="startEditing">Edit ship</BaseButton>
    </div>

    <!-- Profile image: in view mode it mirrors the campaign image banner; while
         editing it shrinks to the square editor (hover to change / reposition). -->
    <div class="flex items-start gap-4">
      <div class="relative" :class="editing ? 'w-40 flex-shrink-0' : 'w-full'">
        <CampaignImage
          :src="ship.imageUrl"
          :alt="ship.name || 'Ship'"
          :default-src="OFFWORLDERS_SHIP_DEFAULT_IMAGE"
          class="object-cover rounded-lg border-2"
          :class="editing ? 'w-40 h-40' : 'w-full h-48'"
          style="border-color: var(--color-primary-300)"
        />
        <button
          v-if="editing"
          type="button"
          class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-sm text-white opacity-0 hover:opacity-100 transition-opacity"
          @click="triggerProfileInput"
        >
          Change image
        </button>
        <input
          ref="profileInput"
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp"
          class="hidden"
          @change="onProfileFileChange"
        />
      </div>

      <div v-if="editing" class="flex-1 min-w-0 space-y-2">
        <p class="text-sm text-muted">Upload or reposition the ship's profile picture.</p>
        <!-- A real button, so touch devices (no hover) can change the image. -->
        <BaseButton variant="ghost" @click="triggerProfileInput">Change image</BaseButton>
      </div>
    </div>

    <!-- Vitals: Hull / Max, Armor, Damage, Fuel / Max -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <label for="ship-hull" class="block text-xs uppercase text-muted mb-1">Hull</label>
        <input
          id="ship-hull"
          v-model.number="draft.hull"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
        />
      </div>
      <div>
        <label for="ship-hull-max" class="block text-xs uppercase text-muted mb-1">Hull max</label>
        <input
          id="ship-hull-max"
          v-model.number="draft.hullMax"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
        />
      </div>
      <div>
        <label for="ship-armor" class="block text-xs uppercase text-muted mb-1">Armor</label>
        <input
          id="ship-armor"
          v-model.number="draft.armor"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
        />
      </div>
      <div>
        <label for="ship-damage" class="block text-xs uppercase text-muted mb-1">Damage</label>
        <input
          id="ship-damage"
          v-model="draft.damage"
          type="text"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
          placeholder="1D6"
        />
      </div>
      <div>
        <label for="ship-fuel" class="block text-xs uppercase text-muted mb-1">Drive fuel</label>
        <input
          id="ship-fuel"
          v-model.number="draft.driveFuel"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
        />
      </div>
      <div>
        <label for="ship-fuel-max" class="block text-xs uppercase text-muted mb-1">
          Max drive fuel
        </label>
        <input
          id="ship-fuel-max"
          v-model.number="draft.maxDriveFuel"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
        />
      </div>
    </div>

    <!-- Upgrades (view mode shows only the ones the ship has) -->
    <div class="border-t border-section pt-4">
      <div class="flex flex-wrap justify-between items-baseline gap-2 mb-3">
        <h4 class="font-semibold text-default">Upgrades</h4>
        <span v-if="editing" class="text-xs text-muted">
          {{ draft.upgrades.length }} taken · choose {{ OFFWORLDERS_SHIP_STARTING_UPGRADES }} when
          making the ship. * can be taken twice.
        </span>
      </div>

      <p v-if="!editing && !visibleUpgrades.length" class="text-sm text-muted italic">
        No upgrades yet.
      </p>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="upgrade in visibleUpgrades"
          :key="upgrade.name"
          class="flex items-start justify-between gap-3"
        >
          <div class="min-w-0">
            <p class="font-medium text-default">
              {{ upgrade.name }}<span v-if="upgrade.repeatable" class="text-subtle"> *</span>
            </p>
            <p class="text-sm text-secondary">{{ upgrade.description }}</p>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <template v-if="editing">
              <BaseButton
                variant="ghost"
                class="px-2"
                :disabled="count(upgrade) === 0"
                :aria-label="`Remove ${upgrade.name}`"
                @click="removeUpgrade(upgrade.name)"
              >
                −
              </BaseButton>
              <span class="w-6 text-center text-default">{{ count(upgrade) }}</span>
              <BaseButton
                variant="ghost"
                class="px-2"
                :disabled="count(upgrade) >= maxCount(upgrade)"
                :aria-label="`Add ${upgrade.name}`"
                @click="addUpgrade(upgrade.name)"
              >
                +
              </BaseButton>
            </template>
            <span v-else class="chip">{{ count(upgrade) > 0 ? `×${count(upgrade)}` : '—' }}</span>
          </div>
        </li>
      </ul>
    </div>

    <!-- Notes: free text for passengers, cargo, condition, anything else -->
    <div class="border-t border-section pt-4">
      <div class="flex flex-wrap justify-between items-baseline gap-2 mb-3">
        <h4 class="font-semibold text-default">Notes</h4>
        <span class="text-xs text-muted">
          Extra passengers, cargo, ship condition — anything else worth tracking
        </span>
      </div>
      <textarea
        id="ship-notes"
        v-model="draft.notes"
        rows="4"
        class="input-field p-2 rounded w-full resize-none"
        :disabled="!editing"
        aria-label="Ship notes"
        placeholder="Extra passengers, cargo, ship condition, damage — or whatever else you want to note about the ship..."
      ></textarea>
    </div>

    <!-- Images: drawings, maps, handouts -->
    <div class="border-t border-section pt-4">
      <div class="flex flex-wrap justify-between items-baseline gap-2 mb-3">
        <h4 class="font-semibold text-default">Images</h4>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted">Drawings, maps, handouts — click to view</span>
          <template v-if="editing">
            <BaseButton variant="add" @click="triggerGalleryInput">Add image</BaseButton>
          </template>
        </div>
      </div>

      <div v-if="galleryImages.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <button
          v-for="url in galleryImages"
          :key="url"
          type="button"
          class="relative block overflow-hidden rounded border border-section"
          @click="lightboxUrl = url"
        >
          <CampaignImage :src="url" alt="Ship image" class="w-full h-28 object-cover" />
          <span
            v-if="isProfileImage(url)"
            class="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white"
          >
            Profile
          </span>
        </button>
      </div>
      <p v-else class="text-sm text-muted italic">No images yet.</p>

      <input
        ref="galleryInput"
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp"
        class="hidden"
        @change="onGalleryFileChange"
      />
    </div>

    <!-- Sticky edit actions: a compact floating tag keeps Cancel / Save
         reachable while scrolling a long sheet, on mobile and desktop. -->
    <BaseStickyActions
      :dirty="isDirty"
      :saving="saving"
      save-label="Save ship"
      @cancel="cancelEditing"
      @save="submit"
    />

    <!-- Image lightbox -->
    <BaseModal v-if="lightboxUrl" @close="lightboxUrl = null">
      <div class="bg-[var(--color-surface)] rounded-lg p-4 max-w-4xl w-full">
        <div class="relative flex items-center justify-center">
          <CampaignImage
            :src="lightboxUrl"
            alt="Ship image"
            class="max-h-[80vh] w-auto mx-auto rounded"
          />
          <!-- Discreet previous/next arrows (only when there is more than one image) -->
          <template v-if="galleryImages.length > 1">
            <button
              type="button"
              class="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white/60 transition-colors hover:bg-black/50 hover:text-white"
              aria-label="Previous image"
              @click="showPreviousImage"
            >
              <CampaignNavIcon name="chevron-left" class="w-6 h-6" />
            </button>
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white/60 transition-colors hover:bg-black/50 hover:text-white"
              aria-label="Next image"
              @click="showNextImage"
            >
              <CampaignNavIcon name="chevron-right" class="w-6 h-6" />
            </button>
          </template>
        </div>
        <div class="flex justify-end gap-2 mt-3">
          <BaseButton
            v-if="editing && !isProfileImage(lightboxUrl)"
            variant="remove"
            confirm-message="Remove this image?"
            @click="removeGalleryImage(lightboxUrl)"
          >
            Remove
          </BaseButton>
          <BaseButton
            v-if="editing && isProfileImage(lightboxUrl)"
            variant="default"
            @click="changeProfileFromLightbox"
          >
            Change image
          </BaseButton>
          <BaseButton variant="ghost" @click="lightboxUrl = null">Close</BaseButton>
        </div>
      </div>
    </BaseModal>

    <ImageRepositionModal
      v-if="repositionFile"
      :file="repositionFile"
      @confirm="applyRepositionedImage"
      @cancel="cancelReposition"
    />
  </div>
</template>
