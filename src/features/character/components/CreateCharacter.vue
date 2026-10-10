<script setup>
import { computed, ref } from 'vue'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/base/BaseButton.vue'
import SystemFormRouter from '@/features/character/dispatchers/SystemFormRouter.vue'
import {
  DEFAULT_SYSTEM_TYPE,
  SYSTEM_OPTIONS,
  SYSTEM_LABELS,
  createEmptyCharacterBlocks,
  validate,
  buildPayload,
} from '@/features/character/dispatchers/systemRegistry.js'

const characterStore = useCharacterStore()
const router = useRouter()
const cancel = () => router.push({ name: 'CharactersView' })

const character = ref({
  name: '',
  systemType: DEFAULT_SYSTEM_TYPE,
  notes: '',
  backstory: '',
  privateBackstory: '',
  ...createEmptyCharacterBlocks(),
})

const systemLabel = computed(() => SYSTEM_LABELS[character.value.systemType] ?? '')

const isSubmitting = ref(false)
const formError = ref('')

const submitCharacter = async () => {
  if (!character.value.name) {
    formError.value = 'Character name is required'
    return
  }

  const systemError = validate(character.value.systemType, character.value)
  if (systemError) {
    formError.value = systemError
    return
  }

  isSubmitting.value = true
  formError.value = ''

  const payload = buildPayload(character.value.systemType, character.value)

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
              <option v-for="option in SYSTEM_OPTIONS" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
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

        <!-- Backstory (core character fields, shared by every system) -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-3" style="color: var(--color-primary-700)">
            Backstory
          </h3>

          <div class="mb-4">
            <label for="backstory" class="block text-sm font-medium text-default mb-1">
              Public backstory — visible to everyone in the campaign
            </label>
            <textarea
              id="backstory"
              v-model="character.backstory"
              rows="4"
              class="input-field w-full px-3 py-2 border border-input rounded-md"
              placeholder="Where does this character come from?"
            ></textarea>
          </div>

          <div class="mb-4">
            <label for="privateBackstory" class="block text-sm font-medium text-default mb-1">
              Private backstory — visible to you and the GM only
            </label>
            <textarea
              id="privateBackstory"
              v-model="character.privateBackstory"
              rows="4"
              class="input-field w-full px-3 py-2 border border-input rounded-md"
              placeholder="Secrets only the GM should know"
            ></textarea>
          </div>
        </div>

        <!-- System-specific fields -->
        <div class="mb-6">
          <h3
            v-if="systemLabel"
            class="text-lg font-semibold mb-3"
            style="color: var(--color-primary-700)"
          >
            {{ systemLabel }}
          </h3>
          <SystemFormRouter v-model="character" :system-type="character.systemType" />
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
