<script setup>
import {computed} from 'vue';

const props = defineProps({
  src: String,
  alt: {type: String, default: ''},
  defaultSrc: {
    type: String,
    default: '/defaultCharacter.svg'
  }
});
const isAbsolute = src =>
  src.startsWith('http://') ||
  src.startsWith('https://') ||
  src.startsWith('blob:');

const fullSrc = computed(() => {
  if (!props.src) return props.defaultSrc;
  if (isAbsolute(props.src)) return props.src;
  // Prefix with API URL for /images/ paths when API_BASE_URL is set
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl && props.src.startsWith('/images/')) {
    return `${apiBaseUrl}${props.src}`;
  }
  return props.src;
});
</script>

<template>
  <img
    :src="fullSrc"
    :alt="alt"
    :class="$attrs.class"
    @error="$event.target.src = defaultSrc"
  />
</template>
