<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import CampaignSettings from '@/features/campaign/components/CampaignSettings.vue'
import CampaignParticipants from '@/features/campaign/components/CampaignParticipants.vue'
import CampaignSettingsSection from '@/features/campaign/components/CampaignSettingsSection.vue'
import { useNotificationStore } from '@/stores/notificationStore.js'
import ImportCharacterModal from '@/features/campaign/components/ImportCharacterModal.vue'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import CampaignSidebar from '@/features/campaign/components/CampaignSidebar.vue'
import CampaignHeader from '@/features/campaign/components/CampaignHeader.vue'
import CampaignNavIcon from '@/features/campaign/components/CampaignNavIcon.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseSection from '@/components/base/BaseSection.vue'
import MessageBoard from '@/features/message/components/MessageBoard.vue'
import { useMessageStore } from '@/features/message/messageStore.js'
import { getCharacterOwnerName } from '@/features/campaign/campaignUtils.js'

const route = useRoute()
const router = useRouter()
const campaignStore = useCampaignStore()
const userStore = useUserStore()
const messageStore = useMessageStore()

const campaign = ref(null)
const isLoading = ref(false)
const isInitialLoad = ref(true)

// Contextual navigation section currently rendered in the main content area.
const activeSection = ref('overview')

// Local UI-state
const descriptionExpanded = ref(false)
const showImportModal = ref(false)
// Mobile campaign navigation drawer (triggered from the campaign top bar).
const campaignNavOpen = ref(false)

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'lore', label: 'World Lore & Background', icon: 'lore' },
  { key: 'characters', label: 'Characters', icon: 'characters' },
  { key: 'messages', label: 'Messages', icon: 'messages' },
  { key: 'participants', label: 'Participants', icon: 'participants' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
  { key: 'campaign-settings', label: 'Campaign Settings', icon: 'edit', ownerOnly: true },
]

/**
 * Navigation items are computed by this smart view so the sidebar stays
 * presentational. Every participant sees Overview/Lore/Characters/Messages/
 * Participants/Settings; the owner-only "Campaign Settings" section is filtered
 * out for everyone else.
 */
const navItems = computed(() => SECTIONS.filter((section) => !section.ownerOnly || isOwner.value))

function selectSection(key) {
  if (navItems.value.some((section) => section.key === key)) {
    activeSection.value = key
  }
}

function resetPresentationState() {
  activeSection.value = 'overview'
  descriptionExpanded.value = false
  showImportModal.value = false
  campaignNavOpen.value = false
}

// Ownership is separate from table role: only the owner controls the campaign.
const isOwner = computed(() => {
  if (!campaign.value || !userStore.currentUser) return false
  return String(campaign.value.ownerId) === String(userStore.userId)
})

// Table role (GM vs PLAYER) is looked up from the campaign's participant list.
const isGm = computed(() => {
  if (!campaign.value || !userStore.currentUser) return false
  return campaignStore.isUserGM(campaign.value.id, userStore.userId)
})

const loadCampaignData = async (campaignId) => {
  const notificationStore = useNotificationStore()

  if (isInitialLoad.value) {
    isLoading.value = true
  }

  // Reset local presentation state and stale messages for the new campaign
  resetPresentationState()
  messageStore.clearMessages()

  try {
    campaign.value = await campaignStore.fetchCampaign(campaignId)
    await campaignStore.fetchCharactersForCampaign(campaignId)
  } catch (error) {
    console.error('Failed to load campaign:', error)
    notificationStore.addNotification('Failed to load campaign: ' + error.message, 'error')
    await router.push({ name: 'CampaignsView' })
  } finally {
    isLoading.value = false
    isInitialLoad.value = false
  }
}

const campaignCharacters = computed(() => {
  const id = route.params.id
  const safeId = isNaN(id) ? id : parseInt(id)
  return campaignStore.getCharactersByCampaignId(safeId)
})

const isLoadingCharacters = computed(() => campaignStore.loadingCharacters)

// Read-only participant roster (owner + players + GMs).
const participants = computed(() => campaign.value?.participants || [])

// Overview summary counts.
const participantCount = computed(() => participants.value.length)
const gmCount = computed(() => participants.value.filter((p) => p.role === 'GM').length)
const playerCount = computed(() => participants.value.filter((p) => p.role !== 'GM').length)
const characterCount = computed(() => campaignCharacters.value.length)

// Description is framed as the campaign's world lore/background block.
const campaignDescription = computed(() => {
  if (!campaign.value) return ''
  return campaignStore.getCampaignDescription(campaign.value.id) || ''
})

function openCharacter(character) {
  if (!canOpenCharacter(character)) return
  router.push({
    name: 'CharacterView',
    params: { id: character.id },
    query: { from: 'campaign', campaignId: campaign.value.id },
  })
}

