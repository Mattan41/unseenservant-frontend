<script setup>
/**
 * Admin → Logs: the audit trail, newest first.
 *
 * Read-only by construction — the backend exposes no way to write, edit or delete
 * a row — so the only controls are the type filter and paging. It answers the
 * questions an administrator actually has: who has an account, who signed in (and
 * who failed to), and who changed a role or the whitelist. Campaigns, messages
 * and characters are not in it, on purpose.
 *
 * The note at the bottom carries the two things a reader cannot tell from the
 * table itself: that it is pruned after a fixed period, and that a name in it is
 * a copy taken at the time rather than a live profile.
 */
import { computed, onMounted } from 'vue'
import { useAdminStore } from '@/features/admin/adminStore.js'
import {
  AUDIT_EVENT_TYPES,
  getEventBadgeClass,
  getEventLabel,
  getEventParties,
} from '@/features/admin/auditUtils.js'
import { formatUtcDateTime } from '@/utils/timestampUtils.js'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInfoBox from '@/components/base/BaseInfoBox.vue'

const adminStore = useAdminStore()

onMounted(() => adminStore.fetchLogs())

/** "Everything" plus one entry per type the backend records. */
const filterOptions = computed(() => [
  { value: '', label: 'All events' },
  ...AUDIT_EVENT_TYPES.map((type) => ({ value: type, label: getEventLabel(type) })),
])
</script>

<template>
  <div class="space-y-6">
    <div class="border border-section rounded-lg p-4">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h4 class="text-lg font-semibold">Audit log</h4>

        <div class="flex flex-wrap items-center gap-2">
          <label for="audit-log-filter" class="text-sm text-muted">Show</label>
          <select
            id="audit-log-filter"
            class="input-field p-2 rounded"
            :value="adminStore.logsFilter"
            :disabled="adminStore.isLoadingLogs"
            @change="adminStore.setLogsFilter($event.target.value)"
          >
            <option v-for="option in filterOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <BaseButton
            variant="ghost"
            :loading="adminStore.isLoadingLogs"
            @click="adminStore.fetchLogs()"
          >
            Refresh
          </BaseButton>
        </div>
      </div>

      <div v-if="adminStore.isLoadingLogs" class="text-center p-4">
        <div class="spinner h-6 w-6"></div>
        <p class="mt-2 text-sm text-muted">Loading the audit log...</p>
      </div>

      <p v-else-if="!adminStore.logs.length" class="text-muted text-sm italic">
        Nothing recorded yet.
      </p>

      <ul v-else class="space-y-2">
        <li
          v-for="entry in adminStore.logs"
          :key="entry.id"
          class="border border-section rounded p-3 space-y-1"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="badge" :class="getEventBadgeClass(entry.type)">
              {{ getEventLabel(entry.type) }}
            </span>
            <span class="text-sm text-muted">{{ formatUtcDateTime(entry.occurredAt) }}</span>
          </div>

          <div class="font-medium break-words">{{ getEventParties(entry) }}</div>

          <div v-if="entry.detail" class="text-sm text-muted break-words">{{ entry.detail }}</div>
          <div v-if="entry.clientIp" class="text-sm text-muted">from {{ entry.clientIp }}</div>
        </li>
      </ul>

      <div v-if="adminStore.hasMoreLogs" class="mt-3 text-center">
        <BaseButton :loading="adminStore.isLoadingMoreLogs" @click="adminStore.loadMoreLogs()">
          Load older events
        </BaseButton>
      </div>
    </div>

    <BaseInfoBox variant="info">
      The audit log records account and administration events only — accounts, sign-ins, roles and
      the email whitelist. Campaigns, messages and characters are not recorded here. Rows are kept
      for a fixed period and pruned afterwards, and the names in them are copies taken when the
      event happened, so an account that has since been renamed or removed still reads as it did
      then.
    </BaseInfoBox>
  </div>
</template>
