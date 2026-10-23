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
  <header class="header-footer-bg sticky top-0 z-40 border-b border-(--border-section)">
    <!-- Guest Mode Banner -->
    <div v-if="authStore.isGuest" class="guest-notice m-2 flex items-center justify-center gap-2">
      <span>You are in demo mode — changes will not be saved</span>
      <button @click="exitGuestMode" class="header-nav-link py-2">
        <span class="font-medium">Exit demo mode</span>
      </button>
    </div>

    <nav aria-label="Main">
      <!-- Mobile bar: brand + icon-only menu toggle -->
      <div class="flex items-center justify-between gap-2 px-3 py-2 md:hidden">
        <RouterLink @click="closeMenu" to="/" class="flex min-w-0 items-center gap-2">
          <img src="@/assets/logo.svg" alt="" class="brand-mark brand-mark--sm object-contain" />
          <h5 class="header-logo-hover truncate uppercase">Unseen Servant</h5>
        </RouterLink>
        <IconButton
          :icon="mobileMenuOpen ? 'close' : 'menu'"
          :label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
          variant="plain"
          @click="toggleMenu"
        />
      </div>

      <!-- Desktop bar: brand left, links in the middle, session action right.
           One row at every width, so the content below starts right under it. -->
      <div class="hidden items-center gap-3 px-4 py-2 md:flex">
        <RouterLink to="/" class="flex flex-shrink-0 items-center gap-2">
          <img src="@/assets/logo.svg" alt="" class="brand-mark brand-mark--sm object-contain" />
          <h5 class="header-logo-hover uppercase">Unseen Servant</h5>
        </RouterLink>

        <div class="flex flex-1 flex-wrap items-center gap-1">
          <RouterLink to="/" class="header-nav-link">
            <h5 class="p-2 uppercase">Home</h5>
          </RouterLink>
          <RouterLink to="/about" class="header-nav-link">
            <h5 class="p-2 uppercase">About</h5>
          </RouterLink>
          <RouterLink to="/spells" class="header-nav-link">
            <h5 class="p-2 uppercase">Spells</h5>
          </RouterLink>

          <!-- A session (account or Guest Demo) also owns characters and
               campaigns; Settings is open to everyone. -->
          <RouterLink
            v-if="authStore.isAuthenticated || authStore.isGuest"
            to="/characters"
            class="header-nav-link"
          >
            <h5 class="p-2 uppercase">Characters</h5>
          </RouterLink>
          <RouterLink
            v-if="authStore.isAuthenticated || authStore.isGuest"
            to="/campaigns"
            class="header-nav-link"
          >
            <h5 class="p-2 uppercase">Campaigns</h5>
          </RouterLink>
          <RouterLink to="/settings" class="header-nav-link">
            <h5 class="p-2 uppercase">Settings</h5>
          </RouterLink>
        </div>

        <div class="flex flex-shrink-0 items-center gap-2">
          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/logout"
            class="header-nav-link-secondary"
          >
            <h5 class="p-2 uppercase">Logout</h5>
          </RouterLink>
          <RouterLink v-else to="/login" class="header-nav-link-secondary">
            <h5 class="p-2 uppercase">Login</h5>
          </RouterLink>
        </div>
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
          <RouterLink @click="closeMenu" to="/" class="flex min-w-0 items-center gap-2">
            <img src="@/assets/logo.svg" alt="" class="brand-mark brand-mark--sm object-contain" />
            <h5 class="header-logo-hover truncate uppercase">Unseen Servant</h5>
          </RouterLink>
          <IconButton icon="close" label="Close menu" variant="plain" @click="closeMenu" />
        </div>

        <nav class="app-menu-links" aria-label="Main menu">
          <RouterLink @click="closeMenu" to="/" class="header-nav-link">
            <h5 class="p-2 uppercase">Home</h5>
          </RouterLink>
          <RouterLink @click="closeMenu" to="/about" class="header-nav-link">
            <h5 class="p-2 uppercase">About</h5>
          </RouterLink>
          <RouterLink @click="closeMenu" to="/spells" class="header-nav-link">
            <h5 class="p-2 uppercase">Spells</h5>
          </RouterLink>

          <!-- A session (account or Guest Demo) also owns characters and
               campaigns; Settings is open to everyone. -->
          <RouterLink
            v-if="authStore.isAuthenticated || authStore.isGuest"
            @click="closeMenu"
            to="/characters"
            class="header-nav-link"
          >
            <h5 class="p-2 uppercase">Characters</h5>
          </RouterLink>
          <RouterLink
            v-if="authStore.isAuthenticated || authStore.isGuest"
            @click="closeMenu"
            to="/campaigns"
            class="header-nav-link"
          >
            <h5 class="p-2 uppercase">Campaigns</h5>
          </RouterLink>
          <RouterLink @click="closeMenu" to="/settings" class="header-nav-link">
            <h5 class="p-2 uppercase">Settings</h5>
          </RouterLink>

          <RouterLink
            v-if="authStore.isAuthenticated"
            @click="closeMenu"
            to="/logout"
            class="header-nav-link-secondary"
          >
            <h5 class="p-2 uppercase">Logout</h5>
          </RouterLink>
          <RouterLink v-else @click="closeMenu" to="/login" class="header-nav-link-secondary">
            <h5 class="p-2 uppercase">Login</h5>
          </RouterLink>
        </nav>
      </div>
    </SlideOverDrawer>
  </header>
</template>
