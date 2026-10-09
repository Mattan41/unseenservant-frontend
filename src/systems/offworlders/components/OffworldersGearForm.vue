<script setup>
/**
 * Minimal Offworlders gear editor (rules p.6 / p.12).
 *
 * Chargen gives every PC one light weapon, plus a choice of either 7 extra
 * Credits or Light armor and a second weapon. Full weapon/armor automation
 * (damage dice, mitigation, heavy penalties) is deferred to Step 1.5.
 *
 * Uses named models so the parent keeps the numeric `armor` rating on the
 * character root while the descriptive `gear` block lives in its own object.
 */
import BaseTooltip from '@/components/base/BaseTooltip.vue'
import {
  OFFWORLDERS_ARMOR_TYPES,
  OFFWORLDERS_WEAPON_TYPES,
  OFFWORLDERS_STARTING_CREDITS,
  OFFWORLDERS_CREDITS_ALTERNATIVE,
  armorRatingForType,
} from '@/systems/offworlders/constants.js'

const gear = defineModel('gear', { type: Object, required: true })
const armor = defineModel('armor', { type: Number, required: true })
const credits = defineModel('credits', { type: Number, required: true })

function onArmorTypeChange() {
  armor.value = armorRatingForType(gear.value.armorType)
}

// Chargen alternative: take extra Credits instead of armor + a second weapon.
function takeCreditsAlternative() {
  gear.value.armorType = ''
  armor.value = 0
  credits.value = OFFWORLDERS_STARTING_CREDITS + OFFWORLDERS_CREDITS_ALTERNATIVE
}

// Chargen alternative: take Light armor and a second weapon of any type.
function takeArmorAlternative() {
  gear.value.armorType = 'Light'
  armor.value = armorRatingForType('Light')
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-3" style="color: var(--color-primary-700)">Gear</h3>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Primary weapon -->
      <div class="mb-4">
        <label for="ow-weapon-1" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip
            text="You start with one light weapon — describe it (e.g. snubnosed revolver, stun glove)."
          >
            Primary weapon
          </BaseTooltip>
        </label>
        <input
          id="ow-weapon-1"
          v-model="gear.primaryWeapon"
          type="text"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
          placeholder="e.g. Snubnosed revolver"
        />
        <select
          v-model="gear.primaryWeaponType"
          class="input-field w-full px-3 py-2 border border-input rounded-md mt-2"
          aria-label="Primary weapon type"
        >
          <option v-for="weapon in OFFWORLDERS_WEAPON_TYPES" :key="weapon.name" :value="weapon.name">
            {{ weapon.name }} — {{ weapon.damage }}
          </option>
        </select>
      </div>

      <!-- Secondary weapon -->
      <div class="mb-4">
        <label for="ow-weapon-2" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip
            text="Some characters carry a second weapon — for example via the starting-gear choice below."
          >
            Secondary weapon
          </BaseTooltip>
        </label>
        <input
          id="ow-weapon-2"
          v-model="gear.secondaryWeapon"
          type="text"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
          placeholder="Optional"
        />
        <select
          v-model="gear.secondaryWeaponType"
          class="input-field w-full px-3 py-2 border border-input rounded-md mt-2"
          aria-label="Secondary weapon type"
        >
          <option value="">No secondary type</option>
          <option v-for="weapon in OFFWORLDERS_WEAPON_TYPES" :key="weapon.name" :value="weapon.name">
            {{ weapon.name }} — {{ weapon.damage }}
          </option>
        </select>
      </div>
    </div>

    <!-- Armor type -->
    <div class="mb-4">
      <label for="ow-armor-type" class="block text-sm font-medium text-default mb-1">
        <BaseTooltip
          text="Armor subtracts its rating from incoming damage. A character may only wear one type of armor."
        >
          Armor type
        </BaseTooltip>
      </label>
      <select
        id="ow-armor-type"
        v-model="gear.armorType"
        class="input-field w-full px-3 py-2 border border-input rounded-md"
        @change="onArmorTypeChange"
      >
        <option value="">None</option>
        <option v-for="armorType in OFFWORLDERS_ARMOR_TYPES" :key="armorType.name" :value="armorType.name">
          {{ armorType.name }} — {{ armorType.rating }}-armor
        </option>
      </select>
    </div>

    <!-- Starting gear choice (rules p.6) -->
    <div class="mb-4 flex flex-wrap items-center gap-2 text-sm" style="color: var(--color-third-600)">
      <BaseTooltip
        text="Every character starts with 3 Supply, 3 Credits and one light weapon, then chooses EITHER +7 Credits OR Light armor and a second weapon."
      >
        Starting gear
      </BaseTooltip>
      <span>— choose one:</span>
      <button
        type="button"
        class="px-2 py-1 rounded-md text-xs"
        style="background-color: var(--color-third-200)"
        @click="takeCreditsAlternative"
      >
        +{{ OFFWORLDERS_CREDITS_ALTERNATIVE }} Credits (no armor)
      </button>
      <button
        type="button"
        class="px-2 py-1 rounded-md text-xs"
        style="background-color: var(--color-third-200)"
        @click="takeArmorAlternative"
      >
        Light armor + 2nd weapon
      </button>
    </div>

    <!-- Gear notes -->
    <div class="mb-2">
      <label for="ow-gear-notes" class="block text-sm font-medium text-default mb-1">
        <BaseTooltip
          text="Most equipment is abstracted as Supply. Use this for named items the rules don't cover."
        >
          Other gear
        </BaseTooltip>
      </label>
      <textarea
        id="ow-gear-notes"
        v-model="gear.notes"
        rows="2"
        class="input-field w-full px-3 py-2 border border-input rounded-md"
        placeholder="e.g. Brass knuckles, medkit, spare ammo"
      ></textarea>
    </div>
  </div>
</template>

<style scoped></style>
