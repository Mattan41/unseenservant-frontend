<script setup>
/**
 * Generic horizontal carousel — a scroll-snapping strip with optional
 * previous/next controls.
 *
 * Presentational: it owns nothing but the scroll position, renders whatever the
 * `item` slot produces once per entry of `items`, and has no store access (see
 * ARCHITECTURE.MD → Component conventions). Card widths are the caller's: the
 * wrapper is `.base-carousel-item` (`w-64`), and `itemClass` overrides it.
 *
 * The strip scrolls natively, so dragging, a trackpad and the keyboard (tabbing
 * into a card scrolls it into view) all work without extra roles. The controls
 * render only while the strip actually overflows, so a list that already fits
 * is not given two dead buttons.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import IconButton from '@/components/base/IconButton.vue'

const props = defineProps({
  /** The entries to render — one `item` slot each. */
  items: {
    type: Array,
    required: true,
  },
  /** Accessible name of the strip (the list's `aria-label`). */
  label: {
    type: String,
    default: 'Carousel',
  },
  /** Whether to offer the previous/next controls at all. */
  controls: {
    type: Boolean,
    default: true,
  },
  /** Extra classes per item wrapper (width overrides, spacing). */
  itemClass: {
    type: String,
    default: '',
  },
})

const track = ref(null)
const atStart = ref(true)
const atEnd = ref(true)
const hasOverflow = ref(false)

const showControls = computed(() => props.controls && hasOverflow.value)

/** Keep the edge flags (and with them the controls) in step with the strip. */
function updateEdges() {
  const el = track.value
  if (!el) return

  const maxScroll = el.scrollWidth - el.clientWidth
  hasOverflow.value = maxScroll > 1
  atStart.value = el.scrollLeft <= 0
  atEnd.value = el.scrollLeft >= maxScroll - 1
}

/** One card's width, so a control press moves a whole card rather than a nudge. */
function scrollStep() {
  const el = track.value
  if (!el) return 0

  const firstItem = el.firstElementChild
  return firstItem ? firstItem.getBoundingClientRect().width : el.clientWidth
}

function step(direction) {
  track.value?.scrollBy({ left: direction * scrollStep(), behavior: 'smooth' })
}

onMounted(() => {
  updateEdges()
  track.value?.addEventListener('scroll', updateEdges, { passive: true })
  // Without an observer: whether the strip overflows also changes with the
  // viewport, and that is the only other thing that moves its width.
  window.addEventListener('resize', updateEdges)
})

onBeforeUnmount(() => {
  track.value?.removeEventListener('scroll', updateEdges)
  window.removeEventListener('resize', updateEdges)
})

// A list that grows after mount (a fetch resolving) or shrinks changes whether
// there is anything to scroll.
watch(() => props.items, updateEdges, { flush: 'post' })
</script>

<template>
  <div class="base-carousel">
    <IconButton
      v-if="showControls"
      icon="chevron-left"
      :label="`Previous ${label}`"
      class="base-carousel-control"
      :disabled="atStart"
      @click="step(-1)"
    />

    <ul ref="track" class="base-carousel-track" :aria-label="label">
      <li
        v-for="(item, index) in items"
        :key="item?.id ?? index"
        class="base-carousel-item"
        :class="itemClass"
      >
        <slot name="item" :item="item" :index="index"></slot>
      </li>
    </ul>

    <IconButton
      v-if="showControls"
      icon="chevron-right"
      :label="`Next ${label}`"
      class="base-carousel-control"
      :disabled="atEnd"
      @click="step(1)"
    />
  </div>
</template>
