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
const newCampaignWorldLore = ref('')
const newCampaignPrivateDescription = ref('')
const newCampaignSystem = ref('')
const isCreating = ref(false)
const errorMessage = ref('')

function hasUnsavedInput() {
  return (
    !!newCampaignName.value ||
    !!newCampaignDescription.value ||
    !!newCampaignWorldLore.value ||
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
    await campaignStore.createCampaign({
      name: newCampaignName.value,
      description: newCampaignDescription.value,
      worldLore: newCampaignWorldLore.value,
      privateDescription: newCampaignPrivateDescription.value,
      primarySystem: newCampaignSystem.value || null,
    })
    showCreateCampaignModal.value = false
    newCampaignName.value = ''
    newCampaignDescription.value = ''
    newCampaignWorldLore.value = ''
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
    <!-- The trigger is the same dashed discovery tile as the characters list
         uses for "create a character", so "create" reads the same in both
         collections. -->
    <BaseButton variant="tile" icon="plus" @click="showCreateCampaignModal = true">
      Create new campaign
    </BaseButton>

    <!-- Teleported to <body>: an un-teleported overlay would inherit the list
         markup around the trigger, including the page-sized type ramp and
         `text-transform` those rules carry (see `.modal-title`). -->
    <Teleport to="body">
      <!-- `aria-labelledby` names the native `<dialog>` BaseModal renders; the
           panel inside it carries no role of its own. -->
      <BaseModal
        v-if="showCreateCampaignModal"
        aria-labelledby="create-campaign-title"
        @close="closeCreateCampaignModal"
      >
        <!-- Capped height so a long description preview scrolls inside the
             dialog instead of growing past the viewport. -->
        <div
          class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-[var(--color-surface)] p-6 shadow-xl"
        >
          <h2 id="create-campaign-title" class="modal-title mb-4">Create a new campaign</h2>

          <form @submit.prevent="createCampaign">
            <BaseInput
              id="name"
              v-model="newCampaignName"
              class="mb-4"
              label="Name of your campaign"
            />

            <!-- Short overview: surfaced on the campaign's Overview page. -->
            <BaseMarkdownField
              id="description"
              v-model="newCampaignDescription"
              class="mb-4"
              label="Short description"
              hint="A short overview, shown on the Overview page."
              :rows="3"
              placeholder="A one-paragraph pitch for the campaign"
            />

            <!-- Setting material: surfaced in World Lore & Background. -->
            <BaseMarkdownField
              id="worldLore"
              v-model="newCampaignWorldLore"
              class="mb-4"
              label="World Lore &amp; Background"
              hint="Shown in the World Lore &amp; Background section."
              :rows="6"
              placeholder="History, factions, places, and the state of the world"
            />

            <!-- GM-only: surfaced in World Lore & Background, for owner/GM. -->
            <BaseMarkdownField
              id="privateDescription"
              v-model="newCampaignPrivateDescription"
              class="mb-4"
              label="GM notes"
              hint="Only the GM can see this."
              :rows="4"
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

            <div class="flex flex-wrap items-center justify-between gap-2">
              <!-- The error sits with the buttons: the dialog scrolls, so a message
                   at the top of it is off-screen exactly when the save fails. -->
              <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

              <div class="ml-auto flex justify-end gap-3">
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
            </div>
          </form>
        </div>
      </BaseModal>
    </Teleport>
  </div>
</template>
