<script setup>
import { computed, ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import IconButton from '@/components/base/IconButton.vue'
import {
  OFFWORLDERS_CLASSES,
  OFFWORLDERS_ATTRIBUTES,
  OFFWORLDERS_SKILLS,
  OFFWORLDERS_ABILITIES,
  OFFWORLDERS_ATTRIBUTE_MIN,
  OFFWORLDERS_ATTRIBUTE_MAX,
  OFFWORLDERS_ARMOR_MAX,
  deriveHealth,
  addListValue,
  removeListValue,
  toggleListValue,
} from '@/systems/offworlders/constants.js'

// Two-way bound to the `offworlders` block of the character form model.
const offworlders = defineModel({ type: Object, required: true })

const customSkill = ref('')
const customAbility = ref('')

const classAbilities = computed(() => OFFWORLDERS_ABILITIES[offworlders.value.characterClass] || [])
const derivedHealth = computed(() => deriveHealth(offworlders.value.stats))

function toggleSkill(skill) {
  offworlders.value.skills = toggleListValue(offworlders.value.skills, skill)
}

function addCustomSkill() {
  offworlders.value.skills = addListValue(offworlders.value.skills, customSkill.value)
  customSkill.value = ''
}

function removeSkill(skill) {
  offworlders.value.skills = removeListValue(offworlders.value.skills, skill)
}

function toggleAbility(ability) {
  offworlders.value.abilities = toggleListValue(offworlders.value.abilities, ability)
}

function addCustomAbility() {
  offworlders.value.abilities = addListValue(offworlders.value.abilities, customAbility.value)
  customAbility.value = ''
}

function removeAbility(ability) {
  offworlders.value.abilities = removeListValue(offworlders.value.abilities, ability)
}

function applyDerivedHealth() {
  offworlders.value.health = derivedHealth.value
}
</script>

<template>
  <div>
    <!-- Basic Offworlders info -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="mb-4">
        <label for="ow-class" class="block text-sm font-medium text-default mb-1">Class</label>
        <select
          id="ow-class"
          v-model="offworlders.characterClass"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        >
          <option value="" disabled>Select a class</option>
          <option v-for="charClass in OFFWORLDERS_CLASSES" :key="charClass" :value="charClass">
            {{ charClass }}
          </option>
        </select>
      </div>

      <div class="mb-4">
        <label for="ow-species" class="block text-sm font-medium text-default mb-1">Species</label>
        <input
          id="ow-species"
          v-model="offworlders.species"
          type="text"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
          placeholder="e.g. Human, Synthetic"
        />
      </div>
    </div>

    <div class="mb-4">
      <label for="ow-look" class="block text-sm font-medium text-default mb-1">Look</label>
      <input
        id="ow-look"
        v-model="offworlders.look"
        type="text"
        class="input-field w-full px-3 py-2 border border-input rounded-md"
        placeholder="A short physical description"
      />
    </div>

    <!-- Vitals -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div class="mb-4">
        <label for="ow-health" class="block text-sm font-medium text-default mb-1">Health</label>
        <input
          id="ow-health"
          v-model.number="offworlders.health"
          type="number"
          min="0"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        />
        <!-- remove ! once base-button.css is layered -->
        <BaseButton
          type="button"
          variant="link"
          class="!mt-1"
          @click="applyDerivedHealth"
        >
          Use derived ({{ derivedHealth }})
        </BaseButton>
      </div>
      <div class="mb-4">
        <label for="ow-armor" class="block text-sm font-medium text-default mb-1">Armor (0-3)</label>
        <input
          id="ow-armor"
          v-model.number="offworlders.armor"
          type="number"
          min="0"
          :max="OFFWORLDERS_ARMOR_MAX"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        />
      </div>
      <div class="mb-4">
        <label for="ow-supply" class="block text-sm font-medium text-default mb-1">Supply</label>
        <input
          id="ow-supply"
          v-model.number="offworlders.supply"
          type="number"
          min="0"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        />
      </div>
      <div class="mb-4">
        <label for="ow-supply-max" class="block text-sm font-medium text-default mb-1">Max Supply</label>
        <input
          id="ow-supply-max"
          v-model.number="offworlders.supplyMax"
          type="number"
          min="0"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        />
      </div>
      <div class="mb-4">
        <label for="ow-xp" class="block text-sm font-medium text-default mb-1">XP</label>
        <input
          id="ow-xp"
          v-model.number="offworlders.xp"
          type="number"
          min="0"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        />
      </div>
    </div>

    <!-- Attributes -->
    <h3 class="text-lg font-semibold mb-3" style="color: var(--color-primary-700)">Attributes</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="attr in OFFWORLDERS_ATTRIBUTES" :key="attr" class="mb-4">
        <label :for="`ow-attr-${attr}`" class="block text-sm font-medium text-default mb-1 capitalize">
          {{ attr }}
        </label>
        <input
          :id="`ow-attr-${attr}`"
          v-model.number="offworlders.stats[attr]"
          type="number"
          :min="OFFWORLDERS_ATTRIBUTE_MIN"
          :max="OFFWORLDERS_ATTRIBUTE_MAX"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        />
      </div>
    </div>

    <!-- Skills -->
    <h3 class="text-lg font-semibold mb-3" style="color: var(--color-primary-700)">Skills</h3>
    <div class="flex flex-wrap gap-3 mb-3">
      <label
        v-for="skill in OFFWORLDERS_SKILLS"
        :key="skill"
        class="inline-flex items-center gap-1 text-sm"
      >
        <input
          type="checkbox"
          :checked="offworlders.skills.includes(skill)"
          @change="toggleSkill(skill)"
        />
        {{ skill }}
      </label>
    </div>
    <div class="flex gap-2 mb-3">
      <input
        v-model="customSkill"
        type="text"
        class="input-field flex-1 px-3 py-2 border border-input rounded-md"
        placeholder="Add a custom skill"
        @keyup.enter.prevent="addCustomSkill"
      />
      <button
        type="button"
        class="px-3 py-2 rounded-md text-sm"
        style="background-color: var(--color-third-200)"
        @click="addCustomSkill"
      >
        Add
      </button>
    </div>
    <div v-if="offworlders.skills.length" class="flex flex-wrap gap-2 mb-6">
      <span
        v-for="skill in offworlders.skills"
        :key="skill"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
        style="background-color: var(--color-third-200)"
      >
        {{ skill }}
        <IconButton variant="chip" :label="`Remove ${skill}`" @click="removeSkill(skill)">
          ×
        </IconButton>
      </span>
    </div>
    <p v-else class="text-sm mb-6" style="color: var(--color-third-400)">
      No skills selected yet.
    </p>

    <!-- Abilities -->
    <h3 class="text-lg font-semibold mb-3" style="color: var(--color-primary-700)">Abilities</h3>
    <div v-if="classAbilities.length" class="flex flex-wrap gap-3 mb-3">
      <label
        v-for="ability in classAbilities"
        :key="ability"
        class="inline-flex items-center gap-1 text-sm"
      >
        <input
          type="checkbox"
          :checked="offworlders.abilities.includes(ability)"
          @change="toggleAbility(ability)"
        />
        {{ ability }}
      </label>
    </div>
    <p v-else class="text-sm mb-3" style="color: var(--color-third-400)">
      Select a class to see its abilities.
    </p>
    <div class="flex gap-2 mb-3">
      <input
        v-model="customAbility"
        type="text"
        class="input-field flex-1 px-3 py-2 border border-input rounded-md"
        placeholder="Add a custom ability"
        @keyup.enter.prevent="addCustomAbility"
      />
      <button
        type="button"
        class="px-3 py-2 rounded-md text-sm"
        style="background-color: var(--color-third-200)"
        @click="addCustomAbility"
      >
        Add
      </button>
    </div>
    <div v-if="offworlders.abilities.length" class="flex flex-wrap gap-2">
      <span
        v-for="ability in offworlders.abilities"
        :key="ability"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
        style="background-color: var(--color-third-200)"
      >
        {{ ability }}
        <IconButton
          variant="chip"
          :label="`Remove ${ability}`"
          @click="removeAbility(ability)"
        >
          ×
        </IconButton>
      </span>
    </div>
    <p v-else class="text-sm" style="color: var(--color-third-400)">No abilities selected yet.</p>
  </div>
</template>
