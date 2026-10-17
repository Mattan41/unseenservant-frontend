<script setup>
/**
 * General settings — application-wide preferences, not tied to the account or to
 * a campaign.
 *
 * The colour theme and mode are client-side preferences (`utils/environment.js`
 * reads and writes `localStorage.theme` / `localStorage.mode`); there is no
 * backend field for them yet, so this section takes no props and emits nothing.
 *
 * Presentational: the theme/mode state comes from the `theme` / `mode` refs in
 * `utils/environment.js` (module state, not a store), and the environment label
 * is a build-time constant.
 */
import {
  AVAILABLE_MODES,
  AVAILABLE_THEMES,
  ENVIRONMENT_LABEL,
  mode,
  resolvedMode,
  setMode,
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

    <!-- Colour Mode -->
    <BaseCard>
      <h3 class="section-heading mb-2">Colour Mode</h3>
      <p class="text-sm text-muted mb-3">
        Light or dark surfaces. <strong>System</strong> follows your operating system and switches
        automatically; the other options override it for this browser.
      </p>

      <div class="flex flex-wrap gap-2" role="group" aria-label="Colour mode">
        <BaseButton
          v-for="option in AVAILABLE_MODES"
          :key="option.id"
          :variant="mode === option.id ? 'default' : 'ghost'"
          :aria-pressed="mode === option.id"
          @click="setMode(option.id)"
        >
          {{ option.label }}
        </BaseButton>
      </div>

      <p v-if="mode === 'system'" class="text-sm text-muted mt-2">
        Currently following your system:
        <strong>{{ resolvedMode === 'dark' ? 'Dark' : 'Light' }}</strong>.
      </p>
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