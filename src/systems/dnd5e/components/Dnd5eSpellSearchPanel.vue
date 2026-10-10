<script setup>
/**
 * D&D 5e spell-search panel for the campaign view.
 *
 * Wraps the shared `SpellSearch` + `SpellDetailModal` (no character context, so
 * the "+ Add" affordance inside SpellSearch simply stays hidden). Rendered by
 * the campaign system dispatcher when a campaign's primary system is DND5E.
 */
import { ref } from 'vue'
import SpellSearch from '@/systems/dnd5e/components/SpellSearch.vue'
import SpellDetailModal from '@/systems/dnd5e/components/SpellDetailModal.vue'

const showSpellModal = ref(false)
const selectedSpell = ref(null)

function openSpellDetail(spell) {
  selectedSpell.value = spell
  showSpellModal.value = true
}

function closeSpellModal() {
  showSpellModal.value = false
  selectedSpell.value = null
}
</script>

<template>
  <div>
    <SpellSearch @spell-click="openSpellDetail" />
    <SpellDetailModal :spell="selectedSpell" :visible="showSpellModal" @close="closeSpellModal" />
  </div>
</template>
