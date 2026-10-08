<script setup>
import { DND5E_RACES, DND5E_CLASSES, DND5E_ABILITY_SCORES } from '@/systems/dnd5e/constants.js'

// Two-way bound to the `dnd5e` block of the character form model.
const dnd5e = defineModel({ type: Object, required: true })
</script>

<template>
  <div>
    <!-- Basic D&D 5e info -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="mb-4">
        <label for="race" class="block text-sm font-medium text-default mb-1">Race</label>
        <select
          id="race"
          v-model="dnd5e.race"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        >
          <option value="" disabled>Select a race</option>
          <option v-for="race in DND5E_RACES" :key="race" :value="race">{{ race }}</option>
        </select>
      </div>

      <div class="mb-4">
        <label for="class" class="block text-sm font-medium text-default mb-1">Class</label>
        <select
          id="class"
          v-model="dnd5e.characterClass"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        >
          <option value="" disabled>Select a class</option>
          <option v-for="charClass in DND5E_CLASSES" :key="charClass" :value="charClass">
            {{ charClass }}
          </option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="mb-4">
        <label for="level" class="block text-sm font-medium text-default mb-1">Level (1-20)</label>
        <input
          id="level"
          v-model.number="dnd5e.level"
          type="number"
          min="1"
          max="20"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        />
      </div>
      <div class="mb-4">
        <label for="hitPoints" class="block text-sm font-medium text-default mb-1">Hit Points</label>
        <input
          id="hitPoints"
          v-model.number="dnd5e.hitPoints"
          type="number"
          min="0"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        />
      </div>
      <div class="mb-4">
        <label for="armorClass" class="block text-sm font-medium text-default mb-1">Armor Class</label>
        <input
          id="armorClass"
          v-model.number="dnd5e.armorClass"
          type="number"
          min="0"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        />
      </div>
    </div>

    <!-- Ability scores -->
    <h3 class="text-lg font-semibold mb-3" style="color: var(--color-primary-700)">
      Ability Scores
    </h3>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div v-for="stat in DND5E_ABILITY_SCORES" :key="stat" class="mb-4">
        <label :for="stat" class="block text-sm font-medium text-default mb-1 capitalize">
          {{ stat }}
        </label>
        <input
          :id="stat"
          v-model.number="dnd5e.stats[stat]"
          type="number"
          min="1"
          max="30"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        />
      </div>
    </div>
  </div>
</template>
