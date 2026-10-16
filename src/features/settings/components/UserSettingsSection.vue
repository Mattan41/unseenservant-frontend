<script setup>
/**
 * User settings — the signed-in account's profile.
 *
 * Display name is editable (`PATCH /api/users/{id}` through the store); email,
 * username and role are provided by the identity provider or by an
 * administrator, so they are read-only here. Administrator rights are not
 * editable from this screen — that lives in the Admin section.
 */
import { computed, ref } from 'vue'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { getRoleBadgeClass } from '@/features/user/userUtils.js'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'

const userStore = useUserStore()
const notificationStore = useNotificationStore()

const editForm = ref({
  displayName: '',
  isEditing: false,
  isSaving: false,
})

/** Role → badge colour decision stays out of the template (see `userUtils.js`). */
const roleBadgeClass = computed(() => getRoleBadgeClass(userStore.userRole))

function startEditing() {
  editForm.value.displayName = userStore.displayName
  editForm.value.isEditing = true
}

function cancelEditing() {
  editForm.value.isEditing = false
  editForm.value.displayName = ''
}

async function saveDisplayName() {
  const value = editForm.value.displayName.trim()
  if (!value) {
    notificationStore.addNotification('Display name cannot be empty', 'error')
    return
  }

  editForm.value.isSaving = true
  const success = await userStore.updateUserField('displayName', value)
  if (success) {
    editForm.value.isEditing = false
    editForm.value.displayName = ''
  }
  editForm.value.isSaving = false
}
</script>

<template>
  <div class="space-y-6">
    <div class="profile-section">
      <h3 class="section-heading mb-4">Profile</h3>

      <div class="space-y-4">
        <!-- Display name (editable) -->
        <div>
          <BaseInput
            v-if="editForm.isEditing"
            v-model="editForm.displayName"
            label="Display name"
            placeholder="Enter display name"
            :disabled="editForm.isSaving"
          />

          <template v-else>
            <span class="block text-sm font-medium text-default mb-1">Display name</span>
            <div class="flex items-center gap-2">
              <div class="profile-value flex-grow">{{ userStore.displayName }}</div>
              <BaseButton variant="update" icon="edit" @click="startEditing">Edit</BaseButton>
            </div>
          </template>

          <div v-if="editForm.isEditing" class="flex gap-2 mt-3">
            <BaseButton
              variant="add"
              :disabled="editForm.isSaving"
              :loading="editForm.isSaving"
              @click="saveDisplayName"
            >
              Save
            </BaseButton>
            <BaseButton variant="default" :disabled="editForm.isSaving" @click="cancelEditing">
              Cancel
            </BaseButton>
          </div>
        </div>

        <!-- Username (read-only) -->
        <div>
          <span class="block text-sm font-medium text-default mb-1">Username</span>
          <div class="profile-value">{{ userStore.currentUser?.username || '—' }}</div>
        </div>

        <!-- Email (read-only) -->
        <div>
          <span class="block text-sm font-medium text-default mb-1">Email</span>
          <div class="profile-value">{{ userStore.currentUser?.email || 'No email provided' }}</div>
        </div>
      </div>
    </div>

    <div class="profile-section">
      <h3 class="section-heading mb-4">Account</h3>

      <span class="block text-sm font-medium text-default mb-1">Account type</span>
      <div class="flex items-center gap-2">
        <span class="badge" :class="roleBadgeClass">{{ userStore.userRoleLabel }}</span>
      </div>
      <p class="text-sm text-muted mt-3">
        Username, email and account type are managed by your login provider or by an administrator.
      </p>
    </div>
  </div>
</template>

<style scoped></style>