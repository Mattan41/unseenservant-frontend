<script setup>
const props = defineProps({
  // Valid variants map to `.base-btn-<variant>` classes in
  // src/assets/base-button.css: default, ghost, add, update, remove,
  // retry, icon, demo, form.
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
    :class="`base-btn-${variant}`"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="inline-block animate-spin mr-1">⟳</span>
    <slot />
  </button>
</template>
