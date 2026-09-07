<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'

const props = defineProps({
  modelValue: Boolean,
  campaignId: {
    type: [String, Number],
    required: true,
  },
})

const emit = defineEmits(['update:modelValue', 'character-imported'])

const characterStore = useCharacterStore()
const campaignStore = useCampaignStore()
const router = useRouter()

// Initialize an empty array to hold the available characters
const availableCharacters = ref([])
const isImporting = ref(null)

async function loadAvailableCharacters() {
  try {
    const result = await characterStore.fetchCharactersWithoutCampaign()
    availableCharacters.value = Array.isArray(result) ? result : []
  } catch (error) {
    console.error('Failed to load characters:', error)
    availableCharacters.value = []
  }
}

async function importCharacter(characterId) {
  isImporting.value = characterId
  try {
    await campaignStore.importCharacterToCampaign(characterId, props.campaignId)
    // Update the available characters list
    availableCharacters.value = availableCharacters.value.filter((char) => char.id !== characterId)
    emit('character-imported')
    // Don't close the modal if there are still characters left that the user can import
    if (availableCharacters.value.length === 0) {
      close()
    }
  } catch (error) {
    console.error('Failed to import character:', error)
  } finally {
    isImporting.value = null
  }
}

function close() {
  emit('update:modelValue', false)
}

onMounted(loadAvailableCharacters)

// If the modal is opened, reload the characters
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      loadAvailableCharacters()
    }
  },
)
</script>

<template>
  <BaseModal
    v-if="modelValue"
    z-index="z-[100]"
    @close="close"
  >
    <div
      class="p-8 rounded-lg max-w-[600px] w-[90%] max-h-[80vh] overflow-y-auto"
      style="background-color: var(--color-primary-50)"
    >
      <h4 class="mb-4" style="color: var(--color-primary-800)">Select a character to import to the campaign</h4>

      <div v-if="characterStore.isLoading" class="text-center py-8">
        <div class="spinner h-8 w-8 border-t-2 border-b-2"></div>
        <p class="mt-2 text-secondary">Loading available characters...</p>
      </div>

      <div v-else-if="availableCharacters.length === 0" class="text-center py-8">
        <p class="text-secondary">You don't have any characters available to import.</p>
        <BaseButton variant="add" @click="router.push({ name: 'CreateCharacter' })">
          Create a new character
        </BaseButton>
      </div>

      <!-- Character grid -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(80vh-200px)] overflow-y-auto"
      >
        <div
          v-for="character in availableCharacters"
          :key="character.id"
          class="rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-subtle flex flex-col"
          style="background-color: var(--color-primary-50)"
        >
          <div class="p-4 flex-grow">
            <div class="flex items-start space-x-3">
              <CharacterImage
                :src="character.imageUrl"
                :alt="`${character.name} portrait`"
                class="w-14 h-14 rounded-lg border-2 shadow-sm flex-shrink-0 object-cover"
                style="border-color: var(--color-primary-300)"
              />

              <div class="flex-1 min-w-0">
                <h5
                  class="text-base font-semibold line-clamp-2 break-words"
                  style="color: var(--color-primary-700)"
                  :title="character.name"
                >
                  {{ character.name }}
                </h5>

                <!-- Character basic info -->
                <div class="flex items-center text-xs text-secondary mt-1">
                  <span>{{ character.race }}</span>
                  <span class="mx-1">•</span>
                  <span>{{ character.characterClass }} (Level {{ character.level }})</span>
                </div>
              </div>
            </div>
          </div>

          <div class="px-4 py-2 flex justify-end" style="background-color: var(--color-primary-100)">
            <BaseButton
              variant="add"
              :disabled="isImporting === character.id"
              :loading="isImporting === character.id"
              @click="importCharacter(character.id)"
            >
              Import to campaign
            </BaseButton>
          </div>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <BaseButton variant="ghost" @click="close">Cancel</BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped></style>
