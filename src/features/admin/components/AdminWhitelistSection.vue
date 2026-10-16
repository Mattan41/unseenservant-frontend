<script setup>
/**
 * Admin → Email whitelist: which addresses may log in, and what role a first
 * login is granted.
 *
 * The list is the OAuth gate `CustomOAuth2SuccessHandler` consults, so a revoked
 * address cannot log in at all. The role here only decides what a *first* login
 * gets — an account that already exists keeps its own role, which is why the
 * Users section is the place to change an existing account. Revoking is a soft
 * delete: the row stays visible and can be re-admitted.
 */
import { onMounted, ref } from 'vue'
import { useAdminStore } from '@/features/admin/adminStore.js'
import { getRoleBadgeClass, getRoleLabel } from '@/features/user/userUtils.js'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInfoBox from '@/components/base/BaseInfoBox.vue'
import BaseInput from '@/components/base/BaseInput.vue'

const adminStore = useAdminStore()

const newEmail = ref('')
const isAdding = ref(false)

onMounted(() => adminStore.fetchWhitelist())

/** Admitting an address that was revoked re-activates its existing row. */
async function addEntry(role) {
  const email = newEmail.value.trim()
  if (!email) return

  isAdding.value = true
  const added = await adminStore.addWhitelistEntry(email, role)
  if (added) newEmail.value = ''
  isAdding.value = false
}

const toggleRole = (row) =>
  adminStore.updateWhitelistEntry(row.id, { role: row.role === 'ADMIN' ? 'USER' : 'ADMIN' })

const reAdmit = (row) => adminStore.updateWhitelistEntry(row.id, { active: true })

const revoke = (row) => adminStore.revokeWhitelistEntry(row.id)
</script>

<template>
  <div class="space-y-6">
    <div class="border border-section rounded-lg p-4">
      <h4 class="text-lg font-semibold mb-3">Add an address</h4>

      <div class="flex flex-col sm:flex-row gap-2">
        <BaseInput
          v-model="newEmail"
          type="email"
          placeholder="name@example.com"
          class="flex-grow"
          :disabled="isAdding"
        />
        <BaseButton
          variant="add"
          :disabled="isAdding || !newEmail.trim()"
          :loading="isAdding"
          @click="addEntry('USER')"
        >
          Add as user
        </BaseButton>
        <BaseButton
          variant="update"
          :confirm-message="`Admit ${newEmail} as an administrator?`"
          :disabled="isAdding || !newEmail.trim()"
          @click="addEntry('ADMIN')"
        >
          Add as administrator
        </BaseButton>
      </div>
    </div>

    <div class="border border-section rounded-lg p-4">
      <h4 class="text-lg font-semibold mb-3">Whitelisted addresses</h4>

      <div v-if="adminStore.isLoadingWhitelist" class="text-center p-4">
        <div class="spinner h-6 w-6"></div>
        <p class="mt-2 text-sm text-muted">Loading the whitelist...</p>
      </div>

      <p v-else-if="!adminStore.whitelist.length" class="text-muted text-sm italic">
        The whitelist is empty — nobody could log in.
      </p>

      <ul v-else class="space-y-3">
        <li
          v-for="entry in adminStore.whitelist"
          :key="entry.id"
          class="border border-section rounded p-3 space-y-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-medium truncate">{{ entry.email }}</span>
            <span class="flex items-center gap-2">
              <span v-if="!entry.active" class="badge badge-danger">Revoked</span>
              <span class="badge" :class="getRoleBadgeClass(entry.role)">
                {{ getRoleLabel(entry.role) }}
              </span>
            </span>
          </div>

          <div class="flex flex-wrap gap-2">
            <template v-if="entry.active">
              <BaseButton
                variant="update"
                :disabled="adminStore.savingId === entry.id"
                :loading="adminStore.savingId === entry.id"
                @click="toggleRole(entry)"
              >
                {{ entry.role === 'ADMIN' ? 'Make standard user' : 'Make administrator' }}
              </BaseButton>
              <BaseButton
                variant="remove"
                :confirm-message="`Revoke ${entry.email}? They will not be able to log in.`"
                :disabled="adminStore.savingId === entry.id"
                @click="revoke(entry)"
              >
                Revoke
              </BaseButton>
            </template>

            <BaseButton
              v-else
              variant="add"
              :disabled="adminStore.savingId === entry.id"
              :loading="adminStore.savingId === entry.id"
              @click="reAdmit(entry)"
            >
              Re-admit
            </BaseButton>
          </div>
        </li>
      </ul>
    </div>

    <BaseInfoBox variant="info">
      The role applies when an address logs in <strong>for the first time</strong>. An account that
      already exists keeps its own role — change that under Users. Addresses are matched
      case-insensitively, so the casing here does not matter.
    </BaseInfoBox>
  </div>
</template>

<style scoped></style>