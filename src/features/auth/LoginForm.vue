<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const username = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const handleSubmit = async () => {
  if (!username.value || !password.value) {
    error.value = 'Please enter both username and password'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await authStore.login(username.value, password.value)
    notificationStore.addNotification('Successfully logged in!', 'success')
    router.push({ name: 'home' })
  } catch (err) {
    console.error('Demo login failed:', err)
    error.value =
      err.response?.status === 401
        ? 'Invalid username or password'
        : 'Login failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login max-w-md mx-auto mt-10 p-6 bg-[var(--color-surface)] rounded-lg shadow-md">
    <div class="flex flex-col items-center mb-8">
      <img src="@/assets/logo.svg" alt="Hat Man" class="w-16 h-16 mb-3 object-contain" />
      <div class="text-center pb-4 mb-6 border-b border-subtle flex flex-col items-center">
        <h2 class="text-xl font-bold text-default tracking-wide uppercase">Demo Login</h2>
        <p class="text-xs text-muted mt-2 max-w-xs normal-case italic font-normal">
          Log in with a demo account to test the app
        </p>
      </div>
      <p class="text-xs text-subtle mt-1 font-medium tracking-wider uppercase">Sign in</p>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message mb-4 text-sm">
      {{ error }}
    </div>

    <form @submit.prevent="handleSubmit" class="flex flex-col items-center gap-4">
      <div class="w-64">
        <label for="username" class="block text-sm font-medium text-default mb-1"> Username </label>
        <input
          id="username"
          v-model="username"
          type="text"
          placeholder="e.g., User1 or admin"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
          :disabled="isLoading"
        />
      </div>

      <div class="w-64">
        <label for="password" class="block text-sm font-medium text-default mb-1"> Password </label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="password"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
          :disabled="isLoading"
        />
      </div>

      <BaseButton variant="form" type="submit" class="w-64 h-10 px-3" :disabled="isLoading">
        <span
          v-if="isLoading"
          class="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        ></span>
        <span v-else>Login</span>
      </BaseButton>
    </form>

    <div class="mt-6 text-center">
      <p class="text-xs text-subtle font-medium tracking-wider uppercase mb-2">Demo Accounts</p>
      <p class="text-xs text-muted">
        Users: <span class="font-mono">User1</span> - <span class="font-mono">User5</span>
      </p>
      <p class="text-xs text-muted">Admin: <span class="font-mono">admin</span></p>
      <p class="text-xs text-subtle mt-1">All passwords: <span class="font-mono">password</span></p>
    </div>
  </div>
</template>
