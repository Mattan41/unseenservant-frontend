<script setup>
import { computed } from 'vue'
import OffworldersStatsPanel from '@/systems/offworlders/components/OffworldersStatsPanel.vue'

const props = defineProps({
  character: {
    type: Object,
    required: true,
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
})

const offworlders = computed(() => props.character?.offworlders || {})
const skills = computed(() => offworlders.value.skills || [])
const abilities = computed(() => offworlders.value.abilities || [])
</script>

<template>
  <div>
    <!-- Vitals -->
    <div class="p-6 border-t border-section">
      <h2 class="section-heading mb-4">Vitals</h2>
      <div class="flex flex-wrap gap-6" style="color: var(--color-third-700)">
        <p><strong>Class:</strong> {{ offworlders.characterClass || '—' }}</p>
        <p><strong>Species:</strong> {{ offworlders.species || '—' }}</p>
        <p><strong>Look:</strong> {{ offworlders.look || '—' }}</p>
        <p><strong>Health:</strong> {{ offworlders.health ?? '—' }}</p>
        <p><strong>Armor:</strong> {{ offworlders.armor ?? '—' }}</p>
        <p>
          <strong>Supply:</strong> {{ offworlders.supply ?? 0 }} / {{ offworlders.supplyMax ?? 0 }}
        </p>
        <p><strong>XP:</strong> {{ offworlders.xp ?? 0 }}</p>
      </div>
    </div>

    <!-- Attributes -->
    <div class="p-6" style="background-color: var(--color-third-50)">
      <h2 class="section-heading mb-4">Attributes</h2>
      <OffworldersStatsPanel :stats="offworlders.stats" />
    </div>

    <!-- Skills -->
    <div class="p-6 border-t border-section">
      <h2 class="section-heading mb-4">Skills</h2>
      <div v-if="skills.length" class="flex flex-wrap gap-2">
        <span
          v-for="skill in skills"
          :key="skill"
          class="px-2 py-1 rounded-full text-xs"
          style="background-color: var(--color-third-200); color: var(--color-third-700)"
        >
          {{ skill }}
        </span>
      </div>
      <p v-else style="color: var(--color-third-400)">No skills recorded.</p>
    </div>

    <!-- Abilities -->
    <div class="p-6 border-t border-section" style="background-color: var(--color-third-50)">
      <h2 class="section-heading mb-4">Abilities</h2>
      <div v-if="abilities.length" class="flex flex-wrap gap-2">
        <span
          v-for="ability in abilities"
          :key="ability"
          class="px-2 py-1 rounded-full text-xs"
          style="background-color: var(--color-third-200); color: var(--color-third-700)"
        >
          {{ ability }}
        </span>
      </div>
      <p v-else style="color: var(--color-third-400)">No abilities recorded.</p>
    </div>
  </div>
</template>