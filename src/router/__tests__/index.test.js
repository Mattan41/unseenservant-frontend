import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '@/router/index.js'
import { useAuthStore } from '@/features/auth/authStore.js'

// Discovering a guest session makes the auth store sync the profile, and the
// user store would otherwise call the API. This test is about where a visitor
// ends up, not about the profile fetch.
vi.mock('@/features/user/userStore.js', () => ({
  useUserStore: () => ({
    fetchCurrentUser: () => Promise.resolve({}),
    clearUser: () => {},
    userId: null,
  }),
}))

const GUEST_USER = { id: 'guest_demo', displayName: 'Guest' }

/**
 * The guard in src/router/index.js is the only place where the three identity
 * states (anonymous, guest, authenticated) meet the route meta conventions
 * (`requiresAuth`, `requiresSession`), and it is the only thing deciding whether
 * a visitor may see a page. Every branch is asserted here.
 *
 * `requiresAuth` is the stricter axis of the meta contract and no route in the
 * app declares it yet, so those cases register a temporary route.
 */
describe('router auth guard', () => {
  let authStore

  async function navigateTo(target) {
    try {
      await router.push(target)
    } catch {
      // A rejected navigation still leaves us somewhere worth asserting on.
    }
    return router.currentRoute.value
  }

  function asAnonymous() {
    authStore.authStatus = 'unauthenticated'
    authStore.isGuest = false
  }

  function asGuest() {
    authStore.authStatus = 'unauthenticated'
    authStore.isGuest = true
  }

  function asAuthenticated() {
    authStore.authStatus = 'authenticated'
    authStore.isGuest = false
  }

  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    authStore = useAuthStore()
    // Cases start from a settled session check; the initialization cases below
    // opt out of it explicitly.
    authStore.isAuthChecked = true
    asAnonymous()
    await navigateTo('/')
  })

  describe('public routes', () => {
    for (const path of ['/about', '/privacy', '/terms', '/spells', '/under-construction']) {
      it(`lets an anonymous visitor open ${path}`, async () => {
        await navigateTo(path)

        expect(router.currentRoute.value.path).toBe(path)
      })
    }

    it('leaves an authenticated visitor on the route they asked for', async () => {
      asAuthenticated()

      await navigateTo('/about')

      expect(router.currentRoute.value.name).toBe('about')
    })
  })

  describe('routes that require a session', () => {
    it('sends an anonymous visitor to the login page', async () => {
      await navigateTo('/campaigns')

      expect(router.currentRoute.value.name).toBe('login')
    })

    it('lets a guest in, because a guest session counts as a session', async () => {
      asGuest()

      await navigateTo('/campaigns')

      expect(router.currentRoute.value.name).toBe('CampaignsView')
    })

    it('lets an authenticated user in', async () => {
      asAuthenticated()

      await navigateTo('/campaigns')

      expect(router.currentRoute.value.name).toBe('CampaignsView')
    })
  })

  describe('routes that require an account', () => {
    let removeRoute

    beforeEach(() => {
      removeRoute = router.addRoute({
        path: '/guarded',
        name: 'guarded',
        component: { template: '<div />' },
        meta: { requiresAuth: true },
      })
    })

    afterEach(async () => {
      await navigateTo('/')
      removeRoute()
    })

    it('sends an anonymous visitor to the login page', async () => {
      await navigateTo('/guarded')

      expect(router.currentRoute.value.name).toBe('login')
    })

    it('sends a guest home, because a guest is not a registered account', async () => {
      asGuest()

      await navigateTo('/guarded')

      expect(router.currentRoute.value.name).toBe('home')
    })

    it('lets an authenticated user in', async () => {
      asAuthenticated()

      await navigateTo('/guarded')

      expect(router.currentRoute.value.name).toBe('guarded')
    })
  })

  describe('the login page', () => {
    it('redirects an authenticated user home', async () => {
      asAuthenticated()

      await navigateTo('/login')

      expect(router.currentRoute.value.name).toBe('home')
    })

    it('stays open for an anonymous visitor', async () => {
      await navigateTo('/login')

      expect(router.currentRoute.value.name).toBe('login')
    })

    it('stays open for a guest, who is not signed in', async () => {
      asGuest()

      await navigateTo('/login')

      expect(router.currentRoute.value.name).toBe('login')
    })
  })

  describe('the first navigation of a page load', () => {
    it('discovers an existing guest session before deciding', async () => {
      localStorage.setItem('guest_user', JSON.stringify(GUEST_USER))
      authStore.isAuthChecked = false

      await navigateTo('/campaigns')

      // Reachable only because the guard awaited initializeAuth() first: without
      // it the visitor would still look anonymous and land on the login page.
      expect(router.currentRoute.value.name).toBe('CampaignsView')
      expect(authStore.isGuest).toBe(true)
    })

    it('settles an anonymous visitor on the login page', async () => {
      authStore.isAuthChecked = false

      await navigateTo('/campaigns')

      expect(router.currentRoute.value.name).toBe('login')
      expect(authStore.isAuthChecked).toBe(true)
    })
  })
})
