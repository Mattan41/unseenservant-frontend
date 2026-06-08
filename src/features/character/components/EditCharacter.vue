<script setup>
import { computed, onMounted, ref } from 'vue'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/authStore.js'
import CharacterImage from '@/features/character/components/CharacterImage.vue'

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
  race: '',
  characterClass: '',
  level: 1,
  imageUrl: null,
  playerCharacterData: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
})

const characterImageUrl = computed(() => {
  if (previewImage.value) return previewImage.value
  return character.value.imageUrl
})

const races = [
  'Human',
  'Elf',
  'Dwarf',
  'Halfling',
  'Gnome',
  'Half-Elf',
  'Half-Orc',
  'Dragonborn',
  'Tiefling',
]
const characterClasses = [
  'Fighter',
  'Wizard',
  'Rogue',
  'Cleric',
  'Ranger',
  'Paladin',
  'Barbarian',
  'Bard',
  'Druid',
  'Monk',
  'Sorcerer',
  'Warlock',
]

onMounted(async () => {
  try {
    const fetchedCharacter = await characterStore.fetchCharacter(characterId.value)
    if (fetchedCharacter) {
      character.value = { ...fetchedCharacter }
      if (!character.value.playerCharacterData) {
        character.value.playerCharacterData = {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        }
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
  if (!character.value.race) {
    notificationStore.addNotification('You must select a race', 'error', 4000)
    return
  }
  if (!character.value.characterClass) {
    notificationStore.addNotification('You must select a class', 'error', 4000)
    return
  }

  isSubmitting.value = true

  try {
    // 1. Handle image upload if a new file was chosen (stops here if format is invalid)
    if (selectedFile.value) {
      const updatedCharacter = await characterStore.uploadCharacterImage(
        characterId.value,
        selectedFile.value,
      )
      character.value.imageUrl = updatedCharacter.imageUrl || updatedCharacter
    }

    // 2. Update basic info and stats
    const updatedCharacter = await characterStore.updateCharacter(
      characterId.value,
      character.value,
    )

    if (updatedCharacter) {
      // 3. One single success message when the whole pipeline is complete
      notificationStore.addNotification('Character updated successfully!', 'success', 3000)
      await router.push(goToCharacterView())
    }
  } catch (error) {
    // Errors are gracefully managed and displayed by the store layer actions
    console.error('Character update submission chain broke:', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="container mx-auto p-4 max-w-2xl">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"
      ></div>
      <p class="mt-2 text-gray-600">Loading character...</p>
    </div>

    <!-- Main Form Container -->
    <div v-else class="bg-white rounded-lg shadow-lg overflow-hidden">
      <div class="p-6 border-b border-gray-200">
        <h1 class="text-2xl font-bold text-primary-700">Edit Character</h1>
      </div>

      <form @submit.prevent="submitCharacter" class="p-6">
        <!-- Character Image Section -->
        <div class="mb-6">
          <h5 class="text-lg font-semibold mb-3 text-primary-600">Character Image</h5>

          <!-- Guest mode disclaimer -->
          <div
            v-if="isGuestMode"
            class="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-2 rounded mb-3"
          >
            ⚠️ Image upload is not supported in guest mode. A default image will be used.
          </div>

          <div class="flex items-center space-x-4">
            <div class="relative">
              <CharacterImage
                :src="characterImageUrl"
                alt="Character Image"
                class="w-24 h-24 rounded-lg object-cover border-2 border-primary-300"
              />
              <div
                v-if="!isGuestMode"
                @click="triggerFileInput"
                class="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <span class="text-white text-sm">Change</span>
              </div>
            </div>
            <input
              v-if="!isGuestMode"
              type="file"
              ref="fileInput"
              @change="handleImageChange"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              class="hidden"
            />
            <button
              v-if="!isGuestMode"
              type="button"
              @click="triggerFileInput"
              class="button button-secondary"
            >
              Upload new image
            </button>
            <span v-else class="text-sm text-gray-500 italic">
              Image upload not available in guest mode
            </span>
          </div>
          <div v-if="!isGuestMode" class="text-xs text-gray-500 mt-1">
            Supported formats: *.jpg, *.png, *.gif, *.webp. Max size: 5 MB.
          </div>
        </div>

        <!-- Basic Information Section -->
        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-3 text-primary-600">Basic Information</h4>
          <div class="mb-4">
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1"
              >Character Name</label
            >
            <input
              id="name"
              v-model="character.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter character name"
            />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="mb-4">
              <label for="race" class="block text-sm font-medium text-gray-700 mb-1">Race</label>
              <select
                id="race"
                v-model="character.race"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="" disabled>Select a race</option>
                <option v-for="race in races" :key="race" :value="race">{{ race }}</option>
              </select>
            </div>
            <div class="mb-4">
              <label for="class" class="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                id="class"
                v-model="character.characterClass"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="" disabled>Select a class</option>
                <option v-for="charClass in characterClasses" :key="charClass" :value="charClass">
                  {{ charClass }}
                </option>
              </select>
            </div>
          </div>
          <div class="mb-4">
            <label for="level" class="block text-sm font-medium text-gray-700 mb-1"
              >Level (1-20)</label
            >
            <input
              id="level"
              v-model.number="character.level"
              type="number"
              min="1"
              max="20"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <!-- Character Stats Section -->
        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-3 text-primary-600">Character Stats</h4>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="mb-4" v-for="(value, stat) in character.playerCharacterData" :key="stat">
              <label :for="stat" class="block text-sm font-medium text-gray-700 mb-1 capitalize">{{
                stat
              }}</label>
              <input
                :id="stat"
                v-model.number="character.playerCharacterData[stat]"
                type="number"
                min="1"
                max="30"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        <!-- Form Action Buttons -->
        <div class="flex justify-end space-x-3 mt-8">
          <button
            type="button"
            @click="router.push(goToCharacterView())"
            class="px-4 py-2 border rounded-md border-third-300 button-secondary"
            :disabled="isSubmitting"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 border rounded-md border-third-300 button-add"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">Saving...</span>
            <span v-else>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
