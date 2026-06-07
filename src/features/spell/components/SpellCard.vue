<script setup>
import { computed } from 'vue'

const props = defineProps({
  spell: {
    type: Object,
    required: true,
  },
  showSave: {
    type: Boolean,
    default: false,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  showRemove: {
    type: Boolean,
    default: false,
  },
  isRemoving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click', 'save', 'remove'])

const schoolColorMap = {
  abjuration:   'badge-blue',
  conjuration:  'badge-purple',
  divination:   'badge-indigo',
  enchantment:  'badge-pink',
  evocation:    'badge-danger',
  illusion:     'badge-teal',
  necromancy:   'badge-muted',
  transmutation:'badge-yellow',
}

const schoolName = computed(() => {
  const school = props.spell?.school
  if (!school) return ''
  return typeof school === 'object' ? school.name || '' : school
})

const schoolBadgeClass = computed(() => {
  const name = schoolName.value.toLowerCase()
  return schoolColorMap[name] || 'badge-muted'
})

const levelLabel = computed(() => {
  const level = props.spell?.level
  if (level === 0 || level === '0' || level === undefined || level === null) {
    return 'Cantrip'
  }
  const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' }
  const suffix = suffixes[level] || 'th'
  return `${level}${suffix} level`
})

const componentsLabel = computed(() => {
  const components = props.spell?.components
  if (!components) return ''
  return Array.isArray(components) ? components.join(', ') : components
})

const shortDescription = computed(() => {
  const desc = props.spell?.desc || props.spell?.description || ''
  return desc.length > 200 ? desc.substring(0, 200) + '...' : desc
})

const sourceLabel = computed(() => props.spell?.sourceLabel || '')

</script>

<template>
  <div
    class="spell-card flex flex-col justify-between bg-white border border-third-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4"
    @click="emit('click', spell)"
  >
    <div>
      <!-- Name + school badge -->
      <div class="flex items-start justify-between gap-2 mb-2">
        <h4 class="text-lg font-semibold text-third-800 line-clamp-2">
          {{ spell.name }}
        </h4>
        <span
          v-if="schoolName"
          :class="['badge', schoolBadgeClass, 'capitalize', 'shrink-0']"
        >
          {{ schoolName }}
        </span>
      </div>

      <!-- Level + components -->
      <div class="flex items-center gap-3 text-sm text-third-500 mb-2">
        <span class="font-medium text-primary-600">{{ levelLabel }}</span>
        <span v-if="componentsLabel" class="text-third-400">•</span>
        <span v-if="componentsLabel">Components: {{ componentsLabel }}</span>
      </div>

      <!-- Short description -->
      <p class="text-sm text-third-600 leading-relaxed mb-3">
        {{ shortDescription }}
      </p>
    </div>

    <!-- Footer: source + actions -->
    <div class="flex items-center justify-between mt-auto pt-2 border-t border-third-100">
      <span v-if="sourceLabel" class="text-xs text-third-400 italic">
        Source: {{ sourceLabel }}
      </span>
      <span v-else></span>

      <div class="flex items-center gap-2">
        <button
          v-if="showSave"
          class="button button-add"
          :disabled="isSaving"
          @click.stop="emit('save', spell)"
        >
          <span v-if="isSaving" class="inline-block animate-spin mr-1">⟳</span>
          Save to Character
        </button>

        <button
          v-if="showRemove"
          class="button button-remove"
          :disabled="isRemoving"
          @click.stop="emit('remove', spell)"
        >
          <span v-if="isRemoving" class="inline-block animate-spin mr-1">⟳</span>
          Remove
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spell-card {
  transition: box-shadow 0.15s ease-in-out;
}
</style>
