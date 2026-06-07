<script setup>
import { computed, onMounted, ref } from 'vue'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { useSpellStore } from '@/features/spell/spellStore.js'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import SpellSearch from '@/features/spell/components/SpellSearch.vue'
import SpellCard from '@/features/spell/components/SpellCard.vue'

const characterStore = useCharacterStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const spellStore = useSpellStore()
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const characterId = computed(() => route.params.id)
const from = route.query.from || 'characterList'
const campaignId = route.query.campaignId || null

const { userId } = storeToRefs(userStore)
const { currentCharacter } = storeToRefs(characterStore)

const characterSpells = ref([])
const spellsLoading = ref(false)
const showSpellModal = ref(false)
const selectedSpell = ref(null)
const showSpellSearch = ref(false)
const removingSpellKey = ref(null)

onMounted(async () => {
  try {
    await characterStore.fetchCharacter(characterId.value)
    await fetchSpells()
  } finally {
    loading.value = false
  }
})

async function fetchSpells() {
  spellsLoading.value = true
  try {
    characterSpells.value = await spellStore.fetchCharacterSpells(characterId.value)
  } catch {
    characterSpells.value = []
  } finally {
    spellsLoading.value = false
  }
}

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

const isOwner = computed(
  () =>
    !!currentCharacter.value &&
    !!userId.value &&
    String(currentCharacter.value.ownerId) === String(userId.value),
)
// TODO: extract to src/features/spell/spellUtils.js as formatSpellLevel()
// Same logic exists in SpellCard (levelLabel) and SpellSearch (getSpellLevel)
const spellLevel = computed(() => {
  if (!selectedSpell.value) return ''
  const level = selectedSpell.value.level
  if (level === 0 || level === '0') return 'Cantrip'
  const suffix = level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'
  return `${level}${suffix} level`
})

const spellSchoolName = computed(() => selectedSpell.value?.school || null)

const spellDocumentName = computed(() => selectedSpell.value?.sourceLabel || null)

const spellComponents = computed(() => selectedSpell.value?.components?.join(', ') || null)


const deleteCharacter = async () => {
  if (confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
    const success = await characterStore.deleteCharacter(characterId.value)
    if (success) {
      notificationStore.addNotification('Character deleted successfully!', 'success', 3000)
      await router.push({ name: 'CharactersView' })
    }
  }
}
</script>

