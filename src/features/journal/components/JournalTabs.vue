<script setup>
/**
 * The journal's view switcher: the campaign journal and one tab per character
 * the participant owns. Presentational — props in, one event out; the caller
 * owns which tab is active and what each tab shows.
 *
 * A real ARIA tablist (`role="tablist"` / `role="tab"`), so the tabs are a single
 * stop in the tab order and Left/Right/Home/End move between them (the roving
 * tabindex keeps a tabbable tab on screen). Each tab names the panel it controls;
 * the caller renders that panel with a matching id and `role="tabpanel"`.
 */
import { nextTick, ref } from 'vue'

const props = defineProps({
  /** `[{ key, label }]`, in display order. */
  tabs: {
    type: Array,
    required: true,
  },
  /** The key of the tab on screen. */
  activeKey: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['select'])

const tabRefs = ref([])

/** Function ref: a `ref` inside `v-for` would collect into an array. */
function setTabRef(element, index) {
  tabRefs.value[index] = element
}

function select(key) {
  if (key !== props.activeKey) emit('select', key)
}

/**
 * Arrow keys (and Home/End) move between tabs, selecting as they go — the
 * pattern a tablist is expected to follow. Focus follows the selection, so the
 * roving tabindex never strands focus on a tab that is no longer shown.
 */
function onKeydown(event, index) {
  const last = props.tabs.length - 1
  let next = null

  if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
  else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = last
  if (next === null) return

  event.preventDefault()
  select(props.tabs[next].key)
  nextTick(() => tabRefs.value[next]?.focus())
}
</script>

<template>
  <div class="tab-bar" role="tablist" aria-label="Journal views">
    <button
      v-for="(tab, index) in tabs"
      :id="`journal-tab-${tab.key}`"
      :key="tab.key"
      :ref="(element) => setTabRef(element, index)"
      type="button"
      role="tab"
      class="tab-bar-item"
      :class="{ 'tab-bar-item--active': tab.key === activeKey }"
      :aria-selected="tab.key === activeKey"
      :aria-controls="`journal-panel-${tab.key}`"
      :tabindex="tab.key === activeKey ? 0 : -1"
      @click="select(tab.key)"
      @keydown="onKeydown($event, index)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
