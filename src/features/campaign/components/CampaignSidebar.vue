<script setup>
/**
 * Campaign navigation — thin wrapper over the shared `ContextSidebar`.
 *
 * The shell itself (desktop rail + mobile slide-over drawer) is shared with the
 * settings view; this component only names it for the campaign context, so
 * `CampaignView` keeps a semantic entry point and the campaign id is exposed as
 * the shared `data-context-id` test hook.
 */
import ContextSidebar from '@/components/base/ContextSidebar.vue'

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

defineEmits(['select', 'update:open'])
</script>

<template>
  <ContextSidebar
    :items="items"
    :active-section="activeSection"
    :context-id="campaignId"
    label="Campaign navigation"
    :open="open"
    @select="$emit('select', $event)"
    @update:open="$emit('update:open', $event)"
  />
</template>