<template>
  <div class="container mx-auto p-4 max-w-4xl">
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      <p class="mt-2 text-third-600">Loading character...</p>
    </div>

    <!-- Not found state -->
    <div v-else-if="!currentCharacter" class="text-center py-8">
      <p class="text-third-600">Character not found.</p>
      <router-link
        :to="{ name: 'CharactersView' }"
        class="mt-4 inline-block button button-primary"
      >
        Back to Character List
      </router-link>
    </div>

    <!-- Main content -->
    <div v-else>
      <div class="bg-primary-50 rounded-lg shadow-lg overflow-hidden">

        <!-- Action bar -->
        <div v-if="isOwner" class="flex justify-end p-2 space-x-2">
          <router-link
            :to="{
              name: 'EditCharacter',
              params: { id: currentCharacter.id },
              query: from === 'campaign' && campaignId ? { from, campaignId } : {},
            }"
            class="button button-secondary"
          >
            Edit
          </router-link>
          <button @click="deleteCharacter" class="button button-remove">Delete</button>
        </div>

        <!-- Character header: image + basic info -->
        <div class="p-6 border-b border-third-200">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div class="flex flex-col items-center md:items-start">
              <CharacterImage
                :src="currentCharacter.imageUrl"
                alt="Character portrait"
                class="w-64 h-64 rounded-lg border-2 border-primary-300 shadow-md mb-2"
              />
              <h3 class="text-xl font-bold text-third-700">{{ currentCharacter.name }}</h3>
            </div>
            <div class="flex flex-col justify-center text-third-700 md:col-span-1">
              <div class="space-y-2">
                <p><strong>Race:</strong> {{ currentCharacter.race }}</p>
                <p><strong>Class:</strong> {{ currentCharacter.characterClass }}</p>
                <p><strong>Level:</strong> {{ currentCharacter.level }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="p-6 bg-third-50">
          <h2 class="section-heading mb-4">Character Stats</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div v-if="currentCharacter.playerCharacterData">
              <div
                v-for="(value, stat) in currentCharacter.playerCharacterData"
                :key="stat"
                class="bg-third-200 p-2 rounded-lg shadow text-center"
              >
                <div class="text-lg font-bold text-primary-700">{{ value }}</div>
                <div class="text-xs uppercase tracking-wide text-third-600">{{ stat }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Additional info -->
        <div class="p-6 border-t border-gray-200">
          <h2 class="section-heading mb-4">Additional Information</h2>
          <p><strong>Created:</strong> {{ new Date(currentCharacter.createdAt).toLocaleDateString() }}</p>
          <p><strong>Last Updated:</strong> {{ new Date(currentCharacter.updatedAt).toLocaleDateString() }}</p>
        </div>

        <!-- Spells -->
        <div class="p-6 border-t border-gray-200">
          <div class="flex items-center justify-between mb-4">
            <h2 class="section-heading">Spells</h2>
            <button class="button button-primary" @click="showSpellSearch = !showSpellSearch">
              {{ showSpellSearch ? 'Hide Search' : '+ Search Spells' }}
            </button>
          </div>

          <div v-if="showSpellSearch" class="mb-6">
            <SpellSearch @spell-click="openSpellDetail" @save="saveSpellToCharacter" />
          </div>

          <div v-if="spellsLoading" class="text-center py-4">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
            <span class="ml-2 text-third-500">Loading spells...</span>
          </div>

          <div v-else-if="characterSpells.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SpellCard
              v-for="spell in characterSpells"
              :key="spell.key"
              :spell="spell"
              :show-remove="true"
              :is-removing="removingSpellKey === (spell.key || spell.slug)"
              @click="openSpellDetail"
              @remove="removeSpellFromCharacter"
            />
          </div>

          <div v-else class="text-center py-4 text-third-400">
            <p>No spells saved yet. Use the "Add Spell" button to search and save spells.</p>
          </div>
        </div>
      </div>

      <!-- Spell detail modal -->
      <Teleport to="body">
        <div
          v-if="showSpellModal && selectedSpell"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/50" @click="closeSpellModal"></div>

          <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">

            <!-- Modal header -->
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-2xl font-bold text-third-800">{{ selectedSpell.name }}</h3>
              <button class="button-icon text-xl" @click="closeSpellModal">✕</button>
            </div>

            <!-- Badges -->
            <div class="flex flex-wrap gap-2 mb-4">
              <span class="badge badge-primary">{{ spellLevel }}</span>
              <span v-if="spellSchoolName" class="badge badge-secondary capitalize">
                {{ spellSchoolName }}
              </span>
              <span v-if="spellDocumentName" class="badge badge-muted">
                {{ spellDocumentName }}
              </span>
            </div>

            <!-- Spell metadata -->
            <div class="space-y-3 text-third-700">
              <p v-if="selectedSpell.range"><strong>Range:</strong> {{ selectedSpell.range }}</p>
              <p v-if="selectedSpell.duration"><strong>Duration:</strong> {{ selectedSpell.duration }}</p>
              <p v-if="selectedSpell.casting_time"><strong>Casting Time:</strong> {{ selectedSpell.casting_time }}</p>
              <p v-if="spellComponents"><strong>Components:</strong> {{ spellComponents }}</p>
              <p v-if="selectedSpell.material"><strong>Material:</strong> {{ selectedSpell.material }}</p>
              <p v-if="selectedSpell.ritual"><strong>Ritual:</strong> Yes</p>
              <p v-if="selectedSpell.concentration"><strong>Concentration:</strong> Yes</p>
            </div>

            <!-- Description -->
            <div class="mt-4">
              <h4 class="font-semibold text-third-800 mb-2">Description</h4>
              <div
                v-if="selectedSpell.desc || selectedSpell.description"
                class="text-third-600 prose prose-sm max-w-none"
              >
                <p>{{ selectedSpell.desc || selectedSpell.description }}</p>
              </div>
              <div v-if="selectedSpell.higher_level" class="mt-2">
                <h5 class="font-semibold text-third-700">At Higher Levels:</h5>
                <p class="text-third-600">{{ selectedSpell.higher_level }}</p>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Back navigation -->
      <div class="mt-6">
        <router-link
          v-if="from === 'campaign' && campaignId"
          :to="{ name: 'CampaignView', params: { id: campaignId } }"
          class="element-link"
        >
          ← Back to Campaign
        </router-link>
        <router-link
          v-else
          :to="{ name: 'CharactersView' }"
          class="element-link"
        >
          ← Back to Character List
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
