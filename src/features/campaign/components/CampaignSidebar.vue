<script setup>
/**
 * Campaign navigation — desktop rail + mobile slide-over drawer.
 *
 * Desktop (md+) renders a static labelled rail; below md the same list is
 * exposed through the shared `SlideOverDrawer`, controlled by the `open` prop so
 * the trigger can live in the smart parent (near the campaign title).
 * Presentational: props in, events out.
 */
import CampaignNavList from '@/features/campaign/components/CampaignNavList.vue'
import SlideOverDrawer from '@/components/base/SlideOverDrawer.vue'

defineProps({
  /** Contextual navigation items: `{ key, label, icon }`. */
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
  /** Whether the mobile slide-over drawer is open (use with `v-model`). */
  open: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select', 'update:open'])

function selectFromDrawer(key) {
  emit('select', key)
  emit('update:open', false)
}
</script>

<template>
  <!-- Desktop rail (md+) -->
  <aside class="campaign-sidebar campaign-gradient" :data-campaign-id="campaignId">
    <CampaignNavList
      :items="items"
      :active-section="activeSection"
      @select="$emit('select', $event)"
    />
  </aside>

  <!-- Mobile slide-over drawer (below md) -->
  <SlideOverDrawer
    :model-value="open"
    side="left"
    label="Campaign navigation"
    panel-class="campaign-gradient"
    @update:model-value="$emit('update:open', $event)"
  >
    <CampaignNavList :items="items" :active-section="activeSection" @select="selectFromDrawer" />
  </SlideOverDrawer>
</template>

<style scoped></style>
