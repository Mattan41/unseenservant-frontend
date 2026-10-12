<script setup>
/**
 * Presentational export menu: an "Export" trigger that reveals a small list of
 * formats to choose from.
 *
 * Props in, events out — no store access. The caller owns actually building and
 * downloading the file (so this is shared by the character and ship sheets).
 *
 * The panel is teleported to `<body>` and positioned `fixed` from the trigger's
 * rect, so it is never clipped by an ancestor's `overflow-hidden` (the
 * character card and other panels use it for rounded corners).
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'

const props = defineProps({
  /** Trigger label. */
  label: {
    type: String,
    default: 'Export',
  },
  /** Chooseable formats: `[{ id, label }]`. */
  formats: {
    type: Array,
    default: () => [
      { id: 'md', label: 'Markdown (.md)' },
      { id: 'txt', label: 'Plain text (.txt)' },
      { id: 'json', label: 'JSON backup (.json)' },
    ],
  },
  /** Disable the trigger (e.g. while an export is in progress). */
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['export'])

const open = ref(false)
const trigger = ref(null)
const menu = ref(null)
// Fixed-position coordinates: top edge below the trigger, right-aligned to it.
const position = ref({ top: 0, right: 0 })

function updatePosition() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  position.value = {
    top: rect.bottom + 4,
    right: Math.max(8, window.innerWidth - rect.right),
  }
}

async function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    await nextTick()
    updatePosition()
  }
}

function choose(formatId) {
  open.value = false
  emit('export', formatId)
}

// Close on a click outside both the trigger and the (teleported) panel.
function onDocumentClick(event) {
  if (!open.value) return
  const target = event.target
  if (trigger.value?.contains(target) || menu.value?.contains(target)) return
  open.value = false
}

// The panel is fixed-aligned to the trigger, so follow scrolling/resizing.
function trackPosition() {
  if (open.value) updatePosition()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('resize', trackPosition)
  window.addEventListener('scroll', trackPosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('resize', trackPosition)
  window.removeEventListener('scroll', trackPosition, true)
})
</script>

<template>
  <div ref="trigger" class="inline-block">
    <BaseButton variant="default" icon="download" :disabled="disabled" @click="toggle">
      {{ label }}
    </BaseButton>
    <Teleport to="body">
      <div
        v-if="open"
        ref="menu"
        class="export-menu"
        role="menu"
        :style="{ top: `${position.top}px`, right: `${position.right}px` }"
      >
        <button
          v-for="format in formats"
          :key="format.id"
          type="button"
          role="menuitem"
          class="export-menu-item"
          @click="choose(format.id)"
        >
          {{ format.label }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped></style>
