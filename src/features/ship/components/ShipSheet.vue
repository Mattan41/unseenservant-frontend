<script setup>
/**
 * Presentational Offworlders ship sheet (form/display only).
 *
 * Mirrors the printed ship sheet (p.26) but stays simple: name, vitals,
 * the upgrade checklist, a free-text notes/look area, the ship's own images and
 * the crew — the campaign's characters, presented read-only, whose art opens in
 * the same lightbox but is not part of the ship's gallery.
 *
 * Props in, events out — no store access: an image over the upload limit emits
 * `size-error` with the sentence to show, and the parent notifies.
 */
import { computed, reactive, ref, watch } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseMarkdownField from '@/components/base/BaseMarkdownField.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseNoteSections from '@/components/base/BaseNoteSections.vue'
import MarkdownText from '@/components/base/MarkdownText.vue'
import CampaignImage from '@/features/campaign/components/CampaignImage.vue'
import BaseStickyActions from '@/components/base/BaseStickyActions.vue'
import BaseNumberStepper from '@/components/base/BaseNumberStepper.vue'
import ShipCharactersSection from '@/features/ship/components/ShipCharactersSection.vue'
import CampaignNavIcon from '@/features/campaign/components/CampaignNavIcon.vue'
import ImageRepositionModal from '@/components/base/ImageRepositionModal.vue'
import { buildShipPayload } from '@/features/ship/shipPayload.js'
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
import { useImageLightbox } from '@/utils/useImageLightbox.js'
import { validateImageSize } from '@/utils/imageUpload.js'
import { useUnsavedChanges } from '@/utils/useUnsavedChanges.js'
import { createSection } from '@/utils/sections.js'

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
  /**
   * What produced the current `ship` (`shipStore.lastUpdateSource`):
   * `'' | 'fetch' | 'save' | 'adjust' | 'image' | 'section'`. A background
   * refresh (`'fetch'`) must not discard the user's unsaved edits; this sheet's
   * own writes (`'save'` / `'image'` / `'section'`) may still move the draft on.
   */
  updateSource: {
    type: String,
    default: '',
  },
  /**
   * The campaign's characters — the crew manifest. Each card is one character,
   * so nothing about a crew member lives here: the sheet only presents them.
   */
  characters: {
    type: Array,
    default: () => [],
  },
  /** The campaign's participants, for each character's player (nickname). */
  participants: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'save',
  'reload',
  'upload-profile',
  'add-gallery',
  'remove-gallery',
  'adjust-vital',
  'save-sections',
  'size-error',
])

const editing = ref(false)
const draft = reactive(createEmptyShipData())

// Signature of the editable fields, used to detect unsaved edits so we can warn
// before navigating away (image fields are excluded — they save on their own).
const baseline = ref('')

// The ship `version` the draft's fields are based on — what a save must send, so
// that an external change landing mid-edit still surfaces as a conflict instead
// of the draft silently overwriting it.
const draftVersion = ref(null)

function draftSignature() {
  return JSON.stringify({
    name: draft.name,
    hull: draft.hull,
    hullMax: draft.hullMax,
    armor: draft.armor,
    damage: draft.damage,
    driveFuel: draft.driveFuel,
    maxDriveFuel: draft.maxDriveFuel,
    credits: draft.credits,
    upgrades: draft.upgrades,
    notes: draft.notes,
  })
}

function resetDraft() {
  Object.assign(draft, createEmptyShipData(), props.ship)
  draft.upgrades = [...(props.ship.upgrades || [])]
  draftVersion.value = props.ship.version ?? null
  baseline.value = draftSignature()
}

// How a replacement of `ship` is handled depends on what caused it (see the
// `updateSource` prop, fed from `shipStore.lastUpdateSource`): while the user is
// editing, neither a 'fetch' (a background refresh — the activity poll) nor a
// write that is not the draft's own save ('image', 'section') may touch the
// draft, because those are changes the user did not ask for and their edits have
// to survive them. Those writes did move the server's copy on, so the version the
// draft saves against follows them; a background refresh deliberately does not,
// so saving after one still conflicts rather than overwriting the other person's
// change. Anything else — this sheet's own save, a quick-edit, the first load —
// reloads the draft and leaves edit mode.
const KEEPS_DRAFT = ['fetch', 'image', 'section']
const MOVES_VERSION = ['image', 'section']

