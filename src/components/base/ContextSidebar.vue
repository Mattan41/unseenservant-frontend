<script setup>
/**
 * Contextual navigation — desktop rail + mobile slide-over drawer.
 *
 * Desktop (md+) renders a static labelled rail; below md the same list is
 * exposed through the shared `SlideOverDrawer`, controlled by the `open` prop so
 * the trigger can live in the smart parent (the mobile top bar).
 *
 * Shared by the campaign shell and the settings shell; the caller owns the
 * section keys, the labels and the routing. Presentational: props in, events
 * out.
 */
import ContextNavList from '@/components/base/ContextNavList.vue'
import SlideOverDrawer from '@/components/base/SlideOverDrawer.vue'

defineProps({
  /** Navigation items: `{ key, label, icon }`. */
  items: {
    type: Array,
    required: true,
  },
  /** Key of the currently active section. */
  activeSection: {
    type: String,
    required: true,
  },
  /** Accessible name for the nav landmark and the mobile drawer. */
  label: {
    type: String,
    default: 'Sections',
  },
  /** Optional identifier rendered as `data-context-id` (a stable test hook). */
  contextId: {
    type: [Number, String],
    default: null,
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
  <aside class="context-sidebar context-gradient" :data-context-id="contextId">
    <ContextNavList
      :items="items"
      :active-section="activeSection"
      :label="label"
      @select="$emit('select', $event)"
    />
  </aside>

  <!-- Mobile slide-over drawer (below md) -->
  <SlideOverDrawer
    :model-value="open"
    side="left"
    :label="label"
    panel-class="context-gradient"
    @update:model-value="$emit('update:open', $event)"
  >
    <ContextNavList
      :items="items"
      :active-section="activeSection"
      :label="label"
      @select="selectFromDrawer"
    />
  </SlideOverDrawer>
</template>
