<script setup>
/**
 * General settings — application-wide preferences, not tied to the account or to
 * a campaign.
 *
 * The colour theme is a client-side preference (`utils/environment.js` reads and
 * writes `localStorage.theme`); there is no backend field for it yet, so this
 * section takes no props and emits nothing.
 *
 * Presentational: the theme state comes from the `theme` ref in
 * `utils/environment.js` (module state, not a store), and the environment label
 * is a build-time constant.
 */
import {
  AVAILABLE_THEMES,
  ENVIRONMENT_LABEL,
  theme,
  setTheme,
} from '@/utils/environment.js'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseInfoBox from '@/components/base/BaseInfoBox.vue'
</script>

<template>
  <div class="space-y-6">
    <!-- Appearance -->
    <BaseCard>
      <h3 class="section-heading mb-2">Colour Theme</h3>
      <p class="text-sm text-muted mb-3">
        Choose the identity palette. Changes apply immediately and are remembered in this browser.
      </p>

      <div class="flex flex-wrap gap-2" role="group" aria-label="Colour theme">
        <BaseButton
          v-for="option in AVAILABLE_THEMES"
          :key="option.id"
          :variant="theme === option.id ? 'default' : 'ghost'"
          :aria-pressed="theme === option.id"
          @click="setTheme(option.id)"
        >
          {{ option.label }}
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Environment (read-only) -->
    <BaseCard>
      <h3 class="section-heading mb-2">Environment</h3>
      <dl class="stat-strip muted-surface px-3 py-2">
        <div class="stat">
          <dt class="stat-label">Environment</dt>
          <dd class="stat-value">{{ ENVIRONMENT_LABEL }}</dd>
        </div>
      </dl>

      <div class="mt-3">
        <BaseInfoBox variant="info">
          This is fixed when the application is built (<code>VITE_USER_NODE_ENV</code>) and cannot be
          changed from here. Guest Demo runs entirely in your browser, with no server involved.
        </BaseInfoBox>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped></style>