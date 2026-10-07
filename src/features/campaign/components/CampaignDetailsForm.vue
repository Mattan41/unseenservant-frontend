<script setup>
/**
 * Presentational campaign details form (name, description, image).
 *
 * Extracted from the former Edit Campaign modal so the owner-only
 * `CampaignSettingsSection` can render it inline (two-column on desktop)
 * without a modal wrapper. Emits `save` with the edited payload — the parent
 * owns all store interactions.
 */
import { computed, ref } from 'vue'
import { useAuthStore } from '@/features/auth/authStore.js'
import BaseButton from '@/components/base/BaseButton.vue'

const props = defineProps({
  /** `{ id, title, description, imageUrl }` for the campaign being edited. */
  campaign: {
    type: Object,
    required: true,
  },
  /** Parent-controlled saving state (disables the submit button). */
  saving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save'])

const authStore = useAuthStore()
const isGuestMode = computed(() => authStore.isGuest)

const editedName = ref(props.campaign.title || '')
const editedDescription = ref(props.campaign.description || '')
const fileInput = ref(null)
const selectedFile = ref(null)
const localPreviewUrl = ref(null)

const previewImageUrl = computed(() => localPreviewUrl.value || props.campaign.imageUrl || null)

function triggerFileInput() {
  fileInput.value.click()
}

function handleImageChange(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    localPreviewUrl.value = URL.createObjectURL(file)
  }
}

function saveChanges() {
  emit('save', {
    id: props.campaign.id,
    title: editedName.value,
    description: editedDescription.value,
    imageFile: selectedFile.value,
  })
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- Left: text fields -->
    <div class="md:col-span-2 space-y-3">
      <div>
        <label for="campaign-name" class="block text-sm font-medium text-default mb-1">
          Campaign Name
        </label>
        <input
          id="campaign-name"
          v-model="editedName"
          type="text"
          class="p-3 rounded w-full"
          style="background-color: var(--color-primary-50)"
          placeholder="Enter campaign name"
        />
      </div>

      <div>
        <label for="campaign-description" class="block text-sm font-medium text-default mb-1">
          Description
        </label>
        <textarea
          id="campaign-description"
          v-model="editedDescription"
          class="p-3 rounded w-full"
          style="background-color: var(--color-primary-50)"
          rows="8"
          placeholder="Enter campaign description"
        ></textarea>
      </div>
    </div>

    <!-- Right: image -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-default mb-1">Campaign Image</label>

      <div v-if="isGuestMode" class="demo-notice">
        ⚠️ Image upload is not supported in guest mode. A default image will be used.
      </div>

      <div class="flex flex-col items-start gap-3">
        <div class="relative">
          <img
            v-if="previewImageUrl"
            :src="previewImageUrl"
            alt="Campaign image preview"
            class="w-32 h-32 rounded-lg object-cover border-2"
            style="border-color: var(--color-primary-300)"
          />
          <div
            v-if="previewImageUrl && !isGuestMode"
            @click="triggerFileInput"
            class="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
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

        <BaseButton v-if="!isGuestMode" variant="ghost" type="button" @click="triggerFileInput">
          {{ previewImageUrl ? 'Change image' : 'Upload image' }}
        </BaseButton>
        <span v-else class="text-sm text-muted italic">
          {{
            previewImageUrl
              ? 'Current image (cannot change in guest mode)'
              : 'No image (upload not available in guest mode)'
          }}
        </span>

        <div v-if="!isGuestMode" class="text-xs text-muted">
          Supported formats: *.jpg, *.png, *.gif, *.webp. Max size: 5 MB.
        </div>
      </div>
    </div>
  </div>

  <div class="flex justify-end gap-3 mt-6">
    <BaseButton variant="add" :disabled="saving" :loading="saving" @click="saveChanges">
      Save Changes
    </BaseButton>
  </div>
</template>

<style scoped></style>
