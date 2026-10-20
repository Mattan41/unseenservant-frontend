<script setup>
import { computed, ref } from 'vue'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseMarkdownField from '@/components/base/BaseMarkdownField.vue'
import SystemFormRouter from '@/features/character/dispatchers/SystemFormRouter.vue'
import { useUnsavedChanges } from '@/utils/useUnsavedChanges.js'
import { parseCharacterBackup, characterFromBackup } from '@/features/character/characterExport.js'
import {
  DEFAULT_SYSTEM_TYPE,
  SYSTEM_FORM_OPTIONS,
  SYSTEM_LABELS,
  createEmptyCharacterBlocks,
  validate,
  buildPayload,
} from '@/features/character/dispatchers/systemRegistry.js'

const characterStore = useCharacterStore()
const notificationStore = useNotificationStore()
const router = useRouter()
const cancel = () => router.push({ name: 'CharactersView' })

const character = ref({
  name: '',
  systemType: DEFAULT_SYSTEM_TYPE,
  notes: '',
  appearance: '',
  backstory: '',
  privateBackstory: '',
  ...createEmptyCharacterBlocks(),
})

const systemLabel = computed(() => SYSTEM_LABELS[character.value.systemType] ?? '')

// Warn before leaving the create form with unsaved input.
const characterSnapshot = JSON.stringify(character.value)
let hasSaved = false
useUnsavedChanges(
  () => !hasSaved && JSON.stringify(character.value) !== characterSnapshot,
  'You have unsaved changes. Leave without saving?',
)

const isSubmitting = ref(false)
const formError = ref('')

const fileInput = ref(null)

/**
 * Load a JSON backup into the create form (review-before-create).
 *
 * The user may edit any field, then creates the character through the normal
 * save path; they attach it to a campaign afterwards via the campaign import
 * flow. Relational fields are never restored (see `characterExport.js`).
 */
function importBackup(event) {
  const file = event.target.files && event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      character.value = characterFromBackup(parseCharacterBackup(String(reader.result)))
      formError.value = ''
      notificationStore.addNotification(
        'Backup loaded — review the fields, then create.',
        'success',
      )
    } catch (error) {
      notificationStore.addNotification(
        error.message || 'Could not read that backup file.',
        'error',
      )
    } finally {
      event.target.value = ''
    }
  }
  reader.onerror = () => {
    notificationStore.addNotification('Could not read that backup file.', 'error')
    event.target.value = ''
  }
  reader.readAsText(file)
}

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
      hasSaved = true
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
      <div class="p-6 border-b border-section flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-bold" style="color: var(--color-primary-700)">
          Create New Character
        </h1>
        <div>
          <BaseButton variant="default" icon="upload" @click="fileInput?.click()">
            Import from backup (.json)
          </BaseButton>
          <input
            ref="fileInput"
            id="character-backup-input"
            type="file"
            accept=".json,application/json"
            class="hidden"
            aria-label="Import character from a backup file"
            @change="importBackup"
          />
        </div>
      </div>

      <form @submit.prevent="submitCharacter" class="p-6">
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
            placeholder="Optional notes about this character"
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
          <h3
            v-if="systemLabel"
            class="text-lg font-semibold mb-3"
            style="color: var(--color-primary-700)"
          >
            {{ systemLabel }}
          </h3>
          <SystemFormRouter v-model="character" :system-type="character.systemType" />
        </div>

        <!-- Validation and save errors sit with the buttons: the form is long, so a
             message at the top is off-screen exactly when it matters. -->
        <div v-if="formError" class="error-message mt-8 mb-4">{{ formError }}</div>

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
