<script setup>
defineProps({
  zIndex: {
    type: String,
    default: 'z-50',
  },
})

const emit = defineEmits(['close'])
</script>

<template>
  <div
    class="fixed inset-0 flex items-center justify-center p-4 bg-black/50"
    :class="zIndex"
    @click.self="emit('close')"
  >
    <slot />
  </div>
</template>
