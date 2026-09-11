<script setup>
import { ref } from 'vue'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/base/BaseButton.vue'

const characterStore = useCharacterStore()
const router = useRouter()
const cancel = () => router.push({ name: 'CharactersView' })

const character = ref({
  name: '',
  race: '',
  characterClass: '',
  level: 1,
  playerCharacterData: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
})

const isSubmitting = ref(false)
const formError = ref('')

const races = [
  'Human',
  'Centaur',
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

const submitCharacter = async () => {
  if (!character.value.name) {
    formError.value = 'Character name is required'
    return
  }

  if (!character.value.race) {
    formError.value = 'You must select a race'
    return
  }

  if (!character.value.characterClass) {
    formError.value = 'You must select a class'
    return
  }

  isSubmitting.value = true
  formError.value = ''

  try {
    const newCharacter = await characterStore.createCharacter(character.value)
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
        <div v-if="formError" class="error-message mb-4">
          {{ formError }}
        </div>

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

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="mb-4">
              <label for="race" class="block text-sm font-medium text-default mb-1">Race</label>
              <select
                id="race"
                v-model="character.race"
                class="input-field w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="" disabled>Select a race</option>
                <option v-for="race in races" :key="race" :value="race">{{ race }}</option>
              </select>
            </div>

            <div class="mb-4">
              <label for="class" class="block text-sm font-medium text-default mb-1">Class</label>
              <select
                id="class"
                v-model="character.characterClass"
                class="input-field w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="" disabled>Select a class</option>
                <option v-for="charClass in characterClasses" :key="charClass" :value="charClass">
                  {{ charClass }}
                </option>
              </select>
            </div>
          </div>

          <div class="mb-4">
            <label for="level" class="block text-sm font-medium text-default mb-1"
              >Level (1-20)</label
            >
            <input
              id="level"
              v-model.number="character.level"
              type="number"
              min="1"
              max="20"
              class="input-field w-full px-3 py-2 border border-input rounded-md"
            />
          </div>
        </div>

        <!-- Character Stats -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-3" style="color: var(--color-primary-700)">
            Character Stats
          </h3>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="mb-4" v-for="(value, stat) in character.playerCharacterData" :key="stat">
              <label :for="stat" class="block text-sm font-medium text-default mb-1 capitalize">{{
                stat
              }}</label>
              <input
                :id="stat"
                v-model.number="character.playerCharacterData[stat]"
                type="number"
                min="1"
                max="30"
                class="input-field w-full px-3 py-2 border border-input rounded-md"
              />
            </div>
          </div>
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
