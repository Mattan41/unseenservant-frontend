<script setup>
import { computed } from 'vue'
import OffworldersStatsPanel from '@/systems/offworlders/components/OffworldersStatsPanel.vue'
import BaseTooltip from '@/components/base/BaseTooltip.vue'
import {
  OFFWORLDERS_ABILITY_DESCRIPTIONS,
  OFFWORLDERS_SKILL_DESCRIPTIONS,
  OFFWORLDERS_SUPPLY_MAX,
} from '@/systems/offworlders/constants.js'

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
const gear = computed(() => offworlders.value.gear || {})

/** Named weapons from the gear block, rendered as "Name (Type)" strings. */
const weapons = computed(() => {
  const entries = []
  const g = gear.value
  if (g.primaryWeapon) entries.push(`${g.primaryWeapon} (${g.primaryWeaponType || 'Light'})`)
  if (g.secondaryWeapon)
    entries.push(`${g.secondaryWeapon} (${g.secondaryWeaponType || 'Unspecified'})`)
  return entries
})
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
          <strong>Supply:</strong> {{ offworlders.supply ?? 0 }} / {{ OFFWORLDERS_SUPPLY_MAX }}
        </p>
        <p><strong>Credits:</strong> {{ offworlders.credits ?? 0 }}</p>
        <p><strong>XP:</strong> {{ offworlders.xp ?? 0 }}</p>
      </div>
    </div>

    <!-- Gear -->
    <div class="p-6 border-t border-section">
      <h2 class="section-heading mb-4">Gear</h2>
      <div class="flex flex-wrap gap-6" style="color: var(--color-third-700)">
        <p v-if="weapons.length"><strong>Weapons:</strong> {{ weapons.join(', ') }}</p>
        <p v-else><strong>Weapons:</strong> —</p>
        <p><strong>Armor:</strong> {{ gear.armorType || (offworlders.armor ? 'Custom' : 'None') }}</p>
        <p v-if="gear.notes"><strong>Other:</strong> {{ gear.notes }}</p>
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
          class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
          style="background-color: var(--color-third-200); color: var(--color-third-700)"
        >
          <BaseTooltip
            v-if="OFFWORLDERS_SKILL_DESCRIPTIONS[skill]"
            :text="OFFWORLDERS_SKILL_DESCRIPTIONS[skill]"
          >{{ skill }}</BaseTooltip>
          <template v-else>{{ skill }}</template>
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
          class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
          style="background-color: var(--color-third-200); color: var(--color-third-700)"
        >
          <BaseTooltip
            v-if="OFFWORLDERS_ABILITY_DESCRIPTIONS[ability]"
            :text="OFFWORLDERS_ABILITY_DESCRIPTIONS[ability]"
          >{{ ability }}</BaseTooltip>
          <template v-else>{{ ability }}</template>
        </span>
      </div>
      <p v-else style="color: var(--color-third-400)">No abilities recorded.</p>
    </div>
  </div>
</template>