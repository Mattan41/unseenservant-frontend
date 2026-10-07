<script setup>
/**
 * Presentational campaign navigation list.
 *
 * Renders the section buttons plus the owner-only "Edit Campaign" action. It is
 * shared by `CampaignSidebar` so the markup is defined once and used by both the
 * desktop rail and the mobile slide-over drawer. Props in, events out — no
 * store access (see ARCHITECTURE.md smart/dumb conventions).
 */
import CampaignNavIcon from '@/features/campaign/components/CampaignNavIcon.vue'

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
})

defineEmits(['select'])

const isActive = (key) => key === props.activeSection
</script>

<template>
  <nav class="campaign-sidebar-nav" aria-label="Campaign sections">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="campaign-sidebar-item"
      :class="{ 'campaign-sidebar-item--active': isActive(item.key) }"
      :aria-current="isActive(item.key) ? 'page' : undefined"
      :title="item.label"
      @click="$emit('select', item.key)"
    >
      <CampaignNavIcon :name="item.icon" class="campaign-sidebar-icon" />
      <span class="campaign-sidebar-item-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped></style>