// Keep "Remove from campaign" available to the character owner, a GM, or the
// campaign owner.
function canRemoveCharacter(character) {
  if (!character) return false
  return isOwner.value || isGm.value || String(character.ownerId) === String(userStore.userId)
}

// The owner has full access; GMs and the character's owner may open details.
function canOpenCharacter(character) {
  if (isOwner.value || isGm.value) return true
  return userStore.currentUser && String(userStore.userId) === String(character.ownerId)
}

const onCharacterImported = async () => {
  await campaignStore.refreshCampaign(route.params.id)
  await campaignStore.fetchCharactersForCampaign(route.params.id)
}

const removeCharacter = async (characterId) => {
  if (confirm('Are you sure you want to remove this character from the campaign?')) {
    const campaignId = route.params.id
    try {
      await campaignStore.removeCharacterFromCampaign(characterId)
    } catch (error) {
      console.log('Error caught in component:', error)
    }
    await campaignStore.fetchCharactersForCampaign(campaignId)
  }
}

const toggleDescription = () => {
  descriptionExpanded.value = !descriptionExpanded.value
}

/**
 * Refresh role/participant data after a mutation without losing the section
 * the user is currently looking at.
 */
const handleParticipantsUpdated = async () => {
  try {
    campaign.value = await campaignStore.refreshCampaign(route.params.id)
  } catch (error) {
    console.error('Failed to refresh campaign after participant update:', error)
  }
}

onMounted(async () => {
  await loadCampaignData(route.params.id)
})

onUnmounted(() => {
  if (route.params.id) {
    const id = route.params.id
    const safeId = isNaN(id) ? id : parseInt(id)
    campaignStore.clearCampaignCharacters(safeId)
  }
  messageStore.clearMessages()
})

// Load data and reset presentation mode when changing campaign
watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      await loadCampaignData(newId)
    }
  },
)
</script>

