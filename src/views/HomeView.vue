<script setup>
/**
 * Home — a compact welcome, then the signed-in visitor's collections.
 *
 * A view, so it may talk to stores directly. The collections are the same
 * derived, per-user order the list pages render (`sortedCampaigns` /
 * `sortedCharacters`, most recently viewed first — see `utils/viewHistory.js`),
 * shown as `BaseCarousel` strips. The brand lives in the header bar, so this
 * page only greets the visitor.
 */
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useCharacterStore } from '@/features/character/characterStore.js'
import BaseCarousel from '@/components/base/BaseCarousel.vue'
import CampaignImage from '@/features/campaign/components/CampaignImage.vue'
import CharacterCard from '@/features/character/components/CharacterCard.vue'

const authStore = useAuthStore()
const userStore = useUserStore()
const campaignStore = useCampaignStore()
const characterStore = useCharacterStore()

const { displayName } = storeToRefs(userStore)
const { sortedCampaigns } = storeToRefs(campaignStore)
const { sortedCharacters } = storeToRefs(characterStore)

/**
 * The collections belong to a signed-in visitor: an account or the Guest Demo
 * identity. An anonymous visitor gets the greeting only, because there is
 * nothing of theirs to show.
 */
const showCollections = computed(() => authStore.isAuthenticated || authStore.isGuest)

/**
 * `allSettled`, not `all`: the character action rethrows on failure and each
 * store reports its own error, so one collection failing must neither hide the
 * other nor surface as an unhandled rejection.
 */
onMounted(async () => {
  if (!showCollections.value) return

  await Promise.allSettled([
    campaignStore.fetchAllCampaignsForCurrentUser(),
    characterStore.fetchAllCharactersForCurrentUser(),
  ])
})

/** A character's campaign name, with the same neutral fallbacks as the list. */
function campaignName(campaignId) {
  if (!campaignId) return 'No campaign'
  return campaignStore.getCampaignTitle(campaignId) || 'Unknown campaign'
}

function participantCountLabel(campaign) {
  const count = campaign.participants?.length || 0
  return count === 1 ? '1 participant' : `${count} participants`
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6">
    <!-- Page header. The brand sits in the header bar, so the page heading says
         what this page is for rather than repeating the name. -->
    <header class="mb-6">
      <h2 class="page-heading">
        Welcome, <span class="welcome-name">{{ displayName }}</span
        >, stay a while and listen.
      </h2>
      <span class="page-heading-rule"></span>
      <p class="mt-2 text-secondary">A service that does not get in your way</p>
    </header>

    <!-- Signed-in dashboard: the visitor's campaigns and characters as strips.
         A panel appears only once its list has something in it, so an empty
         collection leaves no heading behind. Each strip sets its own card
         width — the base carousel deliberately does not. -->
    <section v-if="showCollections" class="space-y-6">
      <div v-if="sortedCampaigns.length">
        <div class="mb-3 flex items-baseline justify-between gap-3">
          <h2 class="section-heading">Campaigns</h2>
          <RouterLink :to="{ name: 'CampaignsView' }" class="read-more-link text-sm">
            View all →
          </RouterLink>
        </div>
        <BaseCarousel :items="sortedCampaigns" label="Campaigns" item-class="w-72 md:w-96">
          <template #item="{ item: campaign }">
            <RouterLink
              :to="{ name: 'CampaignView', params: { id: campaign.id } }"
              class="flex h-full flex-col overflow-hidden rounded-lg border border-subtle bg-[var(--color-surface)] shadow-md transition-shadow hover:shadow-lg"
            >
              <CampaignImage
                :src="campaignStore.getCampaignImageUrl(campaign.id)"
                :alt="campaignStore.getCampaignTitle(campaign.id)"
                class="h-32 w-full object-cover"
              />
              <div class="flex flex-1 flex-col p-3">
                <h3 class="card-title break-words">
                  {{ campaignStore.getCampaignTitle(campaign.id) }}
                </h3>
                <p class="mt-1 text-xs text-secondary">{{ participantCountLabel(campaign) }}</p>
              </div>
            </RouterLink>
          </template>
        </BaseCarousel>
      </div>

      <div v-if="sortedCharacters.length">
        <div class="mb-3 flex items-baseline justify-between gap-3">
          <h2 class="section-heading">Characters</h2>
          <RouterLink :to="{ name: 'CharactersView' }" class="read-more-link text-sm">
            View all →
          </RouterLink>
        </div>
        <!-- The same card the character list renders, so a character reads the
             same in both places. -->
        <BaseCarousel :items="sortedCharacters" label="Characters" item-class="w-80">
          <template #item="{ item: character }">
            <CharacterCard
              :character="character"
              :campaign-name="campaignName(character.campaignId)"
              from="home"
            />
          </template>
        </BaseCarousel>
      </div>
    </section>
  </div>
</template>
