<script setup>
import CampaignNavIcon from '@/features/campaign/components/CampaignNavIcon.vue'

const props = defineProps({
  /**
   * Contextual navigation items for the active campaign.
   * Each item: `{ key: string, label: string, icon: string }`.
   * Built by the smart parent (CampaignView) so role logic stays out of this
   * presentational component.
   */
  items: {
    type: Array,
    required: true,
  },
  /** Key of the currently active section. */
  activeSection: {
    type: String,
    required: true,
  },
  /** Identifier of the campaign this sidebar belongs to. */
  campaignId: {
    type: [Number, String],
    required: true,
  },
  /** Whether the current user may edit campaign details (owner only). */
  canEdit: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['select', 'edit'])

const isActive = (key) => key === props.activeSection
</script>

<template>
  <aside class="campaign-sidebar custom-gradient" :data-campaign-id="campaignId">
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
        <span class="campaign-sidebar-tooltip" role="tooltip">{{ item.label }}</span>
        <span class="sr-only">{{ item.label }}</span>
      </button>
    </nav>

    <!-- Owner-only campaign action, pinned to the bottom on desktop -->
    <div v-if="canEdit" class="campaign-sidebar-actions">
      <button
        type="button"
        class="campaign-sidebar-action"
        title="Edit Campaign"
        @click="$emit('edit')"
      >
        <CampaignNavIcon name="edit" class="campaign-sidebar-icon" />
        <span class="campaign-sidebar-item-label">Edit Campaign</span>
        <span class="campaign-sidebar-tooltip" role="tooltip">Edit Campaign</span>
        <span class="sr-only">Edit Campaign</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.custom-gradient {
  background: linear-gradient(to right, var(--color-primary-100) 0%, var(--color-primary-300) 100%);
}

@media screen and (min-width: 768px) {
  .custom-gradient {
    background: linear-gradient(
      to bottom,
      var(--color-primary-100) 0%,
      var(--color-primary-300) 50%,
      var(--color-primary-100) 100%
    );
  }
}
</style>
