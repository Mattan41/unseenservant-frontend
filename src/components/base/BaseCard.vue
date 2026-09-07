<script setup>
defineProps({
  clickable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click'])

function handleClick() {
  emit('click')
}
</script>

<template>
  <div
    class="flex flex-col justify-between bg-[var(--color-surface)] border border-section rounded-lg shadow-sm p-4"
    :class="{ 'hover:shadow-md transition-shadow cursor-pointer': clickable }"
    @click="clickable && handleClick()"
  >
    <slot></slot>
  </div>
</template>
