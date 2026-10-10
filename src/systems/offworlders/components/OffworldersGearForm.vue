<script setup>
/**
 * Offworlders gear editor (rules p.11-12).
 *
 * Weapons are typed (Light / Medium / Heavy) with a free-text description;
 * their damage and Heavy label are derived from the type. Everything else —
 * custom weapons included — lives in the free-text item list. Both are grouped
 * under a single "Gear" heading.
 */
import { ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseTooltip from '@/components/base/BaseTooltip.vue'
import IconButton from '@/components/base/IconButton.vue'
import {
  OFFWORLDERS_ARMOR_OPTIONS,
  OFFWORLDERS_CREDITS_ALTERNATIVE,
  OFFWORLDERS_STARTING_CREDITS,
  OFFWORLDERS_WEAPON_CATEGORIES,
  OFFWORLDERS_WEAPON_TYPES,
  createEmptyOffworldersItem,
  createEmptyOffworldersWeapon,
  damageForWeaponType,
  isWeaponHeavy,
} from '@/systems/offworlders/constants.js'

const weapons = defineModel('weapons', { type: Array, required: true })
const items = defineModel('items', { type: Array, required: true })
const credits = defineModel('credits', { type: Number, required: true })
const armor = defineModel('armor', { type: Number, required: true })

// Mobile-only info overlay (tooltips are disabled on small screens).
const showGearInfo = ref(false)

function addWeapon() {
  weapons.value = [...weapons.value, createEmptyOffworldersWeapon()]
}

function removeWeapon(index) {
  weapons.value = weapons.value.filter((_, i) => i !== index)
}

function addItem() {
  items.value = [...items.value, createEmptyOffworldersItem()]
}

function removeItem(index) {
  items.value = items.value.filter((_, i) => i !== index)
}

// Chargen alternative: take extra Credits instead of armor + a second weapon.
function takeCreditsAlternative() {
  credits.value = OFFWORLDERS_STARTING_CREDITS + OFFWORLDERS_CREDITS_ALTERNATIVE
}

// Chargen alternative: take Light armor and a second weapon.
function takeArmorAlternative() {
  armor.value = 1
  weapons.value = [...weapons.value, createEmptyOffworldersWeapon('Light')]
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-1">
      <h3 class="section-heading">
        <BaseTooltip
          text="Weapons carry damage by type; everything else (custom weapons included) goes in Items as free text."
          desktop-only
        >
          Gear
        </BaseTooltip>
      </h3>
      <span class="md:hidden">
        <IconButton icon="info" label="Gear rules" @click="showGearInfo = true" />
      </span>
    </div>
    <p class="text-xs mb-3 text-muted">
      Weapons are typed — damage and Heavy follow from the type. Everything else is free text.
    </p>

    <!-- Weapons -->
    <h4 class="text-sm font-semibold uppercase mb-1 text-muted">Weapons</h4>
    <div class="space-y-3 mb-3">
      <div v-for="(weapon, index) in weapons" :key="index" class="muted-surface p-3">
        <div class="flex flex-wrap items-end gap-2">
          <div class="w-32">
            <label :for="`ow-weapon-type-${index}`" class="block text-xs text-muted mb-1">
              Type
            </label>
            <select
              :id="`ow-weapon-type-${index}`"
              v-model="weapon.type"
              class="input-field w-full px-2 py-1 border border-input rounded-md"
            >
              <option v-for="type in OFFWORLDERS_WEAPON_CATEGORIES" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
          </div>
          <div class="flex-1 min-w-[12rem]">
            <label :for="`ow-weapon-desc-${index}`" class="block text-xs text-muted mb-1">
              Description
            </label>
            <input
              :id="`ow-weapon-desc-${index}`"
              v-model="weapon.description"
              type="text"
              class="input-field w-full px-2 py-1 border border-input rounded-md"
              placeholder="e.g. Snubnosed revolver"
            />
          </div>
          <BaseButton variant="remove" type="button" @click="removeWeapon(index)">Remove</BaseButton>
        </div>
        <p class="mt-1 text-xs text-muted">
          Damage {{ damageForWeaponType(weapon.type) }}
          <span v-if="isWeaponHeavy(weapon.type)" class="chip ml-1">Heavy</span>
        </p>
      </div>
    </div>
    <p v-if="!weapons.length" class="text-sm mb-2 text-subtle">No weapons recorded.</p>
    <div class="mb-4">
      <BaseButton variant="ghost" type="button" @click="addWeapon">+ Weapon</BaseButton>
    </div>

    <!-- Items -->
    <h4 class="text-sm font-semibold uppercase mb-1 text-muted">Items</h4>
    <div class="space-y-3 mb-3">
      <div v-for="(item, index) in items" :key="index" class="muted-surface p-3">
        <div class="flex flex-wrap items-end gap-2">
          <div class="flex-1 min-w-[12rem]">
            <label :for="`ow-item-name-${index}`" class="block text-xs text-muted mb-1">Name</label>
            <input
              :id="`ow-item-name-${index}`"
              v-model="item.name"
              type="text"
              class="input-field w-full px-2 py-1 border border-input rounded-md"
              placeholder="e.g. Prototype plasma lance"
            />
          </div>
          <div class="flex-[2] min-w-[12rem]">
            <label :for="`ow-item-desc-${index}`" class="block text-xs text-muted mb-1">
              Description
            </label>
            <input
              :id="`ow-item-desc-${index}`"
              v-model="item.description"
              type="text"
              class="input-field w-full px-2 py-1 border border-input rounded-md"
              placeholder="Optional"
            />
          </div>
          <BaseButton variant="remove" type="button" @click="removeItem(index)">Remove</BaseButton>
        </div>
      </div>
    </div>
    <p v-if="!items.length" class="text-sm mb-2 text-subtle">No items recorded.</p>
    <div class="mb-4">
      <BaseButton variant="ghost" type="button" @click="addItem">+ Item</BaseButton>
    </div>

    <!-- Starting gear choice (rules p.6) -->
    <div class="mb-2 flex flex-wrap items-center gap-2 text-sm text-secondary">
      <BaseTooltip
        text="Every character starts with 3 Supply, 3 Credits and one light weapon, then chooses EITHER +7 Credits OR Light armor and a second weapon."
        desktop-only
      >
        Starting gear
      </BaseTooltip>
      <span>— choose one:</span>
      <BaseButton variant="ghost" type="button" @click="takeCreditsAlternative">
        +{{ OFFWORLDERS_CREDITS_ALTERNATIVE }} Credits (no armor)
      </BaseButton>
      <BaseButton variant="ghost" type="button" @click="takeArmorAlternative">
        Light armor + 2nd weapon
      </BaseButton>
    </div>

    <!-- Mobile info overlay (tooltips are disabled on small screens). -->
    <BaseModal v-if="showGearInfo" @close="showGearInfo = false">
      <div
        class="bg-[var(--color-surface)] rounded-lg shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto p-4 text-left"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="section-heading">Gear</h3>
          <IconButton icon="close" label="Close" @click="showGearInfo = false" />
        </div>

        <p class="text-sm mb-3 text-muted">
          Weapons are typed — you pick Light, Medium or Heavy and the damage die follows. Armor is a
          single value (0 None, 1 Light, 2 Heavy, 3 Assault). Anything custom goes in Items as free
          text.
        </p>

        <h4 class="text-sm font-semibold uppercase mb-2 text-muted">Weapon types</h4>
        <ul class="flex flex-col gap-2 mb-4">
          <li v-for="type in OFFWORLDERS_WEAPON_CATEGORIES" :key="type">
            <span class="font-medium text-default">
              {{ type }} — damage {{ damageForWeaponType(type) }}
            </span>
            <span class="block text-sm text-secondary">
              {{ OFFWORLDERS_WEAPON_TYPES.find((weapon) => weapon.name === type)?.notes }}
            </span>
          </li>
        </ul>

        <h4 class="text-sm font-semibold uppercase mb-2 text-muted">Armor</h4>
        <ul class="flex flex-col gap-2">
          <li v-for="option in OFFWORLDERS_ARMOR_OPTIONS" :key="option.value">
            <span class="font-medium text-default">{{ option.value }} — {{ option.label }}</span>
          </li>
        </ul>
      </div>
    </BaseModal>

  </div>

</template>
