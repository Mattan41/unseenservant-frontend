<script setup>
import BaseIcon from '@/components/base/BaseIcon.vue'

const props = defineProps({
  // Valid variants map to `.base-btn-<variant>` classes in
  // src/assets/base-button.css: default, ghost, add, update, remove,
  // retry, icon, demo, form, link.
  variant: {
    type: String,
    default: 'default',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  confirmMessage: {
    type: String,
    default: null,
  },
  // Optional `BaseIcon` name rendered before the label, e.g.
  // `<BaseButton variant="update" icon="edit">Edit ship</BaseButton>`.
  // Centralises the icon + label markup so buttons look identical app-wide.
  icon: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['click'])

function handleClick() {
  const message = props.confirmMessage ?? (props.variant === 'remove' ? 'Are you sure?' : null)
  if (message && !window.confirm(message)) return
  emit('click')
}
</script>

<template>
  <button
    class="base-btn"
    :class="[`base-btn-${variant}`, icon ? 'base-btn-with-icon' : '']"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="inline-block animate-spin mr-1">⟳</span>
    <BaseIcon v-if="icon" :name="icon" class="base-btn-icon" />
    <slot />
  </button>
</template>
