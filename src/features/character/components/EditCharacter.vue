<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/authStore.js'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseMarkdownField from '@/components/base/BaseMarkdownField.vue'
import BaseStickyActions from '@/components/base/BaseStickyActions.vue'
import ImageRepositionModal from '@/components/base/ImageRepositionModal.vue'
import SystemFormRouter from '@/features/character/dispatchers/SystemFormRouter.vue'
import { useUnsavedChanges } from '@/utils/useUnsavedChanges.js'
import {
  DEFAULT_SYSTEM_TYPE,
  SYSTEM_FORM_OPTIONS,
  SYSTEM_LABELS,
  createEmptyCharacterBlocks,
  normalizeCharacterBlocks,
  validate,
  buildPayload,
} from '@/features/character/dispatchers/systemRegistry.js'

const authStore = useAuthStore()
const isGuestMode = computed(() => authStore.isGuest)

const characterStore = useCharacterStore()
const notificationStore = useNotificationStore()
const route = useRoute()
const router = useRouter()

const characterId = computed(() => route.params.id)
const campaignId = computed(() => route.query.campaignId || null)
const from = computed(() => route.query.from || null)

const loading = ref(true)
const isSubmitting = ref(false)

const fileInput = ref(null)
const previewImage = ref(null)
const selectedFile = ref(null)
const repositionFile = ref(null)
const showRepositionModal = ref(false)

const character = ref({
  name: '',
  systemType: DEFAULT_SYSTEM_TYPE,
  notes: '',
  avatarUrl: null,
  ...createEmptyCharacterBlocks(),
})

const systemLabel = computed(() => SYSTEM_LABELS[character.value.systemType] ?? '')

// Warn before leaving the edit form with unsaved changes. The snapshot is taken
// once the character has loaded and refreshed after every successful save, so
// editing again re-arms the guard.
const characterSnapshot = ref('')

/** True while the form differs from the last saved character. */
const isDirty = computed(
  () => !!characterSnapshot.value && JSON.stringify(character.value) !== characterSnapshot.value,
)

useUnsavedChanges(() => isDirty.value, 'You have unsaved changes. Leave without saving?')

const characterImageUrl = computed(() => {
  if (previewImage.value) return previewImage.value
  return character.value.avatarUrl
})

