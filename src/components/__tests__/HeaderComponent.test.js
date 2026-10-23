import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import HeaderComponent from '@/components/HeaderComponent.vue'
import { useAuthStore } from '@/features/auth/authStore.js'

const mounted = []
afterEach(() => {
  while (mounted.length) mounted.pop().unmount()
})

/**
 * The bar carries the brand (mark + wordmark) for everyone, and its link set
 * follows the identity: a session owns characters/campaigns, Settings is public,
 * and the right-hand action is Logout or Login. Both the mobile bar and the
 * desktop bar are always in the DOM (the split is CSS-only), so the assertions
 * read the rendered text rather than counting nodes.
 */
async function mountHeader({ authenticated = false, guest = false } = {}) {
  setActivePinia(createPinia())
  const authStore = useAuthStore()
  authStore.isAuthChecked = true
  authStore.authStatus = authenticated ? 'authenticated' : 'unauthenticated'
  authStore.isGuest = guest

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:catchAll(.*)*', component: { template: '<div />' } }],
  })
  await router.push('/')
  await router.isReady()

  const wrapper = mount(HeaderComponent, { global: { plugins: [router] } })
  mounted.push(wrapper)
  return wrapper
}

describe('HeaderComponent', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the brand mark, as decoration beside the wordmark', async () => {
    const wrapper = await mountHeader()
    const marks = wrapper.findAll('header img')

    expect(marks.length).toBeGreaterThan(0)
    expect(marks[0].attributes('src')).toContain('logo.svg')
    // The wordmark beside it carries the name, so the mark itself is decorative.
    expect(marks[0].attributes('alt')).toBe('')
  })

  it('offers Home, About, Spells and Settings to an anonymous visitor', async () => {
    const wrapper = await mountHeader()

    expect(wrapper.text()).toContain('Home')
    expect(wrapper.text()).toContain('About')
    expect(wrapper.text()).toContain('Spells')
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Login')
    expect(wrapper.text()).not.toContain('Characters')
    expect(wrapper.text()).not.toContain('Logout')
  })

  it('adds the collections and Logout for an authenticated account', async () => {
    const wrapper = await mountHeader({ authenticated: true })

    expect(wrapper.text()).toContain('Characters')
    expect(wrapper.text()).toContain('Campaigns')
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Logout')
    expect(wrapper.text()).not.toContain('Login')
  })

  it('gives the Guest Demo identity the collections and Login, plus its notice', async () => {
    const wrapper = await mountHeader({ guest: true })

    expect(wrapper.text()).toContain('Characters')
    expect(wrapper.text()).toContain('Campaigns')
    expect(wrapper.text()).toContain('Login')
    expect(wrapper.text()).toContain('You are in demo mode')
    expect(wrapper.text()).not.toContain('Logout')
  })
})
