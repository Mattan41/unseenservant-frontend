<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="header-footer-bg p-4 text-center">
    <p class="text-xs uppercase italic font-bold">Unseen Servant</p>
    <p class="text-sm mt-2">© {{ new Date().getFullYear() }} Hat Man Studio</p>
    <nav class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm mt-2">
      <RouterLink to="/privacy" class="element-link">Privacy Policy</RouterLink>
      <span aria-hidden="true">·</span>
      <RouterLink to="/terms" class="element-link">Terms of Service</RouterLink>
    </nav>
  </footer>
</template>
