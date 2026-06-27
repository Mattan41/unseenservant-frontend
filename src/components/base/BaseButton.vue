<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
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
