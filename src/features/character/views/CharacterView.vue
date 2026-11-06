<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import SystemSheetRouter from '@/features/character/dispatchers/SystemSheetRouter.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseLinkButton from '@/components/base/BaseLinkButton.vue'
import BaseClampedText from '@/components/base/BaseClampedText.vue'
import BaseIcon from '@/components/base/BaseIcon.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseNoteSections from '@/components/base/BaseNoteSections.vue'
import ImageRepositionModal from '@/components/base/ImageRepositionModal.vue'
import ExportMenu from '@/components/base/ExportMenu.vue'
import { buildCharacterExport, buildCharacterBackup } from '@/features/character/characterExport.js'
import { characterSystemLabel } from '@/features/character/dispatchers/systemRegistry.js'
import { fetchExportExtras } from '@/features/character/dispatchers/systemExport.js'
import { downloadTextFile, dateStamp, slugifyFileName } from '@/utils/download.js'
import { formatUtcDate } from '@/utils/timestampUtils.js'
import { useViewRecency } from '@/utils/useViewRecency.js'
import { useImagePicker } from '@/utils/useImagePicker.js'
import { useImageLightbox } from '@/utils/useImageLightbox.js'
import { validateImageSize } from '@/utils/imageUpload.js'
import { createSection, normalizeSections } from '@/utils/sections.js'

const characterStore = useCharacterStore()
const campaignStore = useCampaignStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const route = useRoute()
const router = useRouter()

// Guest mode mocks image uploads (a placeholder is stored), so the view hides
// the upload affordances exactly as EditCharacter does.
const isGuestMode = computed(() => authStore.isGuest)

const loading = ref(true)
const characterId = computed(() => route.params.id)
const from = route.query.from || 'characterList'
const campaignId = route.query.campaignId || null

const { userId } = storeToRefs(userStore)
const { currentCharacter } = storeToRefs(characterStore)

// Opening a character is what the character list orders by (`viewHistory.js`).
useViewRecency('character', () => route.params.id, userId)

// The character's own campaign, independent of the `from=campaign` context.
// Resolved from the campaign store; the campaign is fetched on mount when it is
// not already cached.
const characterCampaignId = computed(() => currentCharacter.value?.campaignId || null)
const characterCampaign = computed(() =>
  characterCampaignId.value ? campaignStore.getCampaignById(characterCampaignId.value) : null,
)
const characterCampaignName = computed(() => characterCampaign.value?.name || '')

async function loadCharacterCampaign() {
  const id = characterCampaignId.value
  if (!id || characterCampaign.value) return
  try {
    await campaignStore.fetchCampaign(id)
  } catch {
    // Not a participant (or the fetch failed): fall back to a neutral label.
  }
}

onMounted(async () => {
  try {
    await characterStore.fetchCharacter(characterId.value)
    await loadCharacterCampaign()
  } finally {
    loading.value = false
  }
})

const isOwner = computed(
  () =>
    !!currentCharacter.value &&
    !!userId.value &&
    String(currentCharacter.value.ownerId) === String(userId.value),
)

// Avatar: pick → reposition → upload, all in the view (no Save step to wait
// for). The picker and its size checks are the shared `useImagePicker`; the
// crop editor is the shared `ImageRepositionModal`. The cropped file is
// uploaded through the same store action EditCharacter uses.
const avatarInput = ref(null)
const {
  selectedFile: selectedAvatarFile,
  repositionFile,
  showRepositionModal,
  handleImageChange: handleAvatarChange,
  applyRepositionedImage,
  cancelReposition,
} = useImagePicker()

function triggerAvatarInput() {
  avatarInput.value?.click()
}

async function onAvatarConfirmed(file) {
  applyRepositionedImage(file)
  // A crop the re-encode pushed over the limit is dropped (and reported) by the
  // picker: nothing was selected, so there is nothing to upload.
  if (selectedAvatarFile.value !== file) return
  try {
    await characterStore.uploadCharacterImage(characterId.value, file)
  } catch {
    // The store surfaced the error.
  }
}

