<script setup>
import { ref } from 'vue'
import SpellSearch from '@/features/spell/components/SpellSearch.vue'
import SpellDetailModal from '@/features/spell/components/SpellDetailModal.vue'

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
  <div class="container mx-auto p-4 max-w-4xl">
    <h1>Spells</h1>
    <SpellSearch @spell-click="openSpellDetail" />

    <SpellDetailModal :spell="selectedSpell" :visible="showSpellModal" @close="closeSpellModal" />
  </div>
</template>
