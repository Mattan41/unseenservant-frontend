<script setup>
/**
 * Free-form Offworlders inventory editor (rules p.11-12).
 *
 * There is no fixed catalog: the player writes any name, and for weapons any
 * damage expression. `kind` only decides how the sheet groups the rows.
 *
 * The list uses index keys because an item is persisted as a plain object with
 * no id. Inputs are `v-model`-bound, so this is safe for add/remove/edit.
 */
import BaseTooltip from '@/components/base/BaseTooltip.vue'
import {
  OFFWORLDERS_ITEM_KIND_LABELS,
  OFFWORLDERS_ITEM_KINDS,
  OFFWORLDERS_STARTING_CREDITS,
  OFFWORLDERS_CREDITS_ALTERNATIVE,
  createEmptyOffworldersItem,
} from '@/systems/offworlders/constants.js'

const items = defineModel('items', { type: Array, required: true })
const credits = defineModel('credits', { type: Number, required: true })

function addItem(kind) {
  items.value = [...items.value, { ...createEmptyOffworldersItem(), kind }]
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
  items.value = [
    ...items.value,
    { ...createEmptyOffworldersItem(), name: 'Light armor', kind: 'armor', armorRating: 1 },
    { ...createEmptyOffworldersItem(), kind: 'weapon' },
  ]
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1" style="color: var(--color-primary-700)">
      <BaseTooltip
        text="Free-form inventory. Write whatever you like and (for weapons) any damage expression such as 1D6, 1D6+2, 2D8, or 'Lower of 2D6'. Nothing here is limited to a fixed list."
      >
        Items
      </BaseTooltip>
    </h3>
    <p class="text-xs mb-3" style="color: var(--color-third-500)">
      Add any weapon, armor, or item. Names and damage are free text.
    </p>

    <div class="space-y-3 mb-3">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="p-3 rounded-md"
        style="background-color: var(--color-third-50)"
      >
        <div class="flex flex-wrap items-end gap-2">
          <div class="w-28">
            <label :for="`ow-item-kind-${index}`" class="block text-xs text-muted mb-1">Kind</label>
            <select
              :id="`ow-item-kind-${index}`"
              v-model="item.kind"
              class="input-field w-full px-2 py-1 border border-input rounded-md"
            >
              <option v-for="kind in OFFWORLDERS_ITEM_KINDS" :key="kind" :value="kind">
                {{ OFFWORLDERS_ITEM_KIND_LABELS[kind] }}
              </option>
            </select>
          </div>
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
          <button
            type="button"
            class="px-2 py-1 rounded-md text-xs"
            style="background-color: var(--color-third-200)"
            :aria-label="`Remove item ${index + 1}`"
            @click="removeItem(index)"
          >
            Remove
          </button>
        </div>

        <div class="flex flex-wrap items-end gap-2 mt-2">
          <div v-if="item.kind === 'weapon'" class="flex-1 min-w-[10rem]">
            <label :for="`ow-item-damage-${index}`" class="block text-xs text-muted mb-1">
              <BaseTooltip text="Any expression: 1D6, 1D6+2, 2D8, 'Lower of 2D6'.">
                Damage
              </BaseTooltip>
            </label>
            <input
              :id="`ow-item-damage-${index}`"
              v-model="item.damage"
              type="text"
              class="input-field w-full px-2 py-1 border border-input rounded-md"
              placeholder="e.g. 1D6+2"
            />
          </div>
          <div v-if="item.kind === 'armor'" class="w-32">
            <label :for="`ow-item-armor-${index}`" class="block text-xs text-muted mb-1">Armor rating</label>
            <input
              :id="`ow-item-armor-${index}`"
              v-model.number="item.armorRating"
              type="number"
              min="0"
              class="input-field w-full px-2 py-1 border border-input rounded-md"
            />
          </div>
          <label
            v-if="item.kind === 'weapon' || item.kind === 'armor'"
            class="inline-flex items-center gap-1 text-sm mb-1"
          >
            <input v-model="item.heavy" type="checkbox" />
            <BaseTooltip text="A display label for now — heavy weapons/armor are clumsy and hard to hide.">
              Heavy
            </BaseTooltip>
          </label>
          <div class="flex-1 min-w-[10rem]">
            <label :for="`ow-item-notes-${index}`" class="block text-xs text-muted mb-1">Notes</label>
            <input
              :id="`ow-item-notes-${index}`"
              v-model="item.notes"
              type="text"
              class="input-field w-full px-2 py-1 border border-input rounded-md"
              placeholder="Optional"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="kind in OFFWORLDERS_ITEM_KINDS"
        :key="kind"
        type="button"
        class="px-3 py-2 rounded-md text-sm"
        style="background-color: var(--color-third-200)"
        @click="addItem(kind)"
      >
        + {{ OFFWORLDERS_ITEM_KIND_LABELS[kind] }}
      </button>
    </div>

    <!-- Starting gear choice (rules p.6) -->
    <div class="mb-2 flex flex-wrap items-center gap-2 text-sm" style="color: var(--color-third-600)">
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
  </div>
</template>

<style scoped></style>