// Gallery: an image is stored exactly as it was picked (no reposition step), as
// in EditCharacter. Removal stays in EditCharacter — this view only adds.
const galleryInput = ref(null)
const galleryBusy = ref(false)

function triggerGalleryInput() {
  galleryInput.value?.click()
}

async function onGalleryFileChange(event) {
  const file = event.target.files[0]
  // Reset so selecting the same file again still fires a change event.
  event.target.value = ''
  if (!file) return

  const sizeError = validateImageSize(file)
  if (sizeError) {
    notificationStore.addNotification(sizeError, 'error')
    return
  }

  galleryBusy.value = true
  try {
    await characterStore.addCharacterImage(characterId.value, file)
  } catch {
    // The store surfaced the error.
  } finally {
    galleryBusy.value = false
  }
}

// The gallery lightbox is this view's own instance of `useImageLightbox`, so it
// steps through the character's images only — never the ship's gallery.
const {
  lightboxUrl,
  lightboxImages,
  lightboxLabel,
  open: openLightbox,
  close: closeLightbox,
  showPrevious,
  showNext,
} = useImageLightbox()

function openGalleryImage(url) {
  openLightbox(
    url,
    currentCharacter.value?.imageUrls || [],
    currentCharacter.value?.name || 'Character',
  )
}

const deleteCharacter = async () => {
  const success = await characterStore.deleteCharacter(characterId.value)
  if (success) {
    notificationStore.addNotification('Character deleted successfully!', 'success')
    await router.push({ name: 'CharactersView' })
  }
}

// Quick-edit of an Offworlders vital straight from the sheet (character owner
// only). Guest mode replaces the whole nested block on PATCH, so send it back
// complete; the steppers are disabled while the request is in flight.
const pendingVital = ref(false)

async function adjustOffworldersVital({ field, value }) {
  const character = currentCharacter.value
  if (!isOwner.value || !character?.offworlders) return
  pendingVital.value = true
  try {
    await characterStore.updateCharacterField(character.id, 'offworlders', {
      ...character.offworlders,
      [field]: value,
    })
  } catch {
    // Error is surfaced by the store.
  } finally {
    pendingVital.value = false
  }
}

// Sections: small, individually titled plain-text notes that sit beside the
// character's notes. They belong to the character (they follow it across
// campaigns, exports and imports), so they save through the ordinary character
// PATCH — no new endpoint. Only the owner may write; everyone who can see the
// character reads them.
const characterSections = computed(() => normalizeSections(currentCharacter.value?.sections))
const sectionsBusy = ref(false)

async function saveSections(sections) {
  const character = currentCharacter.value
  if (!isOwner.value || !character) return
  sectionsBusy.value = true
  try {
    // The character's own id (a number), as the other quick-edits use — the
    // store matches it against the list entry and `currentCharacter`.
    await characterStore.updateCharacterSections(character.id, sections)
  } catch {
    // The store surfaced the error.
  } finally {
    sectionsBusy.value = false
  }
}

function addSection({ title, body }) {
  return saveSections([...characterSections.value, createSection({ title, body })])
}

function updateSection({ id, title, body }) {
  return saveSections(
    characterSections.value.map((section) =>
      section.id === id ? { ...section, title, body } : section,
    ),
  )
}

function removeSection(id) {
  return saveSections(characterSections.value.filter((section) => section.id !== id))
}

// Formats offered by the export menu. JSON is a portable, lossless backup; md
// and txt are human-readable. Images are never included.
const CHARACTER_EXPORT_FORMATS = [
  { id: 'md', label: 'Markdown (.md)' },
  { id: 'txt', label: 'Plain text (.txt)' },
  { id: 'json', label: 'JSON backup (.json)' },
]

const exporting = ref(false)

