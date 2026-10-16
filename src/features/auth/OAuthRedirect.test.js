import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import OAuthRedirect from '@/features/auth/OAuthRedirect.vue'

// The user store would otherwise call the API; this test is about what happens to
// the token, not about the profile fetch.
vi.mock('@/features/user/userStore.js', () => ({
  useUserStore: () => ({ fetchCurrentUser: () => Promise.resolve({}) }),
}))

/**
 * The token arrives as a query parameter, which is why this route has a test at
 * all: it has to be read, stored, and taken out of the address bar.
 * See docs/DEPLOYMENT.md#the-access-log.
 */
describe('OAuthRedirect', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    localStorage.clear()
  })

  async function mountRoute(path) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/oauth-redirect', name: 'oauth-redirect', component: OAuthRedirect },
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
      ],
    })
    await router.push(path)
    await router.isReady()

    const wrapper = mount(OAuthRedirect, { global: { plugins: [router, pinia] } })
    await flushPromises()

    return { router, wrapper }
  }

  it('stores the token and takes it out of the URL', async () => {
    const { router, wrapper } = await mountRoute('/oauth-redirect?token=a-token')

    expect(localStorage.getItem('auth_token')).toBe('a-token')
    expect(router.currentRoute.value.name).toBe('home')
    expect(router.currentRoute.value.fullPath).not.toContain('token')

    wrapper.unmount()
  })

  it('sends a visitor without a token to the login page', async () => {
    const { router, wrapper } = await mountRoute('/oauth-redirect')

    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(router.currentRoute.value.name).toBe('login')

    wrapper.unmount()
  })
})
