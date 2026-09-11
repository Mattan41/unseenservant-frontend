<script setup>
import { useAuthStore } from '../features/auth/authStore.js'
import { RouterLink, useRouter } from 'vue-router'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const authStore = useAuthStore()
const router = useRouter()
const mobileMenuOpen = ref(false)

const closeMenu = () => {
  mobileMenuOpen.value = false
}

const handleClickOutside = (event) => {
  const menu = document.querySelector('.mobile-menu')
  const button = event.target.closest('button')

  if (menu && !menu.contains(event.target) && !button) {
    closeMenu()
  }
}

const exitGuestMode = () => {
  authStore.exitGuestMode()
  router.push('/')
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <header class="header-footer-bg p-4 text-center">
    <!-- Guest Mode Banner -->
    <div v-if="authStore.isGuest" class="demo-notice mb-4 flex items-center justify-center gap-2">
      <span>You are in demo mode — changes will not be saved</span>
      <button @click="exitGuestMode" class="header-nav-link py-2">
        <span class="font-medium">Exit demo mode</span>
      </button>
    </div>

    <nav>
      <!-- Mobile menu -->
      <div class="flex md:hidden justify-between items-center">
        <RouterLink @click="closeMenu" to="/" class="block">
          <h5 class="uppercase header-logo-hover">Unseen Servant</h5>
        </RouterLink>
        <button @click.stop="mobileMenuOpen = !mobileMenuOpen" class="header-nav-link py-2">
          <span>Menu</span>
        </button>
      </div>

      <!-- Mobile menu dropdown -->
      <div
        v-if="mobileMenuOpen"
        class="mobile-menu md:hidden flex flex-col space-y-2 mt-2 transition-all duration-300"
      >
        <RouterLink @click="closeMenu" to="/" class="header-nav-link">
          <h5 class="p-2 uppercase">Home</h5>
        </RouterLink>
        <RouterLink @click="closeMenu" to="/about" class="header-nav-link">
          <h5 class="p-2 uppercase">About</h5>
        </RouterLink>
        <RouterLink @click="closeMenu" to="/spells" class="header-nav-link">
          <h5 class="p-2 uppercase">Spells</h5>
        </RouterLink>

        <template v-if="authStore.isAuthenticated">
          <RouterLink @click="closeMenu" to="/user-profile" class="header-nav-link">
            <h5 class="p-2 uppercase">User Profile</h5>
          </RouterLink>
          <RouterLink @click="closeMenu" to="/characters" class="header-nav-link">
            <h5 class="p-2 uppercase">Characters</h5>
          </RouterLink>
          <RouterLink @click="closeMenu" to="/campaigns" class="header-nav-link">
            <h5 class="p-2 uppercase">Campaigns</h5>
          </RouterLink>
          <RouterLink @click="closeMenu" to="/logout" class="header-nav-link-secondary">
            <h5 class="p-2 uppercase">Logout</h5>
          </RouterLink>
        </template>

        <template v-else-if="authStore.isGuest">
          <RouterLink @click="closeMenu" to="/characters" class="header-nav-link">
            <h5 class="p-2 uppercase">Characters</h5>
          </RouterLink>
          <RouterLink @click="closeMenu" to="/campaigns" class="header-nav-link">
            <h5 class="p-2 uppercase">Campaigns</h5>
          </RouterLink>
          <RouterLink @click="closeMenu" to="/login" class="header-nav-link-secondary">
            <h5 class="p-2 uppercase">Login</h5>
          </RouterLink>
        </template>

        <RouterLink v-else @click="closeMenu" to="/login" class="header-nav-link-secondary">
          <h5 class="p-2 uppercase">Login</h5>
        </RouterLink>
      </div>

      <!-- Desktop menu -->
      <div class="hidden md:flex md:flex-wrap justify-center items-center space-x-2">
        <RouterLink to="/" class="header-nav-link">
          <h5 class="p-2 uppercase">Home</h5>
        </RouterLink>
        <RouterLink to="/about" class="header-nav-link">
          <h5 class="p-2 uppercase">About</h5>
        </RouterLink>
        <RouterLink to="/spells" class="header-nav-link">
          <h5 class="p-2 uppercase">Spells</h5>
        </RouterLink>

        <template v-if="authStore.isAuthenticated">
          <RouterLink to="/user-profile" class="header-nav-link">
            <h5 class="p-2 uppercase">User Profile</h5>
          </RouterLink>
          <RouterLink to="/characters" class="header-nav-link">
            <h5 class="p-2 uppercase">Characters</h5>
          </RouterLink>
          <RouterLink to="/campaigns" class="header-nav-link">
            <h5 class="p-2 uppercase">Campaigns</h5>
          </RouterLink>
          <RouterLink to="/logout" class="header-nav-link-secondary">
            <h5 class="p-2 uppercase">Logout</h5>
          </RouterLink>
        </template>

        <template v-else-if="authStore.isGuest">
          <RouterLink to="/characters" class="header-nav-link">
            <h5 class="p-2 uppercase">Characters</h5>
          </RouterLink>
          <RouterLink @click="closeMenu" to="/campaigns" class="header-nav-link">
            <h5 class="p-2 uppercase">Campaigns</h5>
          </RouterLink>
          <RouterLink to="/login" class="header-nav-link-secondary">
            <h5 class="p-2 uppercase">Login</h5>
          </RouterLink>
        </template>

        <RouterLink v-else to="/login" class="header-nav-link-secondary">
          <h5 class="p-2 uppercase">Login</h5>
        </RouterLink>
      </div>
    </nav>
  </header>
</template>