/**
 * Build and download the character in the chosen format. Spells (5e) are
 * fetched best-effort beforehand; every other system has no extras.
 * @param {'md'|'txt'|'json'} format
 */
const exportCharacter = async (format) => {
  const character = currentCharacter.value
  if (!character || exporting.value) return

  exporting.value = true
  try {
    const { spells } = await fetchExportExtras(character.systemType, character.id)
    const base = `${slugifyFileName(character.name, 'character')}-${String(
      character.systemType || 'character',
    ).toLowerCase()}-${dateStamp()}`

    if (format === 'json') {
      const backup = buildCharacterBackup(character)
      downloadTextFile({
        filename: `${base}.json`,
        content: `${JSON.stringify(backup, null, 2)}\n`,
        mime: 'application/json',
      })
    } else {
      const content = buildCharacterExport(character, { format, spells })
      downloadTextFile({
        filename: `${base}.${format}`,
        content,
        mime: format === 'md' ? 'text/markdown' : 'text/plain',
      })
    }

    notificationStore.addNotification(
      `Exported ${character.name || 'character'} as .${format}`,
      'success',
    )
  } catch {
    notificationStore.addNotification('Failed to export the character.', 'error')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-7xl p-4">
    <div v-if="loading" class="text-center py-8">
      <div class="spinner h-8 w-8 border-t-2 border-b-2"></div>
      <p class="mt-2 text-secondary">Loading character...</p>
    </div>

    <div v-else-if="!currentCharacter" class="text-center py-8">
      <p class="text-secondary">Character not found.</p>
      <BaseButton variant="default" class="mt-4" @click="router.push({ name: 'CharactersView' })">
        Back to Character List
      </BaseButton>
    </div>

    <div v-else>
      <div
        class="rounded-lg shadow-lg overflow-hidden flex flex-col lg:flex-row lg:items-stretch"
        style="background-color: var(--color-primary-50)"
      >
        <!--
          Identity rail: system-agnostic chrome shared by every game system.
          Stacks above the sheet on mobile; becomes a fixed-width rail on lg+.
          Kept intentionally generic so it can later be extracted into a shared
          CharacterViewShell.vue without touching system-specific code.
        -->
        <aside
          class="flex flex-col gap-4 p-6 border-b border-section lg:border-b-0 lg:border-r lg:w-72 xl:w-80 lg:flex-shrink-0"
        >
          <!-- Action bar: any viewer may export; only the owner may edit/delete. -->
          <div class="flex flex-wrap justify-end gap-2">
            <ExportMenu
              :formats="CHARACTER_EXPORT_FORMATS"
              :disabled="exporting"
              @export="exportCharacter"
            />
            <template v-if="isOwner">
              <BaseButton
                variant="update"
                icon="edit"
                @click="
                  router.push({
                    name: 'EditCharacter',
                    params: { id: currentCharacter.id },
                    query: from === 'campaign' && campaignId ? { from, campaignId } : {},
                  })
                "
              >
                Edit
              </BaseButton>
              <BaseButton
                variant="remove"
                :confirm-message="`Are you sure you want to delete ${currentCharacter.name || 'this participant'}? This action cannot be undone.`"
                @click="deleteCharacter"
                >Delete</BaseButton
              >
            </template>
          </div>

          <!-- Identity: portrait + name + system. The portrait is the avatar;
               only the owner may replace it, and only outside guest mode (the
               same guard EditCharacter uses). -->
          <div class="flex flex-col items-center text-center">
            <div class="relative w-full max-w-64">
              <CharacterImage
                :src="currentCharacter.avatarUrl"
                alt="Character portrait"
                :system-type="currentCharacter.systemType"
                class="w-full aspect-square rounded-lg border-2 shadow-md object-cover"
                style="border-color: var(--color-primary-300)"
              />
              <!-- Hover overlay for pointer devices; the always-visible button
                   below is the touch-friendly primary affordance. -->
              <button
                v-if="isOwner && !isGuestMode"
                type="button"
                class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-sm text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
                aria-label="Change character image"
                @click="triggerAvatarInput"
              >
                Change image
              </button>
            </div>
            <BaseButton
              v-if="isOwner && !isGuestMode"
              variant="ghost"
              class="mt-2"
              @click="triggerAvatarInput"
            >
              Change image
            </BaseButton>
            <input
              v-if="isOwner && !isGuestMode"
              ref="avatarInput"
              id="character-avatar-input"
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              class="hidden"
              aria-label="Upload character image"
              @change="handleAvatarChange"
            />
            <div v-if="isOwner && isGuestMode" class="guest-notice mt-2">
              ⚠️ Image upload is not supported in guest mode. A default image will be used.
            </div>
            <h3 class="mt-3 text-xl font-bold text-default">
              {{ currentCharacter.name }}
            </h3>
            <span class="badge badge-primary mt-1">
              {{ characterSystemLabel(currentCharacter.systemType) }}
            </span>

            <!-- Link to the character's own campaign (independent of the
                 `from=campaign` context). A full button, so the association is
                 obvious rather than a quiet text link. -->
            <div v-if="characterCampaignId" class="mt-3">
              <BaseLinkButton :to="{ name: 'CampaignView', params: { id: characterCampaignId } }">
                Campaign: {{ characterCampaignName || 'View campaign' }}
              </BaseLinkButton>
            </div>
          </div>

          <!-- Notes -->
          <div class="text-default">
            <h4 class="subsection-heading mb-1">Notes:</h4>
            <BaseClampedText
              v-if="currentCharacter.notes"
              :text="currentCharacter.notes"
              mode="modal"
              title="Notes"
            />
            <p v-else class="text-sm text-muted italic">No notes.</p>
          </div>

          <!-- Sections: small, individually titled notes that sit beside the
               notes above. They belong to the character, so they follow it
               across campaigns, exports and imports. Owner-only to edit; every
               viewer reads them. -->
          <div class="text-default">
            <BaseNoteSections
              :sections="characterSections"
              :editable="isOwner"
              :saving="sectionsBusy"
              @add="addSection"
              @update="updateSection"
              @remove="removeSection"
            />
          </div>

          <!-- Appearance (generic, any system) -->
          <div v-if="currentCharacter.appearance" class="text-default">
            <h4 class="subsection-heading mb-1">Appearance:</h4>
            <BaseClampedText :text="currentCharacter.appearance" mode="modal" title="Appearance" />
          </div>

          <!-- Backstory (generic, any system) — sits with Notes/Appearance -->
          <div class="text-default">
            <h4 class="subsection-heading mb-1">Backstory:</h4>
            <BaseClampedText
              v-if="currentCharacter.backstory"
              :text="currentCharacter.backstory"
              mode="modal"
              title="Backstory"
            />
            <p v-else class="text-sm text-muted italic">No backstory recorded.</p>

            <!-- Only rendered when the API returned it (owner or campaign GM). -->
            <div v-if="currentCharacter.privateBackstory" class="mt-4 pt-3 border-t border-section">
              <h4 class="subsection-heading mb-1">Private — only you and the GM can see this</h4>
              <BaseClampedText
                :text="currentCharacter.privateBackstory"
                mode="modal"
                title="Private backstory"
              />
            </div>
          </div>
        </aside>

        <!-- Main column: a clean slot for whatever the active system renders -->
        <div class="flex-1 min-w-0">
          <!-- System-specific character sheet -->
          <SystemSheetRouter
            :character="currentCharacter"
            :is-owner="isOwner"
            :saving="pendingVital"
            @adjust-vital="adjustOffworldersVital"
          />

          <!-- Gallery: the character's own images. The owner can add one — no
               reposition step, uploaded exactly as picked, as in EditCharacter.
               Removal stays in EditCharacter; this view only adds and shows. -->
          <div class="p-6 border-t border-section">
            <div class="flex flex-wrap justify-between items-baseline gap-2 mb-3">
              <h2 class="section-heading">Images</h2>
              <BaseButton
                v-if="isOwner && !isGuestMode"
                variant="add"
                :disabled="galleryBusy"
                @click="triggerGalleryInput"
              >
                Add image
              </BaseButton>
            </div>

            <p class="text-xs text-muted mb-3">
              Drawings, handouts and other art. In an Offworlders campaign these images — and the
              character's Notes — are shown under the ship, on this character's crew card.
            </p>

            <div v-if="isOwner && isGuestMode" class="guest-notice mb-3">
              ⚠️ Image upload is not supported in guest mode — a placeholder image is stored
              instead.
            </div>

            <div
              v-if="currentCharacter.imageUrls?.length"
              class="grid grid-cols-3 sm:grid-cols-4 gap-3"
            >
              <button
                v-for="url in currentCharacter.imageUrls"
                :key="url"
                type="button"
                class="block overflow-hidden rounded border border-section"
                :aria-label="`View ${currentCharacter.name || 'character'} artwork`"
                @click="openGalleryImage(url)"
              >
                <CharacterImage
                  :src="url"
                  :alt="`${currentCharacter.name || 'Character'} artwork`"
                  :system-type="currentCharacter.systemType"
                  class="w-full h-24 object-cover"
                />
              </button>
            </div>
            <p v-else class="text-sm text-muted italic">No images yet.</p>

            <input
              ref="galleryInput"
              id="character-gallery-input"
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              class="hidden"
              aria-label="Add an image to the character"
              @change="onGalleryFileChange"
            />
            <p v-if="!isGuestMode" class="text-xs text-muted mt-1">
              Supported formats: *.jpg, *.png, *.gif, *.webp. Max size: 5 MB.
            </p>
          </div>

          <!-- Additional info -->
          <div class="p-6 border-t border-section">
            <h2 class="section-heading mb-4">Additional Information</h2>
            <p>
              <strong>Created:</strong>
              {{ formatUtcDate(currentCharacter.createdAt) }}
            </p>
            <p>
              <strong>Last Updated:</strong>
              {{ formatUtcDate(currentCharacter.updatedAt) || '-' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Image lightbox: the character's own gallery, stepped through under the
         character's name. Its state is this view's own (`useImageLightbox`) — the
         ship's lightbox is a separate instance. -->
    <BaseModal v-if="lightboxUrl" aria-label="Character image viewer" @close="closeLightbox">
      <div class="bg-[var(--color-surface)] rounded-lg p-4 max-w-4xl w-full">
        <div class="relative flex items-center justify-center">
          <CharacterImage
            :src="lightboxUrl"
            :alt="`${currentCharacter.name || 'Character'} artwork`"
            :system-type="currentCharacter.systemType"
            class="max-h-[80vh] w-auto mx-auto rounded object-contain"
          />
          <template v-if="lightboxImages.length > 1">
            <button
              type="button"
              class="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white/60 transition-colors hover:bg-black/50 hover:text-white"
              aria-label="Previous image"
              @click="showPrevious"
            >
              <BaseIcon name="chevron-left" class="w-6 h-6" />
            </button>
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white/60 transition-colors hover:bg-black/50 hover:text-white"
              aria-label="Next image"
              @click="showNext"
            >
              <BaseIcon name="chevron-right" class="w-6 h-6" />
            </button>
          </template>
        </div>
        <p class="mt-3 text-center text-sm text-muted">{{ lightboxLabel }}</p>
        <div class="flex justify-end gap-2 mt-2">
          <BaseButton variant="ghost" @click="closeLightbox">Close</BaseButton>
        </div>
      </div>
    </BaseModal>

    <ImageRepositionModal
      v-if="showRepositionModal && repositionFile"
      :file="repositionFile"
      @confirm="onAvatarConfirmed"
      @cancel="cancelReposition"
    />
  </div>
</template>
