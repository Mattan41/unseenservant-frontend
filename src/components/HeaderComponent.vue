<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/authStore.js'
import IconButton from '@/components/base/IconButton.vue'
import SlideOverDrawer from '@/components/base/SlideOverDrawer.vue'

const authStore = useAuthStore()
const router = useRouter()

// Global navigation overlay (mobile only). The desktop nav stays inline.
const mobileMenuOpen = ref(false)

const toggleMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const closeMenu = () => {
  mobileMenuOpen.value = false
}

const exitGuestMode = () => {
  authStore.exitGuestMode()
  router.push('/')
}
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
      <!-- Mobile bar: logo + icon-only menu toggle -->
      <div class="flex md:hidden justify-between items-center">
        <RouterLink @click="closeMenu" to="/" class="block">
          <h5 class="uppercase header-logo-hover">Unseen Servant</h5>
        </RouterLink>
        <IconButton
          :icon="mobileMenuOpen ? 'close' : 'menu'"
          :label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
          variant="plain"
          @click="toggleMenu"
        />
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

    <!-- Global navigation overlay (full-screen, mobile) -->
    <SlideOverDrawer
      :model-value="mobileMenuOpen"
      side="right"
      full
      label="Main menu"
      panel-class="header-footer-bg"
      @update:model-value="mobileMenuOpen = $event"
    >
      <div class="app-menu">
        <div class="app-menu-header">
          <h5 class="uppercase header-logo-hover">Unseen Servant</h5>
          <IconButton icon="close" label="Close menu" variant="plain" @click="closeMenu" />
        </div>

        <nav class="app-menu-links">
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
        </nav>
      </div>
    </SlideOverDrawer>
  </header>
</template>
