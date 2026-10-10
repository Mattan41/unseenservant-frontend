<script setup>
/**
 * Presentational Offworlders ship sheet (form/display only).
 *
 * Mirrors the printed ship sheet (p.26) but stays simple: name, vitals,
 * the upgrade checklist and a free-text notes/look area. Every participant may
 * edit; the parent owns saving (and the optimistic-concurrency reload flow).
 *
 * Props in, events out — no store access.
 */
import { reactive, ref, watch } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import {
  OFFWORLDERS_SHIP_STARTING_UPGRADES,
  OFFWORLDERS_SHIP_UPGRADES,
  addShipUpgrade,
  createEmptyShipData,
  removeShipUpgrade,
  shipUpgradeCount,
  shipUpgradeMaxCount,
} from '@/systems/offworlders/shipConstants.js'

const props = defineProps({
  /** Normalized ship data block. */
  ship: {
    type: Object,
    required: true,
  },
  /** Parent-controlled saving state. */
  saving: {
    type: Boolean,
    default: false,
  },
  /** True when the last save was rejected because someone else edited first. */
  conflict: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save', 'reload'])

const editing = ref(false)
const draft = reactive(createEmptyShipData())

function resetDraft() {
  Object.assign(draft, createEmptyShipData(), props.ship)
  draft.upgrades = [...(props.ship.upgrades || [])]
}

// Reset the draft (and leave edit mode) whenever the source ship changes —
// e.g. after a successful save or a reload.
watch(
  () => props.ship,
  () => {
    resetDraft()
    editing.value = false
  },
  { immediate: true, deep: true },
)

function startEditing() {
  resetDraft()
  editing.value = true
}

function cancelEditing() {
  resetDraft()
  editing.value = false
}

function count(upgrade) {
  return shipUpgradeCount(draft.upgrades, upgrade.name)
}

function maxCount(upgrade) {
  return shipUpgradeMaxCount(upgrade.name)
}

function addUpgrade(name) {
  draft.upgrades = addShipUpgrade(draft.upgrades, name)
}

function removeUpgrade(name) {
  draft.upgrades = removeShipUpgrade(draft.upgrades, name)
}

function submit() {
  emit('save', { ...draft, version: props.ship.version })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Optimistic-concurrency notice -->
    <div v-if="conflict" class="error-message flex flex-wrap items-center justify-between gap-2">
      <span>This ship was changed by someone else. Reload to see the latest before editing.</span>
      <BaseButton variant="retry" @click="$emit('reload')">Reload</BaseButton>
    </div>

    <!-- Header / actions -->
    <div class="flex flex-wrap justify-between items-center gap-2">
      <h3 class="section-heading">Offworlders Ship</h3>
      <div class="flex gap-2">
        <template v-if="editing">
          <BaseButton variant="ghost" :disabled="saving" @click="cancelEditing">Cancel</BaseButton>
          <BaseButton variant="update" :loading="saving" @click="submit">Save ship</BaseButton>
        </template>
        <BaseButton v-else variant="default" @click="startEditing">Edit ship</BaseButton>
      </div>
    </div>

    <!-- Ship name -->
    <div>
      <label for="ship-name" class="block text-sm font-medium text-default mb-1">Ship name</label>
      <input
        id="ship-name"
        v-model="draft.name"
        type="text"
        class="input-field p-2 rounded w-full"
        :disabled="!editing"
        placeholder="The Desert Rose"
      />
    </div>

    <!-- Vitals: Hull / Max, Armor, Damage, Fuel / Max -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <label for="ship-hull" class="block text-xs uppercase text-muted mb-1">Hull</label>
        <input
          id="ship-hull"
          v-model.number="draft.hull"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
        />
      </div>
      <div>
        <label for="ship-hull-max" class="block text-xs uppercase text-muted mb-1">Hull max</label>
        <input
          id="ship-hull-max"
          v-model.number="draft.hullMax"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
        />
      </div>
      <div>
        <label for="ship-armor" class="block text-xs uppercase text-muted mb-1">Armor</label>
        <input
          id="ship-armor"
          v-model.number="draft.armor"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
        />
      </div>
      <div>
        <label for="ship-damage" class="block text-xs uppercase text-muted mb-1">Damage</label>
        <input
          id="ship-damage"
          v-model="draft.damage"
          type="text"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
          placeholder="1D6"
        />
      </div>
      <div>
        <label for="ship-fuel" class="block text-xs uppercase text-muted mb-1">Drive fuel</label>
        <input
          id="ship-fuel"
          v-model.number="draft.driveFuel"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
        />
      </div>
      <div>
        <label for="ship-fuel-max" class="block text-xs uppercase text-muted mb-1">
          Max drive fuel
        </label>
        <input
          id="ship-fuel-max"
          v-model.number="draft.maxDriveFuel"
          type="number"
          min="0"
          class="input-field p-2 rounded w-full"
          :disabled="!editing"
        />
      </div>
    </div>

    <!-- Upgrades -->
    <div class="border-t border-section pt-4">
      <div class="flex flex-wrap justify-between items-baseline gap-2 mb-3">
        <h4 class="font-semibold text-default">Upgrades</h4>
        <span class="text-xs text-muted">
          {{ draft.upgrades.length }} taken · choose {{ OFFWORLDERS_SHIP_STARTING_UPGRADES }} when
          making the ship. * can be taken twice.
        </span>
      </div>

      <ul class="flex flex-col gap-3">
        <li
          v-for="upgrade in OFFWORLDERS_SHIP_UPGRADES"
          :key="upgrade.name"
          class="flex items-start justify-between gap-3"
        >
          <div class="min-w-0">
            <p class="font-medium text-default">
              {{ upgrade.name }}<span v-if="upgrade.repeatable" class="text-subtle"> *</span>
            </p>
            <p class="text-sm text-secondary">{{ upgrade.description }}</p>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <template v-if="editing">
              <BaseButton
                variant="ghost"
                class="px-2"
                :disabled="count(upgrade) === 0"
                :aria-label="`Remove ${upgrade.name}`"
                @click="removeUpgrade(upgrade.name)"
              >
                −
              </BaseButton>
              <span class="w-6 text-center text-default">{{ count(upgrade) }}</span>
              <BaseButton
                variant="ghost"
                class="px-2"
                :disabled="count(upgrade) >= maxCount(upgrade)"
                :aria-label="`Add ${upgrade.name}`"
                @click="addUpgrade(upgrade.name)"
              >
                +
              </BaseButton>
            </template>
            <span v-else class="chip">{{ count(upgrade) > 0 ? `×${count(upgrade)}` : '—' }}</span>
          </div>
        </li>
      </ul>
    </div>

    <!-- Notes: free text for passengers, cargo, condition, anything else -->
    <div class="border-t border-section pt-4">
      <div class="flex flex-wrap justify-between items-baseline gap-2 mb-3">
        <h4 class="font-semibold text-default">Notes</h4>
        <span class="text-xs text-muted">
          Extra passengers, cargo, ship condition — anything else worth tracking
        </span>
      </div>
      <textarea
        id="ship-notes"
        v-model="draft.notes"
        rows="4"
        class="input-field p-2 rounded w-full resize-none"
        :disabled="!editing"
        aria-label="Ship notes"
        placeholder="Extra passengers, cargo, ship condition, damage — or whatever else you want to note about the ship..."
      ></textarea>
    </div>
  </div>
</template>
