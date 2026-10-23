<script setup>
import { onMounted, ref } from 'vue'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import CharacterCard from '@/features/character/components/CharacterCard.vue'
import BaseLinkButton from '@/components/base/BaseLinkButton.vue'

const characterStore = useCharacterStore()
const campaignStore = useCampaignStore()

// The rendered order is the store's derived, per-user one: most recently viewed
// character first (see `characterStore.sortedCharacters` and `viewHistory.js`).

const loading = ref(false)
const getCampaignName = (campaignId) => {
  if (!campaignId) return 'No campaign'
  return campaignStore.getCampaignTitle(campaignId) || 'Unknown campaign'
}

onMounted(async () => {
  loading.value = true
  await characterStore.fetchAllCharactersForCurrentUser()
  await campaignStore.fetchAllCampaignsForCurrentUser()
  loading.value = false
})
</script>

<template>
  <div class="container mx-auto p-4">
    <h1
      class="p-4 mb-4 rounded-lg font-bold"
      style="background-color: var(--color-primary-100); color: var(--color-primary-900)"
    >
      Characters
    </h1>
    <div v-if="characterStore.isLoading || loading" class="text-center py-8">
      <div class="spinner h-8 w-8 border-t-2 border-b-2"></div>
      <p class="mt-2 text-secondary">Loading characters...</p>
    </div>

    <!-- Empty state: the dashed discovery tile, so "create" reads the same
         wherever a character can be added. -->
    <div
      v-else-if="characterStore.sortedCharacters.length === 0"
      class="mx-auto max-w-xs py-4 text-center"
    >
      <p class="text-secondary mb-3">You don't have any characters yet.</p>
      <BaseLinkButton variant="tile" icon="plus" :to="{ name: 'CreateCharacter' }">
        Create your first character
      </BaseLinkButton>
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- First cell: the discovery tile, so creating one is always one click away. -->
      <BaseLinkButton variant="tile" icon="plus" :to="{ name: 'CreateCharacter' }">
        Create a character
      </BaseLinkButton>
      <!-- One shared card, so a character reads the same here, in a campaign
           roster or on the home strip (`CharacterCard.vue`). -->
      <CharacterCard
        v-for="character in characterStore.sortedCharacters"
        :key="character.id"
        :character="character"
        :campaign-name="getCampaignName(character.campaignId)"
      />
    </div>
  </div>
</template>