onMounted(async () => {
  try {
    const fetchedCharacter = await characterStore.fetchCharacter(characterId.value)
    if (fetchedCharacter) {
      character.value = {
        name: fetchedCharacter.name,
        // A character with no game system keeps that state (the empty string,
        // like the campaign's `primarySystem`); only an omitted field falls back.
        systemType: fetchedCharacter.systemType || '',
        notes: fetchedCharacter.notes || '',
        appearance: fetchedCharacter.appearance || '',
        backstory: fetchedCharacter.backstory || '',
        privateBackstory: fetchedCharacter.privateBackstory || '',
        avatarUrl: fetchedCharacter.avatarUrl,
        ...normalizeCharacterBlocks(fetchedCharacter),
      }
      characterSnapshot.value = JSON.stringify(character.value)
    } else {
      notificationStore.addNotification('Character not found', 'error', 4000)
    }
  } catch (error) {
    console.error('Failed to load character data inside view:', error)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (previewImage.value) URL.revokeObjectURL(previewImage.value)
})

function triggerFileInput() {
  fileInput.value.click()
}

function handleImageChange(event) {
  const file = event.target.files[0]
  // Reset so selecting the same file again still fires a change event.
  event.target.value = ''
  if (file) {
    repositionFile.value = file
    showRepositionModal.value = true
  }
}

function applyRepositionedImage(file) {
  if (previewImage.value) URL.revokeObjectURL(previewImage.value)
  selectedFile.value = file
  previewImage.value = URL.createObjectURL(file)
  repositionFile.value = null
  showRepositionModal.value = false
}

function cancelReposition() {
  repositionFile.value = null
  showRepositionModal.value = false
}

function goToCharacterView() {
  const base = { name: 'CharacterView', params: { id: characterId.value } }
  if (from.value && campaignId.value) {
    return { ...base, query: { from: from.value, campaignId: campaignId.value } }
  }
  return base
}

const submitCharacter = async () => {
  if (!character.value.name) {
    notificationStore.addNotification('Character name is required', 'error', 4000)
    return
  }
  const systemError = validate(character.value.systemType, character.value)
  if (systemError) {
    notificationStore.addNotification(systemError, 'error', 4000)
    return
  }

  isSubmitting.value = true

  try {
    // 1. Handle image upload if a new file was chosen
    if (selectedFile.value) {
      const updatedCharacter = await characterStore.uploadCharacterImage(
        characterId.value,
        selectedFile.value,
      )
      character.value.avatarUrl = updatedCharacter.avatarUrl || updatedCharacter
    }

    // 2. Update basic info and system-specific data
    const payload = buildPayload(character.value.systemType, character.value)

    const updatedCharacter = await characterStore.updateCharacter(characterId.value, payload)

    if (updatedCharacter) {
      // Re-arm the unsaved-changes guard: the current form state is now the
      // saved baseline, and any further edit should warn again.
      characterSnapshot.value = JSON.stringify(character.value)
      notificationStore.addNotification('Character updated successfully!', 'success', 3000)
      await router.push(goToCharacterView())
    }
  } catch (error) {
    console.error('Character update submission chain broke:', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="container mx-auto p-4 max-w-7xl">
    <div v-if="loading" class="text-center py-8">
      <div class="spinner h-8 w-8 border-t-2 border-b-2"></div>
      <p class="mt-2 text-secondary">Loading character...</p>
    </div>

    <!-- No `overflow-hidden` on the card: it would break the sticky save bar
         rendered inside the form below. -->
    <div v-else class="bg-[var(--color-surface)] rounded-lg shadow-lg">
      <div class="p-6 border-b border-section">
        <h1 class="text-2xl font-bold" style="color: var(--color-primary-700)">Edit Character</h1>
      </div>

      <form @submit.prevent="submitCharacter" class="p-6">
        <!-- Character Image Section -->
        <div class="mb-6">
          <h5 class="text-lg font-semibold mb-3" style="color: var(--color-primary-600)">
            Character Image
          </h5>

          <div v-if="isGuestMode" class="guest-notice mb-3">
            ⚠️ Image upload is not supported in guest mode. A default image will be used.
          </div>

          <div class="flex items-center space-x-4">
            <CharacterImage
              :src="characterImageUrl"
              alt="Character Image"
              class="w-24 h-24 rounded-lg object-cover border-2"
              style="border-color: var(--color-primary-300)"
            />
            <input
              v-if="!isGuestMode"
              type="file"
              ref="fileInput"
              @change="handleImageChange"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              class="hidden"
            />
            <BaseButton v-if="!isGuestMode" variant="ghost" type="button" @click="triggerFileInput">
              Upload new image
            </BaseButton>
            <span v-else class="text-sm text-muted italic">
              Image upload not available in guest mode
            </span>
          </div>
          <div v-if="!isGuestMode" class="text-xs text-muted mt-1">
            Supported formats: *.jpg, *.png, *.gif, *.webp. Max size: 5 MB.
          </div>
        </div>

        <!-- Basic Information Section -->
        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-3" style="color: var(--color-primary-600)">
            Basic Information
          </h4>
          <div class="mb-4">
            <label for="name" class="block text-sm font-medium text-default mb-1"
              >Character Name</label
            >
            <input
              id="name"
              v-model="character.name"
              type="text"
              class="input-field w-full px-3 py-2 border border-input rounded-md"
              placeholder="Enter character name"
            />
          </div>
          <div class="mb-4">
            <label for="systemType" class="block text-sm font-medium text-default mb-1"
              >Game System</label
            >
            <select
              id="systemType"
              v-model="character.systemType"
              disabled
              class="input-field w-full px-3 py-2 border border-input rounded-md"
            >
              <option
                v-for="option in SYSTEM_FORM_OPTIONS"
                :key="String(option.id)"
                :value="option.id"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
          <BaseMarkdownField
            id="notes"
            v-model="character.notes"
            class="mb-4"
            label="Notes"
            :rows="2"
          />

          <BaseMarkdownField
            id="appearance"
            v-model="character.appearance"
            class="mb-4"
            label="Appearance"
            :rows="2"
            placeholder="Distinct visual details — clothing, features, possessions"
          />

          <BaseMarkdownField
            id="backstory"
            v-model="character.backstory"
            class="mb-4"
            label="Backstory — visible to everyone in the campaign"
            :rows="4"
            placeholder="Where does this character come from?"
          />

          <BaseMarkdownField
            id="privateBackstory"
            v-model="character.privateBackstory"
            class="mb-4"
            label="Private backstory"
            hint="Only you and the GM can see this."
            :rows="4"
            placeholder="Secrets only the GM should know"
          />
        </div>

        <!-- System-specific fields -->
        <div class="mb-6">
          <h4
            v-if="systemLabel"
            class="text-lg font-semibold mb-3"
            style="color: var(--color-primary-600)"
          >
            {{ systemLabel }}
          </h4>
          <SystemFormRouter v-model="character" :system-type="character.systemType" />
        </div>

        <!-- Sticky edit actions (shared base component): keeps Cancel / Save
             reachable while scrolling the long system form. -->
        <BaseStickyActions
          class="mt-8"
          :dirty="isDirty"
          :saving="isSubmitting"
          save-label="Save Changes"
          @cancel="router.push(goToCharacterView())"
          @save="submitCharacter"
        />
      </form>
    </div>

    <ImageRepositionModal
      v-if="showRepositionModal && repositionFile"
      :file="repositionFile"
      @confirm="applyRepositionedImage"
      @cancel="cancelReposition"
    />
  </div>
</template>
