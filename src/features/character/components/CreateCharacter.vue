<script setup>
import { ref } from 'vue'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/base/BaseButton.vue'
import Dnd5eCharacterForm from '@/systems/dnd5e/components/Dnd5eCharacterForm.vue'
import { createEmptyDnd5eData, DND5E_SYSTEM_TYPE } from '@/systems/dnd5e/constants.js'

const characterStore = useCharacterStore()
const router = useRouter()
const cancel = () => router.push({ name: 'CharactersView' })

const character = ref({
  name: '',
  systemType: DND5E_SYSTEM_TYPE,
  notes: '',
  dnd5e: createEmptyDnd5eData(),
})

const isSubmitting = ref(false)
const formError = ref('')

const submitCharacter = async () => {
  if (!character.value.name) {
    formError.value = 'Character name is required'
    return
  }

  if (character.value.systemType === DND5E_SYSTEM_TYPE) {
    if (!character.value.dnd5e.race) {
      formError.value = 'You must select a race'
      return
    }
    if (!character.value.dnd5e.characterClass) {
      formError.value = 'You must select a class'
      return
    }
  }

  isSubmitting.value = true
  formError.value = ''

  const payload = {
    name: character.value.name,
    systemType: character.value.systemType,
    notes: character.value.notes,
  }
  if (character.value.systemType === DND5E_SYSTEM_TYPE) {
    payload.dnd5e = character.value.dnd5e
  }

  try {
    const newCharacter = await characterStore.createCharacter(payload)
    if (newCharacter) {
      router.push({ name: 'CharacterView', params: { id: newCharacter.id } })
    }
  } catch (error) {
    formError.value = error.message || 'Failed to create character'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="container mx-auto p-4 max-w-2xl">
    <div class="bg-[var(--color-surface)] rounded-lg shadow-lg overflow-hidden">
      <div class="p-6 border-b border-section">
        <h1 class="text-2xl font-bold" style="color: var(--color-primary-700)">
          Create New Character
        </h1>
      </div>

      <form @submit.prevent="submitCharacter" class="p-6">
        <div v-if="formError" class="error-message mb-4">{{ formError }}</div>

        <!-- Basic Info -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-3" style="color: var(--color-primary-700)">
            Basic Information
          </h3>

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
              class="input-field w-full px-3 py-2 border border-input rounded-md"
            >
              <option :value="DND5E_SYSTEM_TYPE">Dungeons &amp; Dragons 5e</option>
            </select>
          </div>

          <div class="mb-4">
            <label for="notes" class="block text-sm font-medium text-default mb-1">Notes</label>
            <textarea
              id="notes"
              v-model="character.notes"
              rows="2"
              class="input-field w-full px-3 py-2 border border-input rounded-md"
              placeholder="Optional notes about this character"
            ></textarea>
          </div>
        </div>

        <!-- System-specific fields -->
        <div v-if="character.systemType === DND5E_SYSTEM_TYPE" class="mb-6">
          <h3 class="text-lg font-semibold mb-3" style="color: var(--color-primary-700)">
            Dungeons &amp; Dragons 5e
          </h3>
          <Dnd5eCharacterForm v-model="character.dnd5e" />
        </div>

        <!-- Buttons -->
        <div class="flex justify-end space-x-3 mt-8">
          <BaseButton variant="ghost" @click="cancel"> Cancel </BaseButton>
          <BaseButton variant="add" type="submit" :disabled="isSubmitting" :loading="isSubmitting">
            Create Character
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
