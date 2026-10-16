<script setup>
/**
 * Presentational section list for a contextual sidebar.
 *
 * Renders the section buttons shared by every `ContextSidebar` so the markup is
 * defined once and used by both the desktop rail and the mobile slide-over
 * drawer. Props in, events out — no store access (see ARCHITECTURE.md
 * smart/dumb conventions).
 */
import BaseIcon from '@/components/base/BaseIcon.vue'

const props = defineProps({
  /** Navigation items: `{ key: string, label: string, icon: string }`. */
  items: {
    type: Array,
    required: true,
  },
  /** Key of the currently active section. */
  activeSection: {
    type: String,
    required: true,
  },
  /** Accessible name for the nav landmark, e.g. "Campaign sections". */
  label: {
    type: String,
    default: 'Sections',
  },
})

defineEmits(['select'])

const isActive = (key) => key === props.activeSection
</script>

<template>
  <nav class="context-nav-list" :aria-label="label">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="context-nav-item"
      :class="{ 'context-nav-item--active': isActive(item.key) }"
      :aria-current="isActive(item.key) ? 'page' : undefined"
      :title="item.label"
      @click="$emit('select', item.key)"
    >
      <BaseIcon :name="item.icon" class="context-nav-icon" />
      <span class="context-nav-item-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped></style>