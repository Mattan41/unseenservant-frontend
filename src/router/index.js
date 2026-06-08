import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginComponent from '@/features/auth/LoginComponent.vue'
import { useAuthStore } from '@/features/auth/authStore.js'

/**
 * @typedef {Object} RouteMeta
 * @property {boolean} [requiresAuth] - Whether the route strictly requires a real authenticated account
 * @property {boolean} [requiresSession] - Whether the route requires an active identity (Guest or Authenticated)
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: LoginComponent,
    },
    {
      path: '/logout',
      name: 'logout',
      component: () => import('@/features/auth/LogoutView.vue'),
    },
    {
      path: '/oauth-redirect',
      name: 'oauth-redirect',
      component: () => import('@/features/auth/OAuthRedirect.vue'),
    },
    {
      path: '/user-profile',
      name: 'user-profile',
      component: () => import('../features/user/UserProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaign/:id',
      name: 'CampaignView',
      component: () => import('@/features/campaign/views/CampaignView.vue'),
      props: true,
      meta: { requiresSession: true },
    },
    {
      path: '/campaigns',
      name: 'CampaignsView',
      component: () => import('../features/campaign/views/CampaignsView.vue'),
      meta: { requiresSession: true },
    },
    {
      path: '/spells',
      name: 'SpellSearch',
      component: () => import('@/features/spell/views/SpellSearchView.vue'),
    },
    {
      path: '/characters/create',
      name: 'CreateCharacter',
      component: () => import('@/features/character/components/CreateCharacter.vue'),
      meta: { requiresSession: true },
    },
    {
      path: '/characters/:id/edit',
      name: 'EditCharacter',
      component: () => import('@/features/character/components/EditCharacter.vue'),
      props: true,
      meta: { requiresSession: true },
    },
    {
      path: '/characters/:id',
      name: 'CharacterView',
      component: () => import('@/features/character/views/CharacterView.vue'),
      props: true,
      meta: { requiresSession: true },
    },
    {
      path: '/characters',
      name: 'CharactersView',
      component: () => import('@/features/character/views/CharactersView.vue'),
      meta: { requiresSession: true },
    },
    {
      path: '/under-construction',
      name: 'underConstructionView',
      component: () => import('@/views/UnderConstructionView.vue'),
    },
    {
      path: '/:catchAll(.*)*',
      name: 'notFound',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Ensure initialization check runs before testing state properties
  if (!authStore.isAuthChecked) {
    await authStore.initializeAuth()
  }

  const isAuthenticated = authStore.isAuthenticated
  const isGuest = authStore.isGuest
  const hasSession = isAuthenticated || isGuest

  // 1. Redirect already authenticated users away from the login page
  if (to.name === 'login' && isAuthenticated) {
    next({ name: 'home' })
    return
  }

  // 2. Route requires a registered account (requiresAuth), but user lacks it
  if (to.meta?.requiresAuth && !isAuthenticated) {
    // Send active guests to home page; send completely anonymous users to login
    next(isGuest ? { name: 'home' } : { name: 'login' })
    return
  }

  // 3. Route requires an active session (guest or auth), but user is completely anonymous
  if (to.meta?.requiresSession && !hasSession) {
    next({ name: 'login' })
    return
  }

  // 4. Proceed for public routes or when all session requirements are fully satisfied
  next()
})

export default router
