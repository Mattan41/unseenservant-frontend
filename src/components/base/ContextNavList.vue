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
  /**
   * Navigation items: `{ key: string, label: string, icon: string, badge?: number,
   * dot?: boolean }`.
   *
   * `badge` is a count — the only counted signal today is a section's unread
   * messages — and `dot` marks a section that changed without a countable signal
   * (the world lore, the ship). Both are optional and both mean "changed since
   * you last opened this section" (see `features/campaign/campaignActivity.js`);
   * a caller that has nothing to report — the settings shell, for one — passes
   * neither and renders exactly as before.
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
  /** Accessible name for the nav landmark, e.g. "Campaign sections". */
  label: {
    type: String,
    default: 'Sections',
  },
})

defineEmits(['select'])

const isActive = (key) => key === props.activeSection

/** The most a badge shows, so a long-running campaign cannot widen the rail. */
const BADGE_DISPLAY_CAP = 99

/** Whether an item wears a badge at all (a count of 0 is not a badge). */
const hasBadge = (item) => Boolean(item.badge) || Boolean(item.dot)

/** The number a badge shows — capped, like the "99+" this pattern always uses. */
function badgeText(count) {
  return count > BADGE_DISPLAY_CAP ? `${BADGE_DISPLAY_CAP}+` : String(count)
}

/**
 * What a badge means, in words. A bare number or a dot says nothing to a screen
 * reader, so a badged button is named by its label plus the badge's meaning
 * rather than by its visible text alone.
 */
function badgeLabel(item) {
  return item.badge
    ? `${item.label} — ${item.badge} unread`
    : `${item.label} — changed since you last opened it`
}
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
      :aria-label="hasBadge(item) ? badgeLabel(item) : undefined"
      :title="item.label"
      @click="$emit('select', item.key)"
    >
      <BaseIcon :name="item.icon" class="context-nav-icon" />
      <span class="context-nav-item-label">{{ item.label }}</span>
      <!-- One marker, two readings: a count when there is one to count, a dot
           when all that can be said is that something changed. Both sit after
           the label and are pushed right by the class, so a long label that
           wraps cannot collide with them. -->
      <span v-if="item.badge" class="context-nav-badge">{{ badgeText(item.badge) }}</span>
      <span
        v-else-if="item.dot"
        class="context-nav-badge context-nav-badge--dot"
        aria-hidden="true"
      ></span>
    </button>
  </nav>
</template>
