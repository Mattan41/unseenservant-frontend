<script setup>
import { computed } from 'vue'
import OffworldersStatsPanel from '@/systems/offworlders/components/OffworldersStatsPanel.vue'
import BaseTooltip from '@/components/base/BaseTooltip.vue'
import {
  OFFWORLDERS_ABILITY_DESCRIPTIONS,
  OFFWORLDERS_SKILL_DESCRIPTIONS,
  OFFWORLDERS_SUPPLY_MAX,
  resolveEntryDescription,
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
const items = computed(() => offworlders.value.items || [])
const weapons = computed(() => items.value.filter((item) => item.kind === 'weapon'))
const armorItems = computed(() => items.value.filter((item) => item.kind === 'armor'))
const otherItems = computed(
  () => items.value.filter((item) => item.kind !== 'weapon' && item.kind !== 'armor'),
)

function skillDescription(entry) {
  return resolveEntryDescription(entry, OFFWORLDERS_SKILL_DESCRIPTIONS)
}
function abilityDescription(entry) {
  return resolveEntryDescription(entry, OFFWORLDERS_ABILITY_DESCRIPTIONS)
}
</script>

<template>
  <div>
    <!-- Vitals -->
    <div class="p-6 border-t border-section">
      <h2 class="section-heading mb-4">Vitals</h2>
      <div class="flex flex-wrap gap-6 text-default">
        <p><strong>Class:</strong> {{ offworlders.characterClass || '—' }}</p>
        <p><strong>Species:</strong> {{ offworlders.species || '—' }}</p>
        <p><strong>Look:</strong> {{ offworlders.look || '—' }}</p>
        <p><strong>Health:</strong> {{ offworlders.health ?? '—' }}</p>
        <p><strong>Armor:</strong> {{ offworlders.armor ?? '—' }}</p>
        <p><strong>Supply:</strong> {{ offworlders.supply ?? 0 }} / {{ OFFWORLDERS_SUPPLY_MAX }}</p>
        <p><strong>Credits:</strong> {{ offworlders.credits ?? 0 }}</p>
        <p><strong>XP:</strong> {{ offworlders.xp ?? 0 }}</p>
      </div>
    </div>

    <!-- Items -->
    <div class="p-6 border-t border-section">
      <h2 class="section-heading mb-4">Items</h2>

      <div class="mb-4">
        <h3 class="text-sm font-semibold uppercase mb-1 text-muted">Weapons</h3>
        <ul v-if="weapons.length" class="flex flex-col gap-1 text-default">
          <li v-for="(item, index) in weapons" :key="index">
            <span class="font-medium">{{ item.name || 'Unnamed weapon' }}</span>
            <span v-if="item.damage"> — damage {{ item.damage }}</span>
            <span v-if="item.heavy" class="chip ml-1">Heavy</span>
            <span v-if="item.notes" class="text-muted"> ({{ item.notes }})</span>
          </li>
        </ul>
        <p v-else class="text-subtle">No weapons recorded.</p>
      </div>

      <div class="mb-4">
        <h3 class="text-sm font-semibold uppercase mb-1 text-muted">Armor</h3>
        <ul v-if="armorItems.length" class="flex flex-col gap-1 text-default">
          <li v-for="(item, index) in armorItems" :key="index">
            <span class="font-medium">{{ item.name || 'Unnamed armor' }}</span>
            <span> — {{ item.armorRating }}-armor</span>
            <span v-if="item.heavy" class="chip ml-1">Heavy</span>
            <span v-if="item.notes" class="text-muted"> ({{ item.notes }})</span>
          </li>
        </ul>
        <p v-else class="text-subtle">No armor recorded.</p>
      </div>

      <div v-if="otherItems.length">
        <h3 class="text-sm font-semibold uppercase mb-1 text-muted">Gear</h3>
        <ul class="flex flex-col gap-1 text-default">
          <li v-for="(item, index) in otherItems" :key="index">
            <span class="font-medium">{{ item.name || 'Unnamed item' }}</span>
            <span v-if="item.notes" class="text-muted"> — {{ item.notes }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Attributes -->
    <div class="p-6 muted-surface">
      <h2 class="section-heading mb-4">Attributes</h2>
      <OffworldersStatsPanel :stats="offworlders.stats" />
    </div>

    <!-- Skills -->
    <div class="p-6 border-t border-section">
      <h2 class="section-heading mb-4">Skills</h2>
      <div v-if="skills.length" class="flex flex-wrap gap-2">
        <span v-for="entry in skills" :key="entry.name" class="chip">
          <BaseTooltip v-if="skillDescription(entry)" :text="skillDescription(entry)">
            {{ entry.name }}
          </BaseTooltip>
          <template v-else>{{ entry.name }}</template>
        </span>
      </div>
      <p v-else class="text-subtle">No skills recorded.</p>
    </div>

    <!-- Abilities -->
    <div class="p-6 border-t border-section muted-surface">
      <h2 class="section-heading mb-4">Abilities</h2>
      <div v-if="abilities.length" class="flex flex-wrap gap-2">
        <span v-for="entry in abilities" :key="entry.name" class="chip">
          <BaseTooltip v-if="abilityDescription(entry)" :text="abilityDescription(entry)">
            {{ entry.name }}
          </BaseTooltip>
          <template v-else>{{ entry.name }}</template>
        </span>
      </div>
      <p v-else class="text-subtle">No abilities recorded.</p>
    </div>
  </div>
</template>
