<script setup>
import { ref } from 'vue'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseMarkdownField from '@/components/base/BaseMarkdownField.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import { CAMPAIGN_SYSTEM_OPTIONS } from '@/features/campaign/campaignSystems.js'
import { useUnsavedChanges } from '@/utils/useUnsavedChanges.js'

const campaignStore = useCampaignStore()

const showCreateCampaignModal = ref(false)
const newCampaignName = ref('')
const newCampaignDescription = ref('')
const newCampaignPrivateDescription = ref('')
const newCampaignSystem = ref('')
const isCreating = ref(false)
const errorMessage = ref('')

function hasUnsavedInput() {
  return (
    !!newCampaignName.value ||
    !!newCampaignDescription.value ||
    !!newCampaignPrivateDescription.value ||
    !!newCampaignSystem.value
  )
}

function closeCreateCampaignModal() {
  if (hasUnsavedInput() && !window.confirm('You have unsaved changes. Close without saving?')) {
    return
  }
  showCreateCampaignModal.value = false
}

const createCampaign = async () => {
  isCreating.value = true
  try {
    await campaignStore.createCampaign(
      newCampaignName.value,
      newCampaignDescription.value,
      newCampaignSystem.value || null,
      newCampaignPrivateDescription.value || null,
    )
    showCreateCampaignModal.value = false
    newCampaignName.value = ''
    newCampaignDescription.value = ''
    newCampaignPrivateDescription.value = ''
    newCampaignSystem.value = ''
    errorMessage.value = ''
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || 'Failed to create campaign'
  } finally {
    isCreating.value = false
  }
}

// Warn when leaving the page with an open, partially-filled create form.
useUnsavedChanges(
  () => showCreateCampaignModal.value && hasUnsavedInput(),
  'You have unsaved changes. Leave without saving?',
)
</script>

<template>
  <div>
    <BaseButton variant="add" @click="showCreateCampaignModal = true">
      Create new campaign
    </BaseButton>

    <!-- Teleported to <body>: the trigger sits inside the "Campaigns" <h2>, and
         an un-teleported overlay would inherit that heading's `text-transform:
         uppercase` plus its page-sized type ramp. -->
    <Teleport to="body">
      <BaseModal v-if="showCreateCampaignModal" @close="closeCreateCampaignModal">
        <!-- Capped height so a long description preview scrolls inside the
             dialog instead of growing past the viewport. -->
        <div
          role="dialog"
          aria-labelledby="create-campaign-title"
          class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-[var(--color-surface)] p-6 shadow-xl"
        >
          <h2 id="create-campaign-title" class="modal-title mb-4">Create a new campaign</h2>

          <form @submit.prevent="createCampaign">
            <div v-if="errorMessage" class="error-message mb-4">{{ errorMessage }}</div>

            <BaseInput
              id="name"
              v-model="newCampaignName"
              class="mb-4"
              label="Name of your campaign"
            />

            <BaseMarkdownField
              id="description"
              v-model="newCampaignDescription"
              class="mb-4"
              label="Description"
              :rows="5"
            />

            <BaseMarkdownField
              id="privateDescription"
              v-model="newCampaignPrivateDescription"
              class="mb-4"
              label="Private description"
              hint="Only the GM can see this."
              :rows="3"
              placeholder="Secrets only the GM should know"
            />

            <div class="mb-4">
              <label for="primary-system" class="mb-1 block text-sm font-medium text-default">
                Game system (optional)
              </label>
              <select
                id="primary-system"
                v-model="newCampaignSystem"
                class="input-field border-input block w-full rounded-md px-3 py-2"
              >
                <option value="">No system yet</option>
                <option
                  v-for="option in CAMPAIGN_SYSTEM_OPTIONS"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div class="flex justify-end gap-3">
              <!-- `type="button"`: BaseButton renders no `type`, so inside a form
                   it would default to `submit` and cancel would create the
                   campaign. -->
              <BaseButton
                variant="ghost"
                type="button"
                :disabled="isCreating"
                @click="closeCreateCampaignModal"
              >
                Cancel
              </BaseButton>
              <BaseButton variant="add" type="submit" :loading="isCreating">Create</BaseButton>
            </div>
          </form>
        </div>
      </BaseModal>
    </Teleport>
  </div>
</template>
