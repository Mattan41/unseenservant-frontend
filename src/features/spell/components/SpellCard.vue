<script setup>
import { computed } from 'vue'
import { getSchoolBadgeClass } from '@/features/spell/spellUtils.js'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'

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
  <BaseCard clickable @click="emit('click', spell)">
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

      <div class="flex items-center gap-2" @click.stop>
        <BaseButton v-if="showSave" variant="add" :loading="isSaving" @click="emit('save', spell)">
          Save to Character
        </BaseButton>

        <BaseButton
          v-if="showRemove"
          variant="remove"
          :loading="isRemoving"
          @click="emit('remove', spell)"
        >
          Remove
        </BaseButton>
      </div>
    </div>
  </BaseCard>
</template>
