<script setup>
import { computed, ref, watchEffect } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseTooltip from '@/components/base/BaseTooltip.vue'
import IconButton from '@/components/base/IconButton.vue'
import OffworldersGearForm from '@/systems/offworlders/components/OffworldersGearForm.vue'
import {
  OFFWORLDERS_CLASSES,
  OFFWORLDERS_ATTRIBUTES,
  OFFWORLDERS_ATTRIBUTE_DESCRIPTIONS,
  OFFWORLDERS_ATTRIBUTE_MIN,
  OFFWORLDERS_ATTRIBUTE_MAX,
  OFFWORLDERS_SKILLS,
  OFFWORLDERS_SKILL_DESCRIPTIONS,
  OFFWORLDERS_ABILITIES,
  OFFWORLDERS_ABILITY_DESCRIPTIONS,
  OFFWORLDERS_CLASS_INFO,
  OFFWORLDERS_SUPPLY_MAX,
  OFFWORLDERS_STANDARD_ARRAY,
  OFFWORLDERS_ARMOR_OPTIONS,
  offworldersVitals,
  standardArrayUsage,
  suggestedSkillsForClass,
  resolveEntryDescription,
  toggleEntry,
  addEntry,
  removeEntry,
} from '@/systems/offworlders/constants.js'

// Two-way bound to the `offworlders` block of the character form model.
const offworlders = defineModel({ type: Object, required: true })

const customSkill = ref({ name: '', description: '' })
const customAbility = ref({ name: '', description: '' })

// Mobile-only info overlays (the full catalog is too long to inline).
const showDescriptions = ref(false)
const showAttributes = ref(false)

const classInfo = computed(() => OFFWORLDERS_CLASS_INFO[offworlders.value.characterClass] || null)
const suggestedSkills = computed(() => suggestedSkillsForClass(offworlders.value.characterClass))

// Vitals follow their source automatically, including the passive bonuses from
// the selected abilities (Hardy's +4 Health, Unstoppable's +1 armor) and the
// manual Health Misc ±. A hand-written value is never needed.
const vitals = computed(() => offworldersVitals(offworlders.value))
const abilityBonus = computed(() => vitals.value.abilityBonus)
const derivedHealth = computed(() => vitals.value.maxHealth)
const healthBonusHint = computed(() =>
  abilityBonus.value.healthSources.length
    ? `+${abilityBonus.value.health} from ${abilityBonus.value.healthSources.join(', ')}`
    : '',
)
// Armor is a single chosen value; only the passive ability bonus is added on
// top for display, so the stored value stays the player's pick.
const effectiveArmorValue = computed(() => vitals.value.effectiveArmor)

// Keep the derived Max Health in step with its source. Current HP and the
// chosen Armor are left alone (both are deliberate player input).
watchEffect(() => {
  offworlders.value.health = derivedHealth.value
})

// Every class's abilities, grouped, so the form can show them all and simply
// highlight the ones tied to the selected class.
const abilityGroups = computed(() =>
  OFFWORLDERS_CLASSES.map((className) => ({
    className,
    abilities: OFFWORLDERS_ABILITIES[className],
  })),
)

const arrayUsage = computed(() => standardArrayUsage(offworlders.value.stats))
const arrayMatches = computed(() => arrayUsage.value.used === OFFWORLDERS_STANDARD_ARRAY.length)

// Show the class's suggested skills first, then the remaining canonical ones.
const orderedSkills = computed(() => {
  const suggested = suggestedSkills.value
  return [...suggested, ...OFFWORLDERS_SKILLS.filter((skill) => !suggested.includes(skill))]
})

function isSuggestedSkill(skill) {
  return suggestedSkills.value.includes(skill)
}

function skillEntry(name) {
  return offworlders.value.skills.find((entry) => entry.name === name)
}
function abilityEntry(name) {
  return offworlders.value.abilities.find((entry) => entry.name === name)
}
function skillDescription(name) {
  return resolveEntryDescription(skillEntry(name) ?? { name }, OFFWORLDERS_SKILL_DESCRIPTIONS)
}
function abilityDescription(name) {
  return resolveEntryDescription(abilityEntry(name) ?? { name }, OFFWORLDERS_ABILITY_DESCRIPTIONS)
}

