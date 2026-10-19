<script setup>
/**
 * Admin → Users: every account with its role, and the role control.
 *
 * Administrator rights are the only thing managed here — profile data belongs to
 * the account holder (Settings → User Settings). The two rules the backend
 * enforces are mirrored as disabled buttons with an explanation: you cannot
 * change your own role, and the last administrator cannot be demoted.
 */
import { onMounted } from 'vue'
import { useAdminStore } from '@/features/admin/adminStore.js'
import { getRoleBadgeClass, getRoleLabel, isAdminRole } from '@/features/user/userUtils.js'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInfoBox from '@/components/base/BaseInfoBox.vue'

const adminStore = useAdminStore()

onMounted(() => adminStore.fetchUsers())

const displayName = (user) => user.displayName || user.username
const nextRole = (user) => (isAdminRole(user.role) ? 'USER' : 'ADMIN')

/** Empty string when the role may be changed, otherwise why it may not. */
function restriction(user) {
  if (adminStore.isSelf(user)) return 'This is you — ask another administrator to change your role.'
  if (!adminStore.canChangeRole(user)) return 'The last administrator cannot be demoted.'
  return ''
}

function changeRole(user) {
  adminStore.changeUserRole(user.id, nextRole(user))
}
</script>

<template>
  <div class="space-y-6">
    <div class="border border-section rounded-lg p-4">
      <h4 class="text-lg font-semibold mb-3">Users</h4>

      <div v-if="adminStore.isLoadingUsers" class="text-center p-4">
        <div class="spinner h-6 w-6"></div>
        <p class="mt-2 text-sm text-muted">Loading users...</p>
      </div>

      <p v-else-if="!adminStore.users.length" class="text-muted text-sm italic">
        No accounts found.
      </p>

      <ul v-else class="space-y-3">
        <li
          v-for="user in adminStore.users"
          :key="user.id"
          class="border border-section rounded p-3 space-y-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="font-medium truncate">{{ displayName(user) }}</div>
              <div class="text-sm text-muted truncate">{{ user.email }}</div>
            </div>
            <span class="badge" :class="getRoleBadgeClass(user.role)">
              {{ getRoleLabel(user.role) }}
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <BaseButton
              v-if="!restriction(user)"
              :variant="isAdminRole(user.role) ? 'remove' : 'update'"
              :confirm-message="
                isAdminRole(user.role)
                  ? `Revoke administrator rights from ${displayName(user)}?`
                  : `Make ${displayName(user)} an administrator?`
              "
              :disabled="adminStore.savingId === user.id"
              :loading="adminStore.savingId === user.id"
              @click="changeRole(user)"
            >
              {{ isAdminRole(user.role) ? 'Revoke administrator' : 'Make administrator' }}
            </BaseButton>
            <span v-else class="text-sm text-muted">{{ restriction(user) }}</span>
          </div>
        </li>
      </ul>
    </div>

    <BaseInfoBox variant="info">
      An account's role takes effect immediately — it is checked on every request, so the holder
      does not have to log in again. Always keep at least one administrator account.
    </BaseInfoBox>
  </div>
</template>

<style scoped></style>