watch(
  () => props.ship,
  () => {
    if (editing.value && KEEPS_DRAFT.includes(props.updateSource)) {
      if (MOVES_VERSION.includes(props.updateSource)) draftVersion.value = props.ship.version ?? null
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

// The conflict banner's Reload is an explicit "give me the server's copy": the
// local edits go, so leave edit mode first and let the incoming ship be adopted
// by the watcher above, rather than kept the way a background refresh is.
function reloadFromConflict() {
  cancelEditing()
  emit('reload')
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
  // Save against the version the draft's fields were based on (not whatever
  // `ship` holds now), so a background refresh that landed mid-edit becomes a
  // conflict rather than a silent overwrite of the other person's change.
  // Images are managed by their own endpoints, so they are not part of this
  // payload (see `buildShipPayload`, shared with the store's quick-edit action).
  emit('save', buildShipPayload({ ...draft, version: draftVersion.value }))
}

// Quick-edit: Hull / Drive fuel / Credits are nudged in place and saved
// immediately by the parent (no edit mode needed). Hidden while editing so the
// draft inputs own those fields.
function adjustVital(field, value) {
  emit('adjust-vital', { field, value })
}

// Sections save on their own, like the steppers above: they are not part of the
// draft, so a section edit and an in-progress sheet edit never overwrite each
// other. The parent persists the whole list, in the order it is sent.
function addSection({ title, body }) {
  emit('save-sections', [...(props.ship.sections || []), createSection({ title, body })])
}

function updateSection({ id, title, body }) {
  emit(
    'save-sections',
    (props.ship.sections || []).map((section) =>
      section.id === id ? { ...section, title, body } : section,
    ),
  )
}

function removeSection(id) {
  emit(
    'save-sections',
    (props.ship.sections || []).filter((section) => section.id !== id),
  )
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

// The lightbox shows one set at a time — the set the picture was opened from:
// the ship's own images, or one crew member's character images. The two are kept
// apart on purpose. The ship's gallery is the ship's art ("drawings, maps,
// handouts"), and every image in it is the ship's to remove; a character's art
// belongs to its owner and is removed in Edit character, so it opens with its own
// caption and steps through its own pictures instead of the ship's.
// Opening/stepping the lightbox is shared with the character's own gallery
// lightbox (`useImageLightbox`); the state and the ←/→ handling live there, and
// each caller gets its own instance, so the two never step through each other's
// sets.
const {
  lightboxUrl,
  lightboxImages,
  lightboxLabel,
  open: openLightbox,
  close: closeLightbox,
  showPrevious: showPreviousImage,
  showNext: showNextImage,
} = useImageLightbox()

/** The ship's own images, profile image first — what the gallery grid renders. */
const galleryImages = computed(() => {
  const shipUrls = [...(props.ship.imageUrls || [])]
  return props.ship.imageUrl ? [props.ship.imageUrl, ...shipUrls] : shipUrls
})

/** True while the open picture is one of the ship's own images. */
const lightboxIsShipImage = computed(() => galleryImages.value.includes(lightboxUrl.value))

/** Open a picture from the ship's own gallery. */
function openShipImage(url) {
  openLightbox(url, galleryImages.value, props.ship.name || 'Ship')
}

/** Open a crew card's pictures — that character's images, under its name. */
function openCrewImage({ url, images = [], label = '' } = {}) {
  openLightbox(url, images, label)
}

/** True when `url` is the ship's profile image (not a gallery image). */
function isProfileImage(url) {
  return Boolean(props.ship.imageUrl) && url === props.ship.imageUrl
}

/** Close the lightbox and open the profile-image picker. */
function changeProfileFromLightbox() {
  closeLightbox()
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
  if (!file) return

  const sizeError = validateImageSize(file)
  if (sizeError) {
    emit('size-error', sizeError)
    return
  }

  repositionFile.value = file
}

function applyRepositionedImage(file) {
  const sizeError = validateImageSize(file)
  if (sizeError) {
    emit('size-error', sizeError)
    cancelReposition()
    return
  }

  repositionFile.value = null
  emit('upload-profile', file)
}

function cancelReposition() {
  repositionFile.value = null
}

function onGalleryFileChange(event) {
  const file = event.target.files[0]
  event.target.value = ''
  if (!file) return

  const sizeError = validateImageSize(file)
  if (sizeError) {
    emit('size-error', sizeError)
    return
  }

  emit('add-gallery', file)
}

function removeGalleryImage(url) {
  emit('remove-gallery', url)
  if (lightboxUrl.value === url) closeLightbox()
}

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
      <BaseButton variant="retry" @click="reloadFromConflict">Reload</BaseButton>
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

    <!-- Profile image: in view mode it mirrors the campaign image banner and
         carries the same replace affordance as while editing — an explicit
         button, because a hover overlay is unreachable on touch. While editing
         it shrinks to the square editor (hover to change / reposition). -->
    <div :class="editing ? 'flex items-start gap-4' : 'flex flex-col gap-2'">
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
          id="ship-profile-image-input"
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp"
          class="hidden"
          aria-label="Upload ship profile image"
          @change="onProfileFileChange"
        />
      </div>

      <div v-if="editing" class="flex-1 min-w-0 space-y-2">
        <p class="text-sm text-muted">Upload or reposition the ship's profile picture.</p>
        <!-- A real button, so touch devices (no hover) can change the image. -->
        <BaseButton variant="ghost" @click="triggerProfileInput">Change image</BaseButton>
      </div>
      <!-- View mode: the same picker + reposition flow, reached without entering
           Edit. An explicit button, because a hover overlay is unreachable on
           touch. -->
      <div v-else class="min-w-0 space-y-1">
        <p class="text-sm text-muted">Upload or reposition the ship's profile picture.</p>
        <BaseButton variant="ghost" @click="triggerProfileInput">Change image</BaseButton>
      </div>
    </div>

    <!-- Vitals: Hull / Max, Armor, Damage, Fuel / Max, Credits.
         Hull, Drive fuel and Credits can be nudged in place (view mode); while
         editing they are plain inputs that save with the form. -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <!-- The caption is a label only while the input exists: in view mode the
             quick-edit stepper owns the value, so a `for` would point nowhere. -->
        <label v-if="editing" for="ship-hull" class="block text-xs uppercase text-muted mb-1">
          Hull
        </label>
        <span v-else class="block text-xs uppercase text-muted mb-1">Hull</span>
        <input
          v-if="editing"
          id="ship-hull"
          v-model.number="draft.hull"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
        />
        <BaseNumberStepper
          v-else
          :model-value="ship.hull"
          :max="ship.hullMax"
          :disabled="saving"
          aria-label="Hull"
          @update:model-value="(value) => adjustVital('hull', value)"
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
        <label v-if="editing" for="ship-fuel" class="block text-xs uppercase text-muted mb-1">
          Drive fuel
        </label>
        <span v-else class="block text-xs uppercase text-muted mb-1">Drive fuel</span>
        <input
          v-if="editing"
          id="ship-fuel"
          v-model.number="draft.driveFuel"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
        />
        <BaseNumberStepper
          v-else
          :model-value="ship.driveFuel"
          :max="ship.maxDriveFuel"
          :disabled="saving"
          aria-label="Drive fuel"
          @update:model-value="(value) => adjustVital('driveFuel', value)"
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
      <div>
        <label v-if="editing" for="ship-credits" class="block text-xs uppercase text-muted mb-1">
          Credits
        </label>
        <span v-else class="block text-xs uppercase text-muted mb-1">Credits</span>
        <input
          v-if="editing"
          id="ship-credits"
          v-model.number="draft.credits"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
        />
        <BaseNumberStepper
          v-else
          :model-value="ship.credits ?? 0"
          :disabled="saving"
          aria-label="Credits"
          @update:model-value="(value) => adjustVital('credits', value)"
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

    <!-- Notes: free text for passengers, cargo, condition, anything else.
         Markdown, like every other long-text field: written with a preview,
         rendered when reading. -->
    <div class="border-t border-section pt-4">
      <BaseMarkdownField
        v-if="editing"
        id="ship-notes"
        v-model="draft.notes"
        label="Notes"
        hint="Extra passengers, cargo, ship condition — anything else worth tracking"
        :rows="4"
        placeholder="Extra passengers, cargo, ship condition, damage — or whatever else you want to note about the ship..."
      />

      <template v-else>
        <h4 class="mb-2 font-semibold text-default">Notes</h4>
        <MarkdownText v-if="draft.notes" :text="draft.notes" />
        <p v-else class="text-sm text-muted italic">No notes recorded for this ship yet.</p>
      </template>
    </div>

    <!-- Sections: small, individually titled notes that sit beside the free-text
         notes above — Cargo, Passengers, Leads, Log as separate entries instead
         of one blob. Plain text, not markdown. They save on their own (any
         participant may write), so they are not part of the sheet's draft. -->
    <div class="border-t border-section pt-4">
      <BaseNoteSections
        :sections="ship.sections"
        :editable="true"
        :saving="saving"
        @add="addSection"
        @update="updateSection"
        @remove="removeSection"
      />
    </div>

    <!-- Images: drawings, maps, handouts -->
    <div class="border-t border-section pt-4">
      <div class="flex flex-wrap justify-between items-baseline gap-2 mb-3">
        <h4 class="font-semibold text-default">Images</h4>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted"
            >The ship's drawings, maps and handouts — click to view</span
          >
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
          @click="openShipImage(url)"
        >
          <CampaignImage
            :src="url"
            alt="Ship gallery artwork"
            :default-src="OFFWORLDERS_SHIP_DEFAULT_IMAGE"
            class="w-full h-28 object-cover"
          />
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
        id="ship-gallery-image-input"
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp"
        class="hidden"
        aria-label="Add image to the ship gallery"
        @change="onGalleryFileChange"
      />
    </div>

    <!-- Crew manifest: one card per character. Read-only — a crew member is a
         character, so its notes and images are edited in Edit character, and a
         card's images open in the lightbox above under the character's own
         name. -->
    <ShipCharactersSection
      :characters="characters"
      :participants="participants"
      @open-image="openCrewImage"
    />

    <!-- Sticky edit actions: a compact floating tag keeps Cancel / Save
         reachable while scrolling a long sheet, on mobile and desktop. -->
    <BaseStickyActions
      v-if="editing"
      :dirty="isDirty"
      :saving="saving"
      save-label="Save ship"
      @cancel="cancelEditing"
      @save="submit"
    />

    <!-- Image lightbox: the ship's own images, or one crew card's, never both -->
    <BaseModal v-if="lightboxUrl" @close="closeLightbox">
      <div class="bg-[var(--color-surface)] rounded-lg p-4 max-w-4xl w-full">
        <div class="relative flex items-center justify-center">
          <CampaignImage
            :src="lightboxUrl"
            alt="Ship gallery artwork"
            :default-src="OFFWORLDERS_SHIP_DEFAULT_IMAGE"
            class="max-h-[80vh] w-auto mx-auto rounded"
          />
          <!-- Discreet previous/next arrows (only when there is more than one image) -->
          <template v-if="lightboxImages.length > 1">
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
        <p class="mt-3 text-center text-sm text-muted">{{ lightboxLabel }}</p>
        <div class="flex justify-end gap-2 mt-2">
          <!-- Only the ship's own gallery is removable here: a character's art
               belongs to its owner and is managed in Edit character. -->
          <BaseButton
            v-if="editing && lightboxIsShipImage && !isProfileImage(lightboxUrl)"
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
          <BaseButton variant="ghost" @click="closeLightbox">Close</BaseButton>
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
