<script setup>
import { ref } from 'vue'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import BaseButton from '@/components/base/BaseButton.vue'
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
    <BaseModal v-if="showCreateCampaignModal" @close="closeCreateCampaignModal">
      <div class="bg-[var(--color-surface)] p-8 rounded">
        <h3 class="text-lg font-bold mb-4">Create a new campaign</h3>
        <form @submit.prevent="createCampaign">
          <div class="mb-4">
            <label for="name" class="block text-sm font-medium text-default"
              >Name of your campaign</label
            >
            <input
              id="name"
              v-model="newCampaignName"
              type="text"
              class="mt-1 block w-full rounded-md shadow-sm"
            />
          </div>
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
            <label for="primary-system" class="block text-sm font-medium text-default">
              Game system (optional)
            </label>
            <select
              id="primary-system"
              v-model="newCampaignSystem"
              class="mt-1 block w-full rounded-md shadow-sm"
            >
              <option value="">No system yet</option>
              <option v-for="option in CAMPAIGN_SYSTEM_OPTIONS" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </div>
          <BaseButton variant="add" type="submit" :loading="isCreating"> create </BaseButton>
          <BaseButton variant="ghost" :disabled="isCreating" @click="closeCreateCampaignModal">
            Cancel
          </BaseButton>
        </form>
        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      </div>
    </BaseModal>
  </div>
</template>
