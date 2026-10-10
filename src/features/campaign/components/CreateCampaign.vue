<script setup>
import { ref } from 'vue'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import { CAMPAIGN_SYSTEM_OPTIONS } from '@/features/campaign/campaignSystems.js'

const campaignStore = useCampaignStore()

const showCreateCampaignModal = ref(false)
const newCampaignName = ref('')
const newCampaignDescription = ref('')
const newCampaignSystem = ref('')
const isCreating = ref(false)
const errorMessage = ref('')

const createCampaign = async () => {
  isCreating.value = true
  try {
    await campaignStore.createCampaign(
      newCampaignName.value,
      newCampaignDescription.value,
      newCampaignSystem.value || null,
    )
    showCreateCampaignModal.value = false
    newCampaignName.value = ''
    newCampaignDescription.value = ''
    newCampaignSystem.value = ''
    errorMessage.value = ''
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || 'Failed to create campaign'
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div>
    <BaseButton variant="add" @click="showCreateCampaignModal = true">
      Create new campaign
    </BaseButton>
    <BaseModal v-if="showCreateCampaignModal" @close="showCreateCampaignModal = false">
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
          <div class="mb-4">
            <label for="description" class="block text-sm font-medium text-default"
              >Description</label
            >
            <textarea
              id="description"
              v-model="newCampaignDescription"
              class="mt-1 block w-full rounded-md shadow-sm"
              rows="5"
            >
            </textarea>
          </div>
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
          <BaseButton
            variant="ghost"
            :disabled="isCreating"
            @click="showCreateCampaignModal = false"
          >
            Cancel
          </BaseButton>
        </form>
        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      </div>
    </BaseModal>
  </div>
</template>
