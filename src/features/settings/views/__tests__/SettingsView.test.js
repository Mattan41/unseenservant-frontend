import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import SettingsView from '@/features/settings/views/SettingsView.vue'
import ContextSidebar from '@/components/base/ContextSidebar.vue'
import AdminUsersSection from '@/features/admin/components/AdminUsersSection.vue'
import AdminWhitelistSection from '@/features/admin/components/AdminWhitelistSection.vue'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useUserStore } from '@/features/user/userStore.js'

/**
 * Guest Demo serves no `/api/admin/**` route, so Settings → Admin must not be
 * reachable there — not through the sidebar, and not through a `?section=admin`
 * deep link either. The role check alone is not enough: a guest session started
 * before the admin mocks were removed still has `role: 'ADMIN'` in localStorage.
 */
async function mountSettings({ guest, role, section }) {
  setActivePinia(createPinia())
  useAuthStore().isGuest = guest
  useUserStore().currentUser = { id: 'u1', displayName: 'Tester', email: 't@demo.local', role }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/settings', name: 'settings', component: { template: '<div />' } }],
  })
  await router.push(section ? `/settings?section=${section}` : '/settings')
  await router.isReady()

  const wrapper = mount(SettingsView, { global: { plugins: [router] } })
  const keys = wrapper
    .findComponent(ContextSidebar)
    .props('items')
    .map((item) => item.key)

  return { wrapper, keys }
}

describe('settings sections', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('lists General and User for an ordinary account', async () => {
    const { keys } = await mountSettings({ guest: false, role: 'USER' })

    expect(keys).toEqual(['general', 'user'])
  })

  it('lists Admin for an administrator', async () => {
    const { keys } = await mountSettings({ guest: false, role: 'ADMIN' })

    expect(keys).toEqual(['general', 'user', 'admin'])
  })

  it('keeps Admin out of a guest session, even with role ADMIN stored', async () => {
    const { keys } = await mountSettings({ guest: true, role: 'ADMIN' })

    expect(keys).toEqual(['general', 'user'])
  })

  it('falls back to General when a guest deep-links to the admin section', async () => {
    const { wrapper, keys } = await mountSettings({ guest: true, role: 'ADMIN', section: 'admin' })

    expect(keys).not.toContain('admin')
    expect(wrapper.findComponent(AdminUsersSection).exists()).toBe(false)
    expect(wrapper.findComponent(AdminWhitelistSection).exists()).toBe(false)
  })
})
