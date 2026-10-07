<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useDnd5eSpellStore } from '@/systems/dnd5e/dnd5eSpellStore.js'
import SpellSearch from '@/systems/dnd5e/components/SpellSearch.vue'
import SpellCard from '@/systems/dnd5e/components/SpellCard.vue'
import SpellDetailModal from '@/systems/dnd5e/components/SpellDetailModal.vue'
import Dnd5eStatsPanel from '@/systems/dnd5e/components/Dnd5eStatsPanel.vue'
import BaseButton from '@/components/base/BaseButton.vue'

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

const spellStore = useDnd5eSpellStore()
const characterId = computed(() => props.character?.id)
const dnd5e = computed(() => props.character?.dnd5e || {})

const characterSpells = ref([])
const spellsLoading = ref(false)
const showSpellModal = ref(false)
const selectedSpell = ref(null)
const showSpellSearch = ref(false)
const removingSpellKey = ref(null)

async function fetchSpells() {
  if (!characterId.value) return
  spellsLoading.value = true
  try {
    characterSpells.value = await spellStore.fetchCharacterSpells(characterId.value)
  } catch {
    characterSpells.value = []
  } finally {
    spellsLoading.value = false
  }
}

onMounted(fetchSpells)
watch(characterId, fetchSpells)

function openSpellDetail(spell) {
  selectedSpell.value = spell
  showSpellModal.value = true
}

function closeSpellModal() {
  showSpellModal.value = false
  selectedSpell.value = null
}

async function saveSpellToCharacter(spell) {
  try {
    await spellStore.saveSpellToCharacter(characterId.value, spell)
    await fetchSpells()
  } catch {
    // Error is handled by the store
  }
}

async function removeSpellFromCharacter(spell) {
  const spellKey = spell.key || spell.slug
  if (!spellKey) return

  removingSpellKey.value = spellKey
  try {
    const success = await spellStore.removeSpellFromCharacter(characterId.value, spellKey)
    if (success) {
      await fetchSpells()
    }
  } finally {
    removingSpellKey.value = null
  }
}
</script>

<template>
  <div>
    <!-- Vitals -->
    <div class="p-6 border-t border-section">
      <h2 class="section-heading mb-4">Vitals</h2>
      <div class="flex flex-wrap gap-6" style="color: var(--color-third-700)">
        <p><strong>Race:</strong> {{ dnd5e.race }}</p>
        <p><strong>Class:</strong> {{ dnd5e.characterClass }}</p>
        <p><strong>Level:</strong> {{ dnd5e.level }}</p>
        <p><strong>Hit Points:</strong> {{ dnd5e.hitPoints }}</p>
        <p><strong>Armor Class:</strong> {{ dnd5e.armorClass }}</p>
      </div>
    </div>

    <!-- Ability scores -->
    <div class="p-6" style="background-color: var(--color-third-50)">
      <h2 class="section-heading mb-4">Ability Scores</h2>
      <Dnd5eStatsPanel :stats="dnd5e.stats" />
    </div>

    <!-- Spells -->
    <div class="p-6 border-t border-section">
      <div class="flex items-center justify-between mb-4">
        <h2 class="section-heading">Spells</h2>
        <BaseButton
          v-if="isOwner"
          variant="default"
          @click="showSpellSearch = !showSpellSearch"
        >
          {{ showSpellSearch ? 'Hide Search' : 'Search Spells to add' }}
        </BaseButton>
      </div>

      <div v-if="showSpellSearch" class="mb-6">
        <SpellSearch
          :character-id="characterId"
          @spell-click="openSpellDetail"
          @save="saveSpellToCharacter"
        />
      </div>

      <div v-if="spellsLoading" class="text-center py-4">
        <div class="spinner h-6 w-6 border-t-2 border-b-2"></div>
        <span class="ml-2" style="color: var(--color-third-500)">Loading spells...</span>
      </div>

      <div v-else-if="characterSpells.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SpellCard
          v-for="spell in characterSpells"
          :key="spell.key"
          :spell="spell"
          :show-remove="isOwner"
          :is-removing="removingSpellKey === (spell.key || spell.slug)"
          @click="openSpellDetail"
          @remove="removeSpellFromCharacter"
        />
      </div>

      <div v-else class="text-center py-4" style="color: var(--color-third-400)">
        <p>No spells saved yet. Use the "Search Spells to add" button to find and save spells.</p>
      </div>
    </div>

    <!-- Spell detail modal -->
    <SpellDetailModal :spell="selectedSpell" :visible="showSpellModal" @close="closeSpellModal" />
  </div>
</template>
