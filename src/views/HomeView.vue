<script setup>
/**
 * Home — the hero, plus the signed-in visitor's collections.
 *
 * A view, so it may talk to stores directly. The collections are the same
 * derived, per-user order the list pages render (`sortedCampaigns` /
 * `sortedCharacters`, most recently viewed first — see `utils/viewHistory.js`),
 * shown as two `BaseCarousel` strips under the welcome text.
 */
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/features/auth/authStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useCharacterStore } from '@/features/character/characterStore.js'
import BaseCarousel from '@/components/base/BaseCarousel.vue'
import CampaignImage from '@/features/campaign/components/CampaignImage.vue'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import {
  characterHealthLabel,
  characterSystemLabel,
} from '@/features/character/dispatchers/systemRegistry.js'

const authStore = useAuthStore()
const userStore = useUserStore()
const campaignStore = useCampaignStore()
const characterStore = useCharacterStore()

const { displayName } = storeToRefs(userStore)
const { sortedCampaigns } = storeToRefs(campaignStore)
const { sortedCharacters } = storeToRefs(characterStore)

/**
 * The collections belong to a signed-in visitor: an account or the Guest Demo
 * identity. An anonymous visitor keeps the bare hero, because there is nothing
 * of theirs to show.
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

/**
 * The one figure a character card shows: the headline of its system, or the
 * system's name when it has none. The tag class is decided here too, so the
 * template holds no colour/badge logic.
 */
function characterBadge(character) {
  if (character.dnd5e) return `Level ${character.dnd5e.level}`
  if (character.offworlders) return `HP ${characterHealthLabel(character)}`
  return characterSystemLabel(character.systemType)
}

function characterBadgeClass(character) {
  return character.dnd5e || character.offworlders ? 'character-tag-level' : 'character-tag'
}
</script>

<template>
  <div>
    <section class="text-center">
      <h1>Unseen Servant</h1>
      <p class="text-lg">A service that does not get in your way</p>
      <div class="logo-container">
        <img
          src="@/assets/logo.svg"
          alt="Unseen Servant Logo"
          class="logo brand-mark max-w-[150px] h-auto my-4 mx-auto block"
        />
      </div>
      <div class="text-center">
        <h3>
          Welcome <span class="rainbow-text">{{ displayName }}</span
          >, stay a while and listen.
        </h3>
      </div>
    </section>

    <!-- Signed-in dashboard: the visitor's campaigns and characters as strips.
         A panel appears only once its list has something in it, so an empty
         collection leaves no heading behind. -->
    <section v-if="showCollections" class="mx-auto mt-10 max-w-5xl space-y-8 text-left">
      <div v-if="sortedCampaigns.length">
        <h2 class="section-heading mb-3">Campaigns</h2>
        <BaseCarousel :items="sortedCampaigns" label="Campaigns">
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
                <h3 class="break-words text-base font-bold">
                  {{ campaignStore.getCampaignTitle(campaign.id) }}
                </h3>
                <p class="mt-1 text-xs text-secondary">{{ participantCountLabel(campaign) }}</p>
              </div>
            </RouterLink>
          </template>
        </BaseCarousel>
      </div>

      <div v-if="sortedCharacters.length">
        <h2 class="section-heading mb-3">Characters</h2>
        <BaseCarousel :items="sortedCharacters" label="Characters">
          <template #item="{ item: character }">
            <RouterLink
              :to="{ name: 'CharacterView', params: { id: character.id } }"
              class="flex h-full items-start gap-3 rounded-lg border border-subtle bg-[var(--color-surface)] p-3 shadow-md transition-shadow hover:shadow-lg"
            >
              <CharacterImage
                :src="character.avatarUrl"
                :alt="`${character.name} portrait`"
                class="h-14 w-14 flex-shrink-0 rounded-lg border-2 object-cover"
                style="border-color: var(--color-primary-300)"
              />

              <div class="min-w-0 flex-1">
                <h3 class="character-name truncate text-sm font-semibold">{{ character.name }}</h3>
                <p class="mt-0.5 text-xs text-secondary">
                  {{ campaignName(character.campaignId) }}
                </p>
                <div class="mt-2 flex flex-wrap gap-1">
                  <span :class="characterBadgeClass(character)">{{
                    characterBadge(character)
                  }}</span>
                </div>
              </div>
            </RouterLink>
          </template>
        </BaseCarousel>
      </div>
    </section>
  </div>
</template>

<!-- Layout and animation only — see docs/STYLE_GUIDE.md §3. -->

<style scoped>
.logo-container {
  position: relative;
  height: 150px;
  width: 100%;
  perspective: 1000px;
  overflow: hidden;
}

@keyframes float {
  0% {
    transform: translateX(-50px) translateY(0) rotate(0deg);
  }
  25% {
    transform: translateX(0) translateY(-15px) rotate(5deg);
  }
  50% {
    transform: translateX(50px) translateY(0) rotate(0deg);
  }
  75% {
    transform: translateX(0) translateY(15px) rotate(-5deg);
  }
  100% {
    transform: translateX(-50px) translateY(0) rotate(0deg);
  }
}

@keyframes hover {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.logo {
  position: relative;
  animation:
    float 15s infinite ease-in-out,
    hover 3s infinite ease-in-out;
  filter: drop-shadow(0 5px 5px rgba(0, 0, 0, 0.1));
  transform-origin: center center;
  transition: all 0.3s ease;
}

.logo:hover {
  animation-play-state: paused;
  transform: scale(1.1);
}

@keyframes rainbow {
  0% {
    background-position: 0 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

.rainbow-text {
  background: linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet);
  background-size: 400% 400%;
  -webkit-background-clip: text;
  background-clip: text; /* Standard property for compatibility */
  -webkit-text-fill-color: transparent;
  animation: rainbow 3s infinite;
}
</style>
