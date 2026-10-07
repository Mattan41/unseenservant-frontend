<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
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

const emit = defineEmits(['select', 'edit'])

const isActive = (key) => key === props.activeSection

// Mobile navigation lives in an off-canvas drawer that slides in from the left.
// On desktop (md+) the sidebar is an always-visible static rail and this flag is
// irrelevant because the drawer positioning is overridden by media queries.
const mobileOpen = ref(false)

function openMobileNav() {
  mobileOpen.value = true
}

function closeMobileNav() {
  mobileOpen.value = false
}

function selectItem(key) {
  emit('select', key)
  closeMobileNav()
}

function handleEdit() {
  emit('edit')
  closeMobileNav()
}

function handleKeydown(event) {
  if (event.key === 'Escape') closeMobileNav()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <!-- Mobile-only trigger bar (hamburger + Menu) at the top-left of content -->
  <div class="campaign-sidebar-trigger-bar">
    <button
      type="button"
      class="campaign-sidebar-trigger"
      aria-controls="campaign-sidebar-panel"
      :aria-expanded="mobileOpen"
      @click="openMobileNav"
    >
      <CampaignNavIcon name="menu" class="campaign-sidebar-icon" />
      <span>Campaign menu</span>
    </button>
  </div>

  <!-- Mobile-only dimming backdrop behind the drawer -->
  <Transition name="campaign-sidebar-fade">
    <div v-if="mobileOpen" class="campaign-sidebar-backdrop" @click="closeMobileNav"></div>
  </Transition>

  <!-- Off-canvas drawer below md, static labeled rail at md+ -->
  <aside
    id="campaign-sidebar-panel"
    class="campaign-sidebar custom-gradient"
    :class="mobileOpen ? 'campaign-sidebar--open' : 'campaign-sidebar--closed'"
    :data-campaign-id="campaignId"
  >
    <nav class="campaign-sidebar-nav" aria-label="Campaign sections">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="campaign-sidebar-item"
        :class="{ 'campaign-sidebar-item--active': isActive(item.key) }"
        :aria-current="isActive(item.key) ? 'page' : undefined"
        :title="item.label"
        @click="selectItem(item.key)"
      >
        <CampaignNavIcon :name="item.icon" class="campaign-sidebar-icon" />
        <span class="campaign-sidebar-item-label">{{ item.label }}</span>
      </button>
    </nav>

    <!-- Owner-only campaign action, pinned to the bottom -->
    <div v-if="canEdit" class="campaign-sidebar-actions">
      <button type="button" class="campaign-sidebar-action" title="Edit Campaign" @click="handleEdit">
        <CampaignNavIcon name="edit" class="campaign-sidebar-icon" />
        <span class="campaign-sidebar-item-label">Edit Campaign</span>
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

/* Backdrop fade transition for the mobile drawer */
.campaign-sidebar-fade-enter-active,
.campaign-sidebar-fade-leave-active {
  transition: opacity 0.2s ease;
}

.campaign-sidebar-fade-enter-from,
.campaign-sidebar-fade-leave-to {
  opacity: 0;
}
</style>
