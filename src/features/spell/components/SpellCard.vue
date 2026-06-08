<script setup>
import { computed } from 'vue'
import { getSchoolBadgeClass } from '@/features/spell/spellUtils.js'

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

const shortDescription = computed(() => {
  const desc = props.spell?.desc || ''
  return desc.length > 200 ? desc.substring(0, 200) + '...' : desc
})
</script>

<template>
  <div
    class="spell-card flex flex-col justify-between bg-white border border-third-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4"
    @click="emit('click', spell)"
  >
    <div>
      <div class="flex items-start justify-between gap-2 mb-2">
        <h4 class="text-lg font-semibold text-third-800 line-clamp-2">{{ spell.name }}</h4>
        <span
          v-if="spell.school"
          class="badge capitalize shrink-0"
          :class="getSchoolBadgeClass(spell.school)"
        >
          {{ spell.school }}
        </span>
      </div>

      <div class="flex items-center gap-3 text-sm text-third-500 mb-2">
        <span class="font-medium text-primary-600">{{ spell.levelLabel }}</span>
      </div>

      <p class="text-sm text-third-600 leading-relaxed mb-3">{{ shortDescription }}</p>
    </div>

    <div class="flex items-center justify-between mt-auto pt-2 border-t border-third-100">
      <span v-if="spell.sourceLabel" class="text-xs text-third-400 italic">
        Source: {{ spell.sourceLabel }}
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
