<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

onMounted(async () => {
  const routeToken = route.query.token
  if (routeToken) {
    // Read the token, then take it out of the address bar before doing anything
    // that can fail: the error path below pushes to /login, which would leave
    // /oauth-redirect?token=... in the browser's history. See
    // docs/DEPLOYMENT.md#the-access-log for the server-side half of this.
    await router.replace({ name: 'oauth-redirect' })

    try {
      // Clear guest mode if user was previously a guest
      if (authStore.isGuest) {
        authStore.exitGuestMode()
      }

      authStore.handleOAuthRedirect(routeToken)

      await userStore.fetchCurrentUser()

      notificationStore.addNotification('Successfully logged in!', 'success')
      await router.replace({ name: 'home' })
    } catch (error) {
      console.error('OAuthRedirect Error:', error)
      notificationStore.addNotification('Failed to fetch user data.', 'error')
      await router.push({ name: 'login' })
    }
  } else {
    notificationStore.addNotification('No token received.', 'error')
    await router.push({ name: 'login' })
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <div class="text-center">
      <div class="mb-4 text-lg font-semibold" style="color: var(--color-primary-600)">
        Completing login...
      </div>
      <div class="spinner w-12 h-12 border-4"></div>
    </div>
  </div>
</template>
