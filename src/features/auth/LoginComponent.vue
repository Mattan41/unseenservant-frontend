<script setup>
import { useAuthStore } from '@/features/auth/authStore.js'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const handleGoogleLogin = async () => {
  try {
    await authStore.loginWithGoogle()
  } catch (error) {
    console.error('Google login failed', error)
  }
}

const handleGithubLogin = async () => {
  try {
    await authStore.loginWithGithub()
  } catch (error) {
    console.error('GitHub login failed', error)
  }
}

const handleGuestMode = () => {
  authStore.enterGuestMode()
  router.push('/')
}
</script>

<template>
  <div class="login max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
    <div class="flex flex-col items-center mb-8">
      <img src="@/assets/logo.svg" alt="Hat Man" class="w-16 h-16 mb-3 object-contain" />
      <div class="text-center pb-4 mb-6 border-b border-gray-100 flex flex-col items-center">
        <h2 class="text-xl font-bold text-gray-700 tracking-wide uppercase">Login</h2>
        <p class="text-xs text-gray-500 mt-2 max-w-xs normal-case italic font-normal">
          Log in is currently restricted to selected test users. Use the demo login below to test
          the app
        </p>
      </div>
      <p class="text-xs text-gray-400 mt-1 font-medium tracking-wider uppercase">Sign in</p>
    </div>

    <div class="flex flex-col items-center gap-4">
      <!-- Google Sign-in Button -->
      <button
        @click.prevent="handleGoogleLogin"
        class="w-64 h-10 px-3 flex items-center justify-center bg-white border border-gray-300 rounded text-sm text-gray-800 font-medium relative transition duration-200 hover:shadow-md hover:border-blue-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      >
        <div class="flex items-center justify-center">
          <div class="w-5 h-5 mr-3 flex-shrink-0">
            <img src="@/assets/google.svg" alt="Google logo" class="w-full h-full" />
          </div>
          <span class="font-medium">Sign in with Google</span>
        </div>
      </button>

      <!-- GitHub Sign-in Button -->
      <button
        @click.prevent="handleGithubLogin"
        class="w-64 h-10 px-3 flex items-center justify-center bg-gray-900 rounded text-sm text-white font-medium relative transition duration-200 hover:bg-gray-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-600"
      >
        <div class="flex items-center justify-center">
          <div class="w-5 h-5 mr-3 shrink-0">
            <img src="@/assets/github.svg" alt="GitHub logo" class="w-full h-full filter invert" />
          </div>
          <span class="font-medium">Sign in with GitHub</span>
        </div>
      </button>
      <p class="text-xs text-gray-400 mt-1 font-medium tracking-wider uppercase">
        Or try app in demo mode
      </p>
      <!-- Guest Mode Button -->
      <button
        @click.prevent="handleGuestMode"
        class="w-64 h-10 px-3 flex items-center justify-center bg-yellow-100 border border-yellow-400 rounded text-sm text-yellow-800 font-medium relative transition duration-200 hover:bg-yellow-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-300"
      >
        <span class="font-medium">Demo mode</span>
      </button>
    </div>
  </div>
</template>
