<script setup>
/**
 * Settings — the account-level shell.
 *
 * Mirrors the campaign shell's layout (mobile top bar → slide-over drawer,
 * desktop rail, content column) and keeps the active section in the URL
 * (`?section=…`) so a refresh or a shared link reopens the same subview.
 *
 * Sections:
 *   general — client-side preferences (colour theme) and read-only environment info
 *   user    — the signed-in profile (display name, email, username, account type)
 *   admin   — administrators only (users + email whitelist); never in Guest Demo
 *   logs    — administrators only (the audit trail); never in Guest Demo
 *
 * The nav items are computed here so the sidebar stays presentational, and the
 * administrator sections are filtered out for ordinary accounts and for every
 * guest session — guest mode serves no `/api/admin/**` route at all.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/features/user/userStore.js'
import { useAuthStore } from '@/features/auth/authStore.js'
import ContextSidebar from '@/components/base/ContextSidebar.vue'
import ContextMobileBar from '@/components/base/ContextMobileBar.vue'
import BaseSection from '@/components/base/BaseSection.vue'
import GeneralSettingsSection from '@/features/settings/components/GeneralSettingsSection.vue'
import UserSettingsSection from '@/features/settings/components/UserSettingsSection.vue'
import AdminUsersSection from '@/features/admin/components/AdminUsersSection.vue'
import AdminWhitelistSection from '@/features/admin/components/AdminWhitelistSection.vue'
import AdminLogsSection from '@/features/admin/components/AdminLogsSection.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()

const SECTIONS = [
  { key: 'general', label: 'General', icon: 'settings', title: 'General Settings' },
  {
    key: 'user',
    label: 'User Settings',
    icon: 'participants',
    title: 'User Settings',
    requiresProfile: true,
  },
  { key: 'admin', label: 'Admin', icon: 'shield', title: 'Admin', requiresAdmin: true },
  { key: 'logs', label: 'Logs', icon: 'logs', title: 'Audit Log', requiresAdmin: true },
]

const DEFAULT_SECTION = 'general'

/**
 * Sections this visitor may open:
 *   general — everyone, signed in or not (the colour theme is a browser preference)
 *   user    — anyone with a profile: an account or the Guest Demo identity
 *   admin   — administrators only, and never during a guest session
 *
 * Filtered here so the sidebar, the URL guard and the rendered section all share
 * one source. Deep links to a section the visitor may not open fall back to
 * General instead of showing an empty page.
 */
const navItems = computed(() =>
  SECTIONS.filter((section) => {
    if (section.requiresProfile && !userStore.currentUser) return false
    // Guest mode serves no /api/admin/** route, so the section stays hidden
    // there even when a stored guest_user still carries role ADMIN.
    if (section.requiresAdmin && (authStore.isGuest || !userStore.isAdmin)) return false
    return true
  }),
)

/** Mobile slide-over drawer state (desktop renders the rail instead). */
const settingsNavOpen = ref(false)

function readSectionFromRoute() {
  const requested = String(route.query.section || '')
  return navItems.value.some((section) => section.key === requested) ? requested : DEFAULT_SECTION
}

const activeSection = ref(readSectionFromRoute())

const activeSectionTitle = computed(
  () => navItems.value.find((section) => section.key === activeSection.value)?.title || 'Settings',
)

// The profile may still be loading when this view mounts, which changes the set
// of permitted sections — re-evaluate the URL whenever either side changes.
watch(navItems, () => {
  activeSection.value = readSectionFromRoute()
})
watch(
  () => route.query.section,
  () => {
    activeSection.value = readSectionFromRoute()
  },
)

function selectSection(key) {
  if (key === activeSection.value) return
  if (!navItems.value.some((section) => section.key === key)) return

  activeSection.value = key
  // Mirror the choice into the URL (replace, so Back still leaves Settings).
  router.replace({ query: { ...route.query, section: key } })
}
</script>

<template>
  <div class="flex flex-col md:flex-row md:items-stretch md:h-full">
    <!-- Mobile top bar: title + local navigation trigger -->
    <ContextMobileBar
      title="Settings"
      trigger-label="Settings Menu"
      @open="settingsNavOpen = true"
    />

    <!-- Contextual navigation (rail on desktop, drawer on mobile) -->
    <ContextSidebar
      :items="navItems"
      :active-section="activeSection"
      label="Settings navigation"
      :open="settingsNavOpen"
      @select="selectSection"
      @update:open="settingsNavOpen = $event"
    />

    <div class="flex-1 min-w-0 p-4">
      <BaseSection :title="activeSectionTitle">
        <GeneralSettingsSection v-if="activeSection === 'general'" />
        <UserSettingsSection v-else-if="activeSection === 'user'" />
        <template v-else-if="activeSection === 'admin'">
          <AdminUsersSection />
          <AdminWhitelistSection />
        </template>
        <AdminLogsSection v-else-if="activeSection === 'logs'" />
      </BaseSection>
    </div>
  </div>
</template>
