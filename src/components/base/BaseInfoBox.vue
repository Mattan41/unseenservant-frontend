<script setup>
/**
 * Inset callout with a semantic tone.
 *
 * The inline counterpart to the fixed banners (`.guest-notice`, `.env-banner`):
 * an optional short `title`, an optional leading tone icon and slot content.
 * Colours come from the `.info-box--{tone}` modifiers in `main.css`, so the tone
 * is a prop instead of per-call-site palette utilities.
 *
 * The component has no outer spacing, so layout stays at the call site:
 * `<BaseInfoBox class="mb-4" … />` composes with any grid or stack.
 *
 * Usage:
 *   <BaseInfoBox variant="warning" title="Private">Only the GM can see this.</BaseInfoBox>
 *   <BaseInfoBox :icon="false">Plain tinted box, no glyph.</BaseInfoBox>
 */
import { computed } from 'vue'
import BaseIcon from '@/components/base/BaseIcon.vue'

const props = defineProps({
  /** Tone: `info` | `success` | `warning` | `danger` → `.info-box--{tone}`. */
  variant: {
    type: String,
    default: 'info',
  },
  /** Optional short heading rendered above the slot content. */
  title: {
    type: String,
    default: '',
  },
  /**
   * Leading glyph: `true` (default) picks by tone, a `BaseIcon` name overrides
   * it, and `false` renders no icon.
   */
  icon: {
    type: [Boolean, String],
    default: true,
  },
})

// Info/success explain, warning/danger warn — so the glyph follows the tone.
const TONE_ICONS = { info: 'info', success: 'info', warning: 'alert', danger: 'alert' }

const iconName = computed(() => {
  if (props.icon === false) return ''
  if (typeof props.icon === 'string') return props.icon
  return TONE_ICONS[props.variant] || 'info'
})
</script>

<template>
  <div class="info-box" :class="`info-box--${variant}`">
    <BaseIcon v-if="iconName" :name="iconName" class="info-box-icon" />
    <div class="min-w-0 flex-1">
      <div v-if="title" class="info-box-title">{{ title }}</div>
      <slot />
    </div>
  </div>
</template>
