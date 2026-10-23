<script setup>
/**
 * Home — a compact welcome, then the signed-in visitor's collections.
 *
 * A view, so it may talk to stores directly. The collections are the same
 * derived, per-user order the list pages render (`sortedCampaigns` /
 * `sortedCharacters`, most recently viewed first — see `utils/viewHistory.js`),
 * shown as `BaseCarousel` strips. The brand lives in the header bar, so this
 * page only greets the visitor — and a visitor without a session gets the same
 * strips filled with example content (`homePreview.js`), never a bare greeting.
 */
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useCharacterStore } from '@/features/character/characterStore.js'
import BaseCarousel from '@/components/base/BaseCarousel.vue'
import BaseLinkButton from '@/components/base/BaseLinkButton.vue'
import CampaignImage from '@/features/campaign/components/CampaignImage.vue'
import CreateCampaign from '@/features/campaign/components/CreateCampaign.vue'
import CharacterCard from '@/features/character/components/CharacterCard.vue'
import { campaignSystemLabel } from '@/features/campaign/campaignSystems.js'
import { HOME_PREVIEW_CAMPAIGNS, HOME_PREVIEW_CHARACTERS } from '@/data/homePreview.js'

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
 * Until the two collections have answered, the dashboard stays empty rather than
 * flashing a "you aren't in any campaign yet" panel at a visitor who has plenty.
 */
const isFirstLoad = ref(true)

/**
 * `allSettled`, not `all`: the character action rethrows on failure and each
 * store reports its own error, so one collection failing must neither hide the
 * other nor surface as an unhandled rejection.
 */
onMounted(async () => {
  if (!showCollections.value) {
    isFirstLoad.value = false
    return
  }

  await Promise.allSettled([
    campaignStore.fetchAllCampaignsForCurrentUser(),
    characterStore.fetchAllCharactersForCurrentUser(),
  ])
  isFirstLoad.value = false
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
         A collection that is still empty shows its discovery tile instead of a
         strip, so a new account never lands on a hole. Each strip sets its own
         card width — the base carousel deliberately does not. -->
    <section v-if="showCollections && !isFirstLoad" class="space-y-6">
      <div>
        <div class="mb-3 flex items-baseline justify-between gap-3">
          <h2 class="section-heading">Campaigns</h2>
          <RouterLink
            v-if="sortedCampaigns.length"
            :to="{ name: 'CampaignsView' }"
            class="read-more-link text-sm"
          >
            View all →
          </RouterLink>
        </div>
        <BaseCarousel
          v-if="sortedCampaigns.length"
          :items="sortedCampaigns"
          label="Campaigns"
          item-class="w-72 md:w-96"
        >
          <template #item="{ item: campaign }">
            <RouterLink
              :to="{ name: 'CampaignView', params: { id: campaign.id } }"
              class="flex h-full flex-col overflow-hidden rounded-lg border border-subtle bg-[var(--color-surface)] shadow-md transition-shadow hover:shadow-lg"
            >
              <CampaignImage
                :src="campaignStore.getCampaignImageUrl(campaign.id)"
                :alt="campaignStore.getCampaignTitle(campaign.id)"
                :system-type="campaign.primarySystem"
                class="h-32 w-full object-cover"
              />
              <div class="flex flex-1 flex-col p-3">
                <h3 class="card-title break-words">
                  {{ campaignStore.getCampaignTitle(campaign.id) }}
                </h3>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <span v-if="campaignSystemLabel(campaign.primarySystem)" class="system-tag">
                    {{ campaignSystemLabel(campaign.primarySystem) }}
                  </span>
                  <p class="text-xs text-secondary">{{ participantCountLabel(campaign) }}</p>
                </div>
              </div>
            </RouterLink>
          </template>
        </BaseCarousel>
        <div v-else class="mx-auto max-w-xs py-4 text-center">
          <p class="text-secondary mb-3">You aren't in any campaign yet.</p>
          <CreateCampaign />
        </div>
      </div>

      <div>
        <div class="mb-3 flex items-baseline justify-between gap-3">
          <h2 class="section-heading">Characters</h2>
          <RouterLink
            v-if="sortedCharacters.length"
            :to="{ name: 'CharactersView' }"
            class="read-more-link text-sm"
          >
            View all →
          </RouterLink>
        </div>
        <!-- The same card the character list renders, so a character reads the
             same in both places. -->
        <BaseCarousel
          v-if="sortedCharacters.length"
          :items="sortedCharacters"
          label="Characters"
          item-class="w-80"
        >
          <template #item="{ item: character }">
            <CharacterCard
              :character="character"
              :campaign-name="campaignName(character.campaignId)"
              from="home"
            />
          </template>
        </BaseCarousel>
        <div v-else class="mx-auto max-w-xs py-4 text-center">
          <p class="text-secondary mb-3">You don't have any characters yet.</p>
          <BaseLinkButton variant="tile" icon="plus" :to="{ name: 'CreateCharacter' }">
            Create your first character
          </BaseLinkButton>
        </div>
      </div>
    </section>

    <!-- Anonymous visitor: the same page, filled with example content and the
         shipped placeholder art. Illustrations only — nothing here is stored,
         and nothing links (`homePreview.js`). -->
    <section v-else-if="!showCollections" class="space-y-6">
      <div>
        <div class="mb-3 flex items-baseline justify-between gap-3">
          <h2 class="section-heading">Example campaigns</h2>
          <RouterLink :to="{ name: 'login' }" class="read-more-link text-sm">
            Sign in to make your own →
          </RouterLink>
        </div>
        <BaseCarousel
          :items="HOME_PREVIEW_CAMPAIGNS"
          label="Example campaigns"
          item-class="w-72 md:w-96"
        >
          <template #item="{ item: example }">
            <div
              class="flex h-full flex-col overflow-hidden rounded-lg border border-subtle bg-[var(--color-surface)] shadow-md"
            >
              <img :src="example.imageUrl" alt="" class="h-32 w-full object-cover" />
              <div class="flex flex-1 flex-col p-3">
                <h3 class="card-title break-words">{{ example.title }}</h3>
                <p class="mt-1 text-xs text-secondary">{{ example.meta }}</p>
              </div>
            </div>
          </template>
        </BaseCarousel>
      </div>

      <div>
        <div class="mb-3 flex items-baseline justify-between gap-3">
          <h2 class="section-heading">Example characters</h2>
          <RouterLink :to="{ name: 'login' }" class="read-more-link text-sm">
            Sign in to make your own →
          </RouterLink>
        </div>
        <BaseCarousel
          :items="HOME_PREVIEW_CHARACTERS"
          label="Example characters"
          item-class="w-72 md:w-80"
        >
          <template #item="{ item: example }">
            <div
              class="flex h-full items-center gap-3 rounded-lg border border-subtle bg-[var(--color-surface)] p-3 shadow-md"
            >
              <img
                :src="example.imageUrl"
                alt=""
                class="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
              />
              <div class="min-w-0">
                <h3 class="card-title truncate">{{ example.title }}</h3>
                <p class="mt-0.5 text-xs text-secondary">{{ example.meta }}</p>
              </div>
            </div>
          </template>
        </BaseCarousel>
      </div>
    </section>
  </div>
</template>
