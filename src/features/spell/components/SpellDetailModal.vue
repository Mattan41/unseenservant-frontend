<script setup>
import { computed } from 'vue'
import { getSchoolBadgeClass } from '@/features/spell/spellUtils.js'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'

const props = defineProps({
  spell: {
    type: Object,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const spellLevel = computed(() => props.spell?.levelLabel || null)
const spellSchoolName = computed(() => props.spell?.school || null)
const spellDocumentName = computed(() => props.spell?.sourceLabel || null)

function close() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <BaseModal v-if="visible && spell" @close="close">
      <div
        class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
      >
        <!-- Modal header -->
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-2xl font-bold" style="color: var(--color-third-800)">{{ spell.name }}</h3>
          <BaseButton variant="icon" class="text-xl" @click="close">✕</BaseButton>
        </div>

        <!-- Badges -->
        <div class="flex flex-wrap gap-2 mb-4">
          <span class="badge badge-primary">{{ spellLevel }}</span>
          <span
            v-if="spellSchoolName"
            class="badge capitalize"
            :class="getSchoolBadgeClass(spellSchoolName)"
          >
            {{ spellSchoolName }}
          </span>
          <span v-if="spellDocumentName" class="badge badge-muted">
            {{ spellDocumentName }}
          </span>
        </div>

        <!-- Spell metadata -->
        <div class="space-y-3 text-default">
          <p v-if="spell.range !== null && spell.range !== ''">
            <strong>Range:</strong> {{ spell.range }}
          </p>
          <p v-if="spell.duration"><strong>Duration:</strong> {{ spell.duration }}</p>
          <p v-if="spell.casting_time"><strong>Casting Time:</strong> {{ spell.casting_time }}</p>
          <p v-if="spell.components?.length">
            <strong>Components:</strong> {{ spell.components.join(', ') }}
            <span v-if="spell.materialText"> ({{ spell.materialText }})</span>
          </p>
          <p v-if="spell.ritual"><strong>Ritual:</strong> Yes</p>
          <p v-if="spell.concentration"><strong>Concentration:</strong> Yes</p>
        </div>

        <!-- Description -->
        <div class="mt-4">
          <h4 class="font-semibold mb-2" style="color: var(--color-third-800)">Description</h4>
          <div
            v-if="spell.desc || spell.description"
            class="text-secondary prose prose-sm max-w-none"
          >
            <p>{{ spell.desc || spell.description }}</p>
          </div>
          <div v-if="spell.higher_level" class="mt-2">
            <h5 class="font-semibold text-default">At Higher Levels:</h5>
            <p class="text-secondary">{{ spell.higher_level }}</p>
          </div>
        </div>
      </div>
    </BaseModal>
  </Teleport>
</template>
