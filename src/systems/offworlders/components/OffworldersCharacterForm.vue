<script setup>
import { computed, ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseTooltip from '@/components/base/BaseTooltip.vue'
import IconButton from '@/components/base/IconButton.vue'
import OffworldersItemsForm from '@/systems/offworlders/components/OffworldersItemsForm.vue'
import {
  OFFWORLDERS_CLASSES,
  OFFWORLDERS_ATTRIBUTES,
  OFFWORLDERS_SKILLS,
  OFFWORLDERS_SKILL_DESCRIPTIONS,
  OFFWORLDERS_ABILITIES,
  OFFWORLDERS_ABILITY_DESCRIPTIONS,
  OFFWORLDERS_CLASS_INFO,
  OFFWORLDERS_ATTRIBUTE_MIN,
  OFFWORLDERS_ATTRIBUTE_MAX,
  OFFWORLDERS_ARMOR_MAX,
  OFFWORLDERS_SUPPLY_MAX,
  OFFWORLDERS_STANDARD_ARRAY,
  deriveHealth,
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

const classInfo = computed(() => OFFWORLDERS_CLASS_INFO[offworlders.value.characterClass] || null)
const suggestedSkills = computed(() => suggestedSkillsForClass(offworlders.value.characterClass))
const derivedHealth = computed(() => deriveHealth(offworlders.value.stats))

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
function applyDerivedHealth() {
  offworlders.value.health = derivedHealth.value
}
</script>

<template>
  <div>
    <!-- Basic Offworlders info -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="mb-4">
        <label for="ow-class" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip
            text="Optional. A class suggests two abilities, but you may pick any two. Experienced players can choose 'No class' and build from any two skills and any two abilities."
          >
            Class
          </BaseTooltip>
        </label>
        <select
          id="ow-class"
          v-model="offworlders.characterClass"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        >
          <option value="">No class — pick any two skills &amp; abilities</option>
          <option v-for="charClass in OFFWORLDERS_CLASSES" :key="charClass" :value="charClass">
            {{ charClass }}
          </option>
        </select>
        <p v-if="classInfo" class="text-xs mt-1 text-muted">{{ classInfo.blurb }}</p>
      </div>

      <div class="mb-4">
        <label for="ow-species" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip
            text="Offworlders has no species rules — decide as a group whether aliens exist. Not a core sheet field."
          >
            Species
          </BaseTooltip>
        </label>
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
      <label for="ow-look" class="block text-sm font-medium text-default mb-1">
        <BaseTooltip
          text="At least one distinct visual detail — clothing, a feature, or a possession — to help everyone picture the character."
        >
          Look
        </BaseTooltip>
      </label>
      <input
        id="ow-look"
        v-model="offworlders.look"
        type="text"
        class="input-field w-full px-3 py-2 border border-input rounded-md"
        placeholder="A short physical description"
      />
    </div>

    <!-- Vitals -->
    <h3 class="section-heading mb-3">Vitals</h3>
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div class="mb-4">
        <label for="ow-health" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip text="Maximum Health = 12 + Strength + Agility.">Health</BaseTooltip>
        </label>
        <input
          id="ow-health"
          v-model.number="offworlders.health"
          type="number"
          min="0"
          class="input-field w-full px-3 py-2 border border-input rounded-md"
        />
        <BaseButton
          variant="default"
          type="button"
          class="w-full mt-2"
          @click="applyDerivedHealth"
        >
          Use derived ({{ derivedHealth }})
        </BaseButton>
      </div>
      <div class="mb-4">
        <label for="ow-armor" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip
            text="Subtract your armor rating from incoming damage. Set it via the items section below, or override it here."
          >
            Armor (0-3)
          </BaseTooltip>
        </label>
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
      <div class="mb-4">
        <label for="ow-credits" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip
            text="The game's smallest tracked currency unit. You start with 3 (or 10 if you traded armor for credits)."
          >
            Credits
          </BaseTooltip>
        </label>
        <input
          id="ow-credits"
          v-model.number="offworlders.credits"
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
    <h3 class="section-heading mb-1">
      <BaseTooltip text="A starting character uses the standard array. You are free to deviate — this is guidance, not a rule.">
        Attributes
      </BaseTooltip>
    </h3>
    <p class="text-xs mb-3 text-muted">
      Assign each of
      <strong>{{ OFFWORLDERS_STANDARD_ARRAY.join(', ') }}</strong>
      once, in any order.
      <span :class="arrayMatches ? 'text-muted' : 'text-warning'">
        ({{ arrayUsage.used }}/{{ arrayUsage.total }} of the array used)
      </span>
    </p>
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
    <h3 class="section-heading mb-1">
      <BaseTooltip text="Choose any two skills. You are not limited to the list — add custom skills below.">
        Skills
      </BaseTooltip>
      <span class="text-sm font-normal normal-case text-muted">
        — pick two ({{ offworlders.skills.length }} chosen)
      </span>
    </h3>
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
        <BaseTooltip v-if="skillDescription(skill)" :text="skillDescription(skill)">
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
        <BaseTooltip v-if="skillDescription(entry.name)" :text="skillDescription(entry.name)">
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
    <h3 class="section-heading mb-1">
      <BaseTooltip text="Choose any two abilities. The group matching your class is highlighted; with 'No class', pick any two. Custom abilities are allowed too.">
        Abilities
      </BaseTooltip>
      <span class="text-sm font-normal normal-case text-muted">
        — pick two ({{ offworlders.abilities.length }} chosen)
      </span>
    </h3>
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
            <BaseTooltip v-if="abilityDescription(ability)" :text="abilityDescription(ability)">
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
        <BaseTooltip v-if="abilityDescription(entry.name)" :text="abilityDescription(entry.name)">
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

    <!-- Items -->
    <OffworldersItemsForm v-model:items="offworlders.items" v-model:credits="offworlders.credits" />
  </div>
</template>