<template>
  <!-- Full loading spinner (initial load only) -->
  <div v-if="isLoading && !campaign" class="flex flex-col items-center justify-center h-full p-8">
    <div class="spinner h-8 w-8 border-b-2"></div>
    <p class="mt-2">Loading campaign...</p>
  </div>

  <div v-else-if="campaign" class="flex flex-col md:flex-row md:items-stretch md:h-full">
    <!-- Mobile campaign bar: title + local navigation trigger -->
    <div class="campaign-mobile-bar">
      <h2 class="campaign-mobile-title">{{ campaignStore.getCampaignTitle(campaign.id) }}</h2>
      <BaseButton variant="default" class="campaign-nav-trigger" @click="campaignNavOpen = true">
        <CampaignNavIcon name="menu" class="w-5 h-5 flex-shrink-0" />
        <span>Campaign Views</span>
      </BaseButton>
    </div>

    <!-- Contextual in-campaign navigation (rail on desktop, drawer on mobile) -->
    <CampaignSidebar
      :items="navItems"
      :active-section="activeSection"
      :campaign-id="campaign.id"
      :open="campaignNavOpen"
      @select="selectSection"
      @update:open="campaignNavOpen = $event"
    />

    <!-- Active section content -->
    <div class="flex-1 min-w-0 p-4">
      <!-- Overview -->
      <section v-if="activeSection === 'overview'">
        <CampaignHeader
          :title="campaignStore.getCampaignTitle(campaign.id)"
          :image-url="campaignStore.getCampaignImageUrl(campaign.id)"
        />

        <BaseSection title="Campaign Summary">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <BaseCard>
              <p class="text-xs uppercase text-muted">Participants</p>
              <p class="text-2xl font-bold text-default mt-1">{{ participantCount }}</p>
              <p class="text-sm text-muted mt-1">{{ gmCount }} GM · {{ playerCount }} Player</p>
            </BaseCard>

            <BaseCard>
              <p class="text-xs uppercase text-muted">Characters</p>
              <p class="text-2xl font-bold text-default mt-1">{{ characterCount }}</p>
              <p class="text-sm text-muted mt-1">in this campaign</p>
            </BaseCard>

            <BaseCard>
              <div>
                <p class="text-xs uppercase text-muted">Roster</p>
                <p class="text-sm text-default mt-1">Roles, invites &amp; ownership</p>
              </div>
              <BaseButton
                variant="link"
                class="mt-2 self-start"
                @click="selectSection('participants')"
              >
                View participants
              </BaseButton>
            </BaseCard>
          </div>
        </BaseSection>
      </section>

      <!-- World Lore & Background -->
      <BaseSection v-else-if="activeSection === 'lore'" title="World Lore &amp; Background">
        <BaseCard>
          <p v-if="!campaignDescription" class="italic text-muted text-sm">
            No background has been recorded for this campaign yet.
          </p>
          <template v-else>
            <p
              class="text-default text-sm whitespace-pre-line break-words"
              :class="{ 'line-clamp-6': !descriptionExpanded }"
            >
              {{ campaignDescription }}
            </p>
            <BaseButton
              v-if="campaignDescription.length > 220"
              variant="link"
              class="mt-2"
              @click="toggleDescription"
            >
              {{ descriptionExpanded ? 'Show less' : 'Read more' }}
            </BaseButton>
          </template>
        </BaseCard>
      </BaseSection>

      <!-- Characters -->
      <BaseSection v-else-if="activeSection === 'characters'" title="Party Characters">
        <template #actions>
          <BaseButton
            variant="default"
            class="inline-flex items-center gap-1"
            @click="showImportModal = true"
          >
            <CampaignNavIcon name="plus" class="w-4 h-4 flex-shrink-0" />
            Import Character
          </BaseButton>
        </template>

        <div v-if="isLoadingCharacters" class="py-6 text-center">
          <div class="spinner h-8 w-8 border-t-2 border-b-2"></div>
          <p class="mt-2 text-muted">Loading characters...</p>
        </div>

        <div v-else-if="!campaignCharacters.length" class="empty-cta">
          <p class="text-muted text-sm italic">No characters have been added to this campaign yet.</p>
          <BaseButton variant="add" @click="showImportModal = true">
            Import your first character
          </BaseButton>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <BaseCard
            v-for="character in campaignCharacters"
            :key="character.id"
            clickable
            class="h-full"
            @click="openCharacter(character)"
          >
            <div class="flex items-start gap-3">
              <CharacterImage
                :src="character.imageUrl"
                :alt="`${character.name || 'Character'} portrait`"
                class="w-16 h-16 rounded-lg border-2 shadow-sm flex-shrink-0 object-cover"
                style="border-color: var(--color-primary-300)"
              />
              <div class="flex-1 min-w-0">
                <h5
                  class="character-name text-base font-semibold line-clamp-2 break-words"
                  :title="character.name"
                >
                  {{ character.name || 'Unnamed Character' }}
                </h5>
                <div class="mt-1">
                  <span class="badge badge-secondary text-xs">
                    Played by: {{ getCharacterOwnerName(character, participants) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-3 pt-2 border-t border-subtle">
              <div class="flex flex-wrap gap-2">
                <span v-if="character.race" class="character-tag">{{ character.race }}</span>
                <span v-if="character.characterClass" class="character-tag">
                  {{ character.characterClass }}
                </span>
                <span v-if="character.level" class="character-tag-level">
                  Level {{ character.level }}
                </span>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap gap-2" @click.stop>
              <BaseButton
                v-if="canOpenCharacter(character)"
                variant="default"
                @click="openCharacter(character)"
              >
                Details
              </BaseButton>
              <BaseButton
                v-if="canRemoveCharacter(character)"
                variant="remove"
                @click="removeCharacter(character.id)"
              >
                Remove from campaign
              </BaseButton>
            </div>
          </BaseCard>

          <!-- Discoverable import affordance -->
          <button type="button" class="add-tile" @click="showImportModal = true">
            <CampaignNavIcon name="plus" class="w-6 h-6" />
            <span class="text-sm font-medium">Import a character</span>
          </button>
        </div>
      </BaseSection>

      <!-- Messages -->
      <BaseSection v-else-if="activeSection === 'messages'" title="Messages">
        <MessageBoard :campaign-id="campaign.id" :participants="campaign.participants" />
      </BaseSection>

      <!-- Participants -->
      <BaseSection v-else-if="activeSection === 'participants'" title="Participants">
        <CampaignParticipants
          :campaign-id="String(campaign.id)"
          @participants-updated="handleParticipantsUpdated"
        />
      </BaseSection>

      <!-- Settings (personal) -->
      <BaseSection v-else-if="activeSection === 'settings'" title="Settings">
        <CampaignSettings :campaign-id="String(campaign.id)" @updated="handleParticipantsUpdated" />
      </BaseSection>

      <!-- Campaign Settings (owner only) -->
      <BaseSection v-else-if="activeSection === 'campaign-settings'" title="Campaign Settings">
        <CampaignSettingsSection
          :campaign-id="String(campaign.id)"
          @updated="handleParticipantsUpdated"
        />
      </BaseSection>
    </div>

    <ImportCharacterModal
      v-model="showImportModal"
      :campaign-id="campaign.id"
      @character-imported="onCharacterImported"
    />
  </div>
</template>
