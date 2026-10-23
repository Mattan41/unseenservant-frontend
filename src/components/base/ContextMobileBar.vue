<script setup>
/**
 * Mobile contextual top bar: the section-drawer trigger plus the current
 * context's title. Replaced by the `ContextSidebar` rail at md+
 * (`.context-mobile-bar` is `md:hidden`). Presentational.
 */
import BaseButton from '@/components/base/BaseButton.vue'
import BaseIcon from '@/components/base/BaseIcon.vue'

defineProps({
  /** Title shown on the right, e.g. the campaign's name or "Settings". */
  title: {
    type: String,
    required: true,
  },
  /** Trigger label, e.g. "Campaign Menu" or "Settings Menu". */
  triggerLabel: {
    type: String,
    default: 'Sections',
  },
})

defineEmits(['open'])
</script>

<template>
  <div class="context-mobile-bar">
    <BaseButton variant="default" class="context-nav-trigger" @click="$emit('open')">
      <BaseIcon name="menu" class="context-nav-icon" />
      <span>{{ triggerLabel }}</span>
    </BaseButton>
    <h2 class="context-mobile-title">{{ title }}</h2>
  </div>
</template>
