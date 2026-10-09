<script setup>
import { computed, ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseTooltip from '@/components/base/BaseTooltip.vue'
import IconButton from '@/components/base/IconButton.vue'
import OffworldersGearForm from '@/systems/offworlders/components/OffworldersGearForm.vue'
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
  addListValue,
  removeListValue,
  toggleListValue,
} from '@/systems/offworlders/constants.js'

// Two-way bound to the `offworlders` block of the character form model.
const offworlders = defineModel({ type: Object, required: true })

const customSkill = ref('')
const customAbility = ref('')

const classInfo = computed(() => OFFWORLDERS_CLASS_INFO[offworlders.value.characterClass] || null)
const suggestedSkills = computed(() => suggestedSkillsForClass(offworlders.value.characterClass))
const derivedHealth = computed(() => deriveHealth(offworlders.value.stats))

// Every class's abilities, grouped, so the form can show them all and simply
// highlight the ones tied to the selected class (mirrors how skills work).
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
        <p v-if="classInfo" class="text-xs mt-1" style="color: var(--color-third-500)">
          {{ classInfo.blurb }}
        </p>
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
    <h3 class="text-lg font-semibold mb-3" style="color: var(--color-primary-700)">Vitals</h3>
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
        <!-- remove ! once base-button.css is layered -->
        <BaseButton type="button" variant="link" class="!mt-1" @click="applyDerivedHealth">
          Use derived ({{ derivedHealth }})
        </BaseButton>
      </div>
      <div class="mb-4">
        <label for="ow-armor" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip text="Subtract your armor rating from incoming damage. Set it via the gear section below, or override it here.">
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
          <BaseTooltip text="Supply abstracts the tools you carry: spend 1 to produce a mundane item. It refills on downtime aboard the ship, and the maximum is always 3.">
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
          <span class="text-sm" style="color: var(--color-third-500)">/ {{ OFFWORLDERS_SUPPLY_MAX }}</span>
        </div>
      </div>
      <div class="mb-4">
        <label for="ow-credits" class="block text-sm font-medium text-default mb-1">
          <BaseTooltip text="The game's smallest tracked currency unit. You start with 3 (or 10 if you traded armor for credits).">
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
    <h3 class="text-lg font-semibold mb-1" style="color: var(--color-primary-700)">
      <BaseTooltip text="A starting character uses the standard array. You are free to deviate — this is guidance, not a rule.">
        Attributes
      </BaseTooltip>
    </h3>
    <p class="text-xs mb-3" style="color: var(--color-third-500)">
      Assign each of
      <strong>{{ OFFWORLDERS_STANDARD_ARRAY.join(', ') }}</strong>
      once, in any order.
      <span
        :style="{ color: arrayMatches ? 'var(--color-third-500)' : 'var(--color-secondary-700)' }"
      >
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
    <h3 class="text-lg font-semibold mb-1" style="color: var(--color-primary-700)">
      <BaseTooltip text="Choose any two skills. You are not limited to the list — add custom skills below.">
        Skills
      </BaseTooltip>
      <span class="text-sm font-normal" style="color: var(--color-third-500)">
        — pick two ({{ offworlders.skills.length }} chosen)
      </span>
    </h3>
    <p v-if="suggestedSkills.length" class="text-xs mb-3" style="color: var(--color-third-500)">
      Highlighted skills are the usual picks for a {{ offworlders.characterClass }} — suggestions only.
    </p>
    <div class="flex flex-wrap gap-3 mb-3">
      <label
        v-for="skill in orderedSkills"
        :key="skill"
        class="inline-flex items-center gap-1 text-sm"
        :style="
          isSuggestedSkill(skill) ? 'background-color: var(--color-third-100); border-radius: 4px; padding: 0 4px;' : ''
        "
      >
        <input
          type="checkbox"
          :checked="offworlders.skills.includes(skill)"
          @change="toggleSkill(skill)"
        />
        <BaseTooltip
          v-if="OFFWORLDERS_SKILL_DESCRIPTIONS[skill]"
          :text="OFFWORLDERS_SKILL_DESCRIPTIONS[skill]"
        >{{ skill }}</BaseTooltip>
        <template v-else>{{ skill }}</template>
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
    <h3 class="text-lg font-semibold mb-1" style="color: var(--color-primary-700)">
      <BaseTooltip text="Choose any two abilities. The group matching your class is highlighted; with 'No class', pick any two. Custom abilities are allowed too.">
        Abilities
      </BaseTooltip>
      <span class="text-sm font-normal" style="color: var(--color-third-500)">
        — pick two ({{ offworlders.abilities.length }} chosen)
      </span>
    </h3>
    <p v-if="offworlders.characterClass" class="text-xs mb-3" style="color: var(--color-third-500)">
      {{ offworlders.characterClass }} abilities are highlighted — suggestions only.
    </p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
      <div
        v-for="group in abilityGroups"
        :key="group.className"
        class="p-2 rounded-md"
        :style="
          group.className === offworlders.characterClass
            ? 'background-color: var(--color-third-100)'
            : ''
        "
      >
        <p class="text-xs font-semibold uppercase mb-1" style="color: var(--color-third-500)">
          {{ group.className }}
        </p>
        <div class="flex flex-wrap gap-3">
          <label
            v-for="ability in group.abilities"
            :key="ability"
            class="inline-flex items-center gap-1 text-sm"
          >
            <input
              type="checkbox"
              :checked="offworlders.abilities.includes(ability)"
              @change="toggleAbility(ability)"
            />
            <BaseTooltip
              v-if="OFFWORLDERS_ABILITY_DESCRIPTIONS[ability]"
              :text="OFFWORLDERS_ABILITY_DESCRIPTIONS[ability]"
            >{{ ability }}</BaseTooltip>
            <template v-else>{{ ability }}</template>
          </label>
        </div>
      </div>
    </div>
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
    <div v-if="offworlders.abilities.length" class="flex flex-wrap gap-2 mb-6">
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
    <p v-else class="text-sm mb-6" style="color: var(--color-third-400)">
      No abilities selected yet.
    </p>

    <!-- Gear -->
    <OffworldersGearForm
      v-model:gear="offworlders.gear"
      v-model:armor="offworlders.armor"
      v-model:credits="offworlders.credits"
    />
  </div>
</template>
