<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'

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
    error.value = err.response?.status === 401
      ? 'Invalid username or password'
      : 'Login failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
    <div class="flex flex-col items-center mb-8">
      <img src="@/assets/logo.svg" alt="Hat Man" class="w-16 h-16 mb-3 object-contain" />
      <div class="text-center pb-4 mb-6 border-b border-gray-100 flex flex-col items-center">
        <h2 class="text-xl font-bold text-gray-700 tracking-wide uppercase">Demo Login</h2>
        <p class="text-xs text-gray-500 mt-2 max-w-xs normal-case italic font-normal">
          Log in with a demo account to test the app
        </p>
      </div>
      <p class="text-xs text-gray-400 mt-1 font-medium tracking-wider uppercase">Sign in</p>
    </div>

    <!-- Error Message -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm"
    >
      {{ error }}
    </div>

    <form @submit.prevent="handleSubmit" class="flex flex-col items-center gap-4">
      <div class="w-64">
        <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
          Username
        </label>
        <input
          id="username"
          v-model="username"
          type="text"
          placeholder="e.g., User1 or admin"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          :disabled="isLoading"
        />
      </div>

      <div class="w-64">
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="password"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          :disabled="isLoading"
        />
      </div>

      <button
        type="submit"
        :disabled="isLoading"
        class="w-64 h-10 px-3 flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white font-medium rounded transition duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="isLoading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span v-else>Login</span>
      </button>
    </form>

    <div class="mt-6 text-center">
      <p class="text-xs text-gray-400 font-medium tracking-wider uppercase mb-2">Demo Accounts</p>
      <p class="text-xs text-gray-500">
        Users: <span class="font-mono">User1</span> - <span class="font-mono">User5</span>
      </p>
      <p class="text-xs text-gray-500">
        Admin: <span class="font-mono">admin</span>
      </p>
      <p class="text-xs text-gray-400 mt-1">
        All passwords: <span class="font-mono">password</span>
      </p>
    </div>
  </div>
</template>
