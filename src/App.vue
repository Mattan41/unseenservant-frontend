<script setup>
import { RouterView } from 'vue-router'
import { watch } from 'vue'
import HeaderComponent from './components/HeaderComponent.vue'
import FooterComponent from './components/FooterComponent.vue'
import NotificationComponent from '@/components/NotificationComponent.vue'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useUserStore } from '@/features/user/userStore.js'

const authStore = useAuthStore()
const userStore = useUserStore()

watch(
  () => authStore.isAuthenticated,
  async (isAuth) => {
    if (isAuth) {
      await userStore.fetchCurrentUser()
    } else {
      userStore.clearUser()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div
    v-if="!authStore.isAuthChecked"
    class="flex flex-col items-center justify-center h-screen"
    style="background-color: var(--color-primary-100)"
  >
    <div
      class="spinner w-12 h-12 border-4"
    ></div>
    <p class="mt-4 font-medium" style="color: var(--color-primary-800)">Loading...</p>
  </div>

  <div v-else class="flex flex-col min-h-screen overflow-x-hidden">
    <NotificationComponent />
    <HeaderComponent />
    <main class="flex-grow" style="background-image: linear-gradient(to bottom, var(--color-primary-100), var(--color-primary-300), var(--color-primary-100))">
      <RouterView />
    </main>
    <FooterComponent />
  </div>
</template>