function toggleSkill(skill) {
  offworlders.value.skills = toggleEntry(offworlders.value.skills, skill)
}
function toggleAbility(ability) {
  offworlders.value.abilities = toggleEntry(offworlders.value.abilities, ability)
}
function addCustomSkill() {
  offworlders.value.skills = addEntry(
    offworlders.value.skills,
    customSkill.value.name,
    customSkill.value.description,
  )
  customSkill.value = { name: '', description: '' }
}
function addCustomAbility() {
  offworlders.value.abilities = addEntry(
    offworlders.value.abilities,
    customAbility.value.name,
    customAbility.value.description,
  )
  customAbility.value = { name: '', description: '' }
}
function removeSkill(name) {
  offworlders.value.skills = removeEntry(offworlders.value.skills, name)
}
function removeAbility(name) {
  offworlders.value.abilities = removeEntry(offworlders.value.abilities, name)
}
</script>

<template>
  <div>
    <!-- Basic Offworlders info -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="mb-4">
        <label for="ow-class" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip
            text="Optional. A class suggests abilities and a couple of skills, but nothing is locked — experienced players can choose 'No class' and build from anything."
          >
            Class
          </BaseTooltip>
        </label>
        <select
          id="ow-class"
          v-model="offworlders.characterClass"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        >
          <option value="">No class — pick any skills &amp; abilities</option>
          <option v-for="charClass in OFFWORLDERS_CLASSES" :key="charClass" :value="charClass">
            {{ charClass }}
          </option>
        </select>
        <p v-if="classInfo" class="text-xs mt-1 text-muted">{{ classInfo.blurb }}</p>
      </div>

      <BaseInput
        class="mb-4"
        v-model="offworlders.species"
        label="Species"
        tooltip="Offworlders has no species rules — decide as a group whether aliens exist. Not a core sheet field."
        placeholder="e.g. Human, Synthetic"
      />
    </div>

    <!-- Vitals -->
    <h3 class="section-heading mb-3">Vitals</h3>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <BaseInput
        class="mb-4"
        :model-value="derivedHealth"
        type="number"
        label="Max Health"
        tooltip="Maximum Health = 12 + Strength + Agility, plus passive bonuses from your abilities (e.g. Hardy's +4) and Misc. Calculated automatically."
        :hint="healthBonusHint"
        disabled
      />
      <BaseInput
        class="mb-4"
        v-model="offworlders.healthModifier"
        type="number"
        label="Health Misc ±"
        tooltip="Any other flat ± to Max Health, on top of what your abilities already grant."
      />
      <BaseInput
        class="mb-4"
        v-model="offworlders.currentHealth"
        type="number"
        label="Current HP"
        tooltip="Your running HP. Damage reduces it — it may go above Max Health to hold temporary HP."
        :min="0"
      />
      <div class="mb-4">
        <label for="ow-armor" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip
            text="The armor you are wearing. Passive ability bonuses (e.g. Unstoppable's +1) are added on top automatically."
            desktop-only
          >
            Armor
          </BaseTooltip>
        </label>
        <select
          id="ow-armor"
          v-model.number="offworlders.armor"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        >
          <option
            v-for="option in OFFWORLDERS_ARMOR_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.value }} — {{ option.label }}
          </option>
        </select>
        <p v-if="abilityBonus.armorSources.length" class="text-xs mt-1 text-muted">
          Effective {{ effectiveArmorValue }} (+{{ abilityBonus.armor }} from
          {{ abilityBonus.armorSources.join(', ') }})
        </p>
      </div>
      <div class="mb-4">
        <label for="ow-supply" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip
            text="Supply abstracts the tools you carry: spend 1 to produce a mundane item. It refills on downtime aboard the ship, and the maximum is always 3."
          >
            Supply
          </BaseTooltip>
        </label>
        <div class="flex items-center gap-2">
          <input
            id="ow-supply"
            v-model.number="offworlders.supply"
            type="number"
            min="0"
            :max="OFFWORLDERS_SUPPLY_MAX"
            class="input-field w-full px-3 py-2 border border-input rounded-md"
          />
          <span class="text-sm text-muted">/ {{ OFFWORLDERS_SUPPLY_MAX }}</span>
        </div>
      </div>
      <BaseInput
        class="mb-4"
        v-model="offworlders.credits"
        type="number"
        label="Credits"
        tooltip="The game's smallest tracked currency unit. You start with 3 (or 10 if you traded armor for credits)."
        :min="0"
      />
      <BaseInput class="mb-4" v-model="offworlders.xp" type="number" label="XP" :min="0" />
    </div>

    <!-- Attributes -->
    <div class="flex items-center gap-2 mb-1">
      <h3 class="section-heading">
        <BaseTooltip text="A starting character uses the standard array. You are free to deviate — this is guidance, not a rule.">
          Attributes
        </BaseTooltip>
      </h3>
      <span class="md:hidden">
        <IconButton icon="info" label="Attribute rules" @click="showAttributes = true" />
      </span>
    </div>
    <p class="text-xs mb-3 text-muted">
      Assign each of
      <strong>{{ OFFWORLDERS_STANDARD_ARRAY.join(', ') }}</strong>
      once, in any order.
      <span :class="arrayMatches ? 'text-muted' : 'text-warning'">
        ({{ arrayUsage.used }}/{{ arrayUsage.total }} of the array used)
      </span>
    </p>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <BaseInput
        v-for="attr in OFFWORLDERS_ATTRIBUTES"
        :key="attr"
        class="mb-4"
        v-model="offworlders.stats[attr]"
        type="number"
        :label="attr"
        label-class="capitalize"
        :min="OFFWORLDERS_ATTRIBUTE_MIN"
        :max="OFFWORLDERS_ATTRIBUTE_MAX"
      />
    </div>

    <!-- Skills -->
    <div class="flex items-center gap-2 mb-1">
      <h3 class="section-heading">
        <BaseTooltip text="Skills you are trained in. The list is a starting point — add as many custom skills as you like.">
          Skills
        </BaseTooltip>
      </h3>
      <span class="text-sm text-muted">({{ offworlders.skills.length }} chosen)</span>
      <span class="md:hidden">
        <IconButton icon="info" label="Skill and ability descriptions" @click="showDescriptions = true" />
      </span>
    </div>
    <p v-if="suggestedSkills.length" class="text-xs mb-3 text-muted">
      Highlighted skills are the usual picks for a {{ offworlders.characterClass }} — suggestions only.
    </p>
    <div class="flex flex-wrap gap-3 mb-3">
      <label
        v-for="skill in orderedSkills"
        :key="skill"
        class="inline-flex items-center gap-1 text-sm text-default"
        :class="isSuggestedSkill(skill) ? 'suggested-choice' : ''"
      >
        <input type="checkbox" :checked="!!skillEntry(skill)" @change="toggleSkill(skill)" />
        <BaseTooltip
          v-if="skillDescription(skill)"
          :text="skillDescription(skill)"
          desktop-only
        >
          {{ skill }}
        </BaseTooltip>
        <template v-else>{{ skill }}</template>
      </label>
    </div>
    <div class="flex flex-wrap gap-2 mb-3">
      <input
        v-model="customSkill.name"
        type="text"
        class="input-field flex-1 min-w-[10rem] px-3 py-2 border border-input rounded-md"
        placeholder="Custom skill name"
      />
      <input
        v-model="customSkill.description"
        type="text"
        class="input-field flex-[2] min-w-[12rem] px-3 py-2 border border-input rounded-md"
        placeholder="Description (shown on hover)"
        @keyup.enter.prevent="addCustomSkill"
      />
      <BaseButton variant="add" type="button" @click="addCustomSkill">Add</BaseButton>
    </div>
    <div v-if="offworlders.skills.length" class="flex flex-wrap gap-2 mb-6">
      <span v-for="entry in offworlders.skills" :key="entry.name" class="chip">
        <BaseTooltip
          v-if="skillDescription(entry.name)"
          :text="skillDescription(entry.name)"
          desktop-only
        >
          {{ entry.name }}
        </BaseTooltip>
        <template v-else>{{ entry.name }}</template>
        <IconButton variant="chip" :label="`Remove ${entry.name}`" @click="removeSkill(entry.name)">
          ×
        </IconButton>
      </span>
    </div>
    <p v-else class="text-sm mb-6 text-subtle">No skills selected yet.</p>

    <!-- Abilities -->
    <div class="flex items-center gap-2 mb-1">
      <h3 class="section-heading">
        <BaseTooltip text="Abilities from your class (or any others). The highlighted group matches your class; add custom abilities too.">
          Abilities
        </BaseTooltip>
      </h3>
      <span class="text-sm text-muted">({{ offworlders.abilities.length }} chosen)</span>
      <span class="md:hidden">
        <IconButton icon="info" label="Skill and ability descriptions" @click="showDescriptions = true" />
      </span>
    </div>
    <p v-if="offworlders.characterClass" class="text-xs mb-3 text-muted">
      {{ offworlders.characterClass }} abilities are highlighted — suggestions only.
    </p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
      <div
        v-for="group in abilityGroups"
        :key="group.className"
        class="p-2 rounded-md"
        :class="group.className === offworlders.characterClass ? 'suggested-choice-group' : ''"
      >
        <p class="text-xs font-semibold uppercase mb-1 text-muted">{{ group.className }}</p>
        <div class="flex flex-wrap gap-3">
          <label
            v-for="ability in group.abilities"
            :key="ability"
            class="inline-flex items-center gap-1 text-sm text-default"
          >
            <input type="checkbox" :checked="!!abilityEntry(ability)" @change="toggleAbility(ability)" />
            <BaseTooltip
              v-if="abilityDescription(ability)"
              :text="abilityDescription(ability)"
              desktop-only
            >
              {{ ability }}
            </BaseTooltip>
            <template v-else>{{ ability }}</template>
          </label>
        </div>
      </div>
    </div>
    <div class="flex flex-wrap gap-2 mb-3">
      <input
        v-model="customAbility.name"
        type="text"
        class="input-field flex-1 min-w-[10rem] px-3 py-2 border border-input rounded-md"
        placeholder="Custom ability name"
      />
      <input
        v-model="customAbility.description"
        type="text"
        class="input-field flex-[2] min-w-[12rem] px-3 py-2 border border-input rounded-md"
        placeholder="Description (shown on hover)"
        @keyup.enter.prevent="addCustomAbility"
      />
      <BaseButton variant="add" type="button" @click="addCustomAbility">Add</BaseButton>
    </div>
    <div v-if="offworlders.abilities.length" class="flex flex-wrap gap-2 mb-6">
      <span v-for="entry in offworlders.abilities" :key="entry.name" class="chip">
        <BaseTooltip
          v-if="abilityDescription(entry.name)"
          :text="abilityDescription(entry.name)"
          desktop-only
        >
          {{ entry.name }}
        </BaseTooltip>
        <template v-else>{{ entry.name }}</template>
        <IconButton
          variant="chip"
          :label="`Remove ${entry.name}`"
          @click="removeAbility(entry.name)"
        >
          ×
        </IconButton>
      </span>
    </div>
    <p v-else class="text-sm mb-6 text-subtle">No abilities selected yet.</p>

    <!-- Gear (typed weapons + free-text items) -->
    <OffworldersGearForm
      v-model:weapons="offworlders.weapons"
      v-model:items="offworlders.items"
      v-model:credits="offworlders.credits"
      v-model:armor="offworlders.armor"
    />

    <!-- Mobile info overlays (the full catalog does not fit inline). -->
    <BaseModal v-if="showDescriptions" @close="showDescriptions = false">
      <div
        class="bg-[var(--color-surface)] rounded-lg shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto p-4 text-left"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="section-heading">Skills &amp; Abilities</h3>
          <IconButton icon="close" label="Close" @click="showDescriptions = false" />
        </div>

        <h4 class="text-sm font-semibold uppercase mb-2 text-muted">Skills</h4>
        <ul class="flex flex-col gap-2 mb-4">
          <li v-for="skill in OFFWORLDERS_SKILLS" :key="skill">
            <span class="font-medium text-default">{{ skill }}</span>
            <span class="block text-sm text-secondary">{{ OFFWORLDERS_SKILL_DESCRIPTIONS[skill] }}</span>
          </li>
        </ul>

        <h4 class="text-sm font-semibold uppercase mb-2 text-muted">Abilities</h4>
        <div v-for="group in abilityGroups" :key="group.className" class="mb-3">
          <p class="text-xs font-semibold uppercase mb-1 text-secondary">{{ group.className }}</p>
          <ul class="flex flex-col gap-2">
            <li v-for="ability in group.abilities" :key="ability">
              <span class="font-medium text-default">{{ ability }}</span>
              <span class="block text-sm text-secondary">
                {{ OFFWORLDERS_ABILITY_DESCRIPTIONS[ability] }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </BaseModal>

    <BaseModal v-if="showAttributes" @close="showAttributes = false">
      <div class="bg-[var(--color-surface)] rounded-lg shadow-lg w-full max-w-lg p-4 text-left">
        <div class="flex items-center justify-between mb-3">
          <h3 class="section-heading">Attributes</h3>
          <IconButton icon="close" label="Close" @click="showAttributes = false" />
        </div>
        <p class="text-sm mb-3 text-muted">
          Assign each of <strong>{{ OFFWORLDERS_STANDARD_ARRAY.join(', ') }}</strong> once, in any
          order (each attribute ranges {{ OFFWORLDERS_ATTRIBUTE_MIN }} to {{ OFFWORLDERS_ATTRIBUTE_MAX }}).
        </p>
        <ul class="flex flex-col gap-2">
          <li v-for="attr in OFFWORLDERS_ATTRIBUTES" :key="attr">
            <span class="font-medium capitalize text-default">{{ attr }}</span>
            <span class="block text-sm text-secondary">{{ OFFWORLDERS_ATTRIBUTE_DESCRIPTIONS[attr] }}</span>
          </li>
        </ul>
      </div>
    </BaseModal>
  </div>
</template>
