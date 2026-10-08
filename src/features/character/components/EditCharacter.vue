<script setup>
import { computed, onMounted, ref } from 'vue'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/authStore.js'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import Dnd5eCharacterForm from '@/systems/dnd5e/components/Dnd5eCharacterForm.vue'
import { normalizeDnd5eData, DND5E_SYSTEM_TYPE } from '@/systems/dnd5e/constants.js'
import OffworldersCharacterForm from '@/systems/offworlders/components/OffworldersCharacterForm.vue'
import {
  normalizeOffworldersData,
  OFFWORLDERS_SYSTEM_TYPE,
} from '@/systems/offworlders/constants.js'

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

const character = ref({
  name: '',
  systemType: DND5E_SYSTEM_TYPE,
  notes: '',
  avatarUrl: null,
  dnd5e: normalizeDnd5eData(null),
  offworlders: normalizeOffworldersData(null),
})

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
        systemType: fetchedCharacter.systemType || DND5E_SYSTEM_TYPE,
        notes: fetchedCharacter.notes || '',
        avatarUrl: fetchedCharacter.avatarUrl,
        dnd5e: normalizeDnd5eData(fetchedCharacter.dnd5e),
        offworlders: normalizeOffworldersData(fetchedCharacter.offworlders),
      }
    } else {
      notificationStore.addNotification('Character not found', 'error', 4000)
    }
  } catch (error) {
    console.error('Failed to load character data inside view:', error)
  } finally {
    loading.value = false
  }
})

function triggerFileInput() {
  fileInput.value.click()
}

function handleImageChange(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    previewImage.value = URL.createObjectURL(file)
  }
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
  if (character.value.systemType === DND5E_SYSTEM_TYPE) {
    if (!character.value.dnd5e.race) {
      notificationStore.addNotification('You must select a race', 'error', 4000)
      return
    }
    if (!character.value.dnd5e.characterClass) {
      notificationStore.addNotification('You must select a class', 'error', 4000)
      return
    }
  }

  if (
    character.value.systemType === OFFWORLDERS_SYSTEM_TYPE &&
    !character.value.offworlders.characterClass
  ) {
    notificationStore.addNotification('You must select a class', 'error', 4000)
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
    const payload = {
      name: character.value.name,
      systemType: character.value.systemType,
      notes: character.value.notes,
    }
    if (character.value.systemType === DND5E_SYSTEM_TYPE) {
      payload.dnd5e = character.value.dnd5e
    } else if (character.value.systemType === OFFWORLDERS_SYSTEM_TYPE) {
      payload.offworlders = character.value.offworlders
    }

    const updatedCharacter = await characterStore.updateCharacter(
      characterId.value,
      payload,
    )

    if (updatedCharacter) {
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
  <div class="container mx-auto p-4 max-w-2xl">
    <div v-if="loading" class="text-center py-8">
      <div class="spinner h-8 w-8 border-t-2 border-b-2"></div>
      <p class="mt-2 text-secondary">Loading character...</p>
    </div>

    <div v-else class="bg-[var(--color-surface)] rounded-lg shadow-lg overflow-hidden">
      <div class="p-6 border-b border-section">
        <h1 class="text-2xl font-bold" style="color: var(--color-primary-700)">Edit Character</h1>
      </div>

      <form @submit.prevent="submitCharacter" class="p-6">
        <!-- Character Image Section -->
        <div class="mb-6">
          <h5 class="text-lg font-semibold mb-3" style="color: var(--color-primary-600)">
            Character Image
          </h5>

          <div v-if="isGuestMode" class="demo-notice mb-3">
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
              <option :value="DND5E_SYSTEM_TYPE">Dungeons &amp; Dragons 5e</option>
              <option :value="OFFWORLDERS_SYSTEM_TYPE">Offworlders</option>
            </select>
          </div>
          <div class="mb-4">
            <label for="notes" class="block text-sm font-medium text-default mb-1">Notes</label>
            <textarea
              id="notes"
              v-model="character.notes"
              rows="2"
              class="input-field w-full px-3 py-2 border border-input rounded-md"
            ></textarea>
          </div>
        </div>

        <!-- System-specific fields -->
        <div v-if="character.systemType === DND5E_SYSTEM_TYPE" class="mb-6">
          <h4 class="text-lg font-semibold mb-3" style="color: var(--color-primary-600)">
            Dungeons &amp; Dragons 5e
          </h4>
          <Dnd5eCharacterForm v-model="character.dnd5e" />
        </div>

        <div v-else-if="character.systemType === OFFWORLDERS_SYSTEM_TYPE" class="mb-6">
          <h4 class="text-lg font-semibold mb-3" style="color: var(--color-primary-600)">
            Offworlders
          </h4>
          <OffworldersCharacterForm v-model="character.offworlders" />
        </div>

        <!-- Form Action Buttons -->
        <div class="flex justify-end space-x-3 mt-8">
          <BaseButton
            variant="ghost"
            type="button"
            :disabled="isSubmitting"
            @click="router.push(goToCharacterView())"
          >
            Cancel
          </BaseButton>
          <BaseButton variant="add" type="submit" :disabled="isSubmitting" :loading="isSubmitting">
            Save Changes
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
