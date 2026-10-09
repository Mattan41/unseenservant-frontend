<script setup>
import { computed } from 'vue'
import OffworldersStatsPanel from '@/systems/offworlders/components/OffworldersStatsPanel.vue'
import {
  OFFWORLDERS_ABILITY_DESCRIPTIONS,
  OFFWORLDERS_SKILL_DESCRIPTIONS,
  OFFWORLDERS_SUPPLY_MAX,
  abilityVitalsBonus,
  deriveArmor,
  deriveHealth,
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

// Vitals always reflect their sources (attributes, worn armor, abilities), so the
// sheet stays correct even for characters saved before automatic derivation.
const abilityBonus = computed(() => abilityVitalsBonus(abilities.value))
const maxHealth = computed(() =>
  deriveHealth(
    offworlders.value.stats,
    abilityBonus.value.health + (Number(offworlders.value.healthModifier) || 0),
  ),
)
const effectiveArmor = computed(() => deriveArmor(items.value, abilityBonus.value.armor))

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
        <p><strong>HP:</strong> {{ offworlders.currentHealth ?? maxHealth }} / {{ maxHealth }}</p>
        <p><strong>Armor:</strong> {{ effectiveArmor }}</p>
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
      <!-- The sheet has room, so every selected skill shows its text inline. -->
      <div v-if="skills.length" class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <div v-for="entry in skills" :key="entry.name">
          <p class="font-medium text-default">{{ entry.name }}</p>
          <p v-if="skillDescription(entry)" class="text-sm text-secondary">
            {{ skillDescription(entry) }}
          </p>
        </div>
      </div>
      <p v-else class="text-subtle">No skills recorded.</p>
    </div>

    <!-- Abilities -->
    <div class="p-6 border-t border-section muted-surface">
      <h2 class="section-heading mb-4">Abilities</h2>
      <!-- The sheet has room, so every selected ability shows its text inline. -->
      <div v-if="abilities.length" class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <div v-for="entry in abilities" :key="entry.name">
          <p class="font-medium text-default">{{ entry.name }}</p>
          <p v-if="abilityDescription(entry)" class="text-sm text-secondary">
            {{ abilityDescription(entry) }}
          </p>
        </div>
      </div>
      <p v-else class="text-subtle">No abilities recorded.</p>
    </div>
  </div>
</template>
