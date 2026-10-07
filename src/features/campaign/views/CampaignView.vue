<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import CampaignSettings from '@/features/campaign/components/CampaignSettings.vue'
import { useNotificationStore } from '@/stores/notificationStore.js'
import ImportCharacterModal from '@/features/campaign/components/ImportCharacterModal.vue'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import EditCampaignModal from '@/features/campaign/components/EditCampaignModal.vue'
import CampaignSidebar from '@/features/campaign/components/CampaignSidebar.vue'
import CampaignHeader from '@/features/campaign/components/CampaignHeader.vue'
import CampaignNavIcon from '@/features/campaign/components/CampaignNavIcon.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseSection from '@/components/base/BaseSection.vue'
import MessageBoard from '@/features/message/components/MessageBoard.vue'
import { useMessageStore } from '@/features/message/messageStore.js'
import {
  getRoleBadgeClass,
  getCharacterOwnerName,
  getParticipantDisplayName,
} from '@/features/campaign/campaignUtils.js'

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
const showEditModal = ref(false)
// Mobile campaign navigation drawer (triggered from the campaign top bar).
const campaignNavOpen = ref(false)

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'lore', label: 'World Lore & Background', icon: 'lore' },
  { key: 'characters', label: 'Characters', icon: 'characters' },
  { key: 'messages', label: 'Messages', icon: 'messages' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
]

/**
 * Navigation items are computed by this smart view so the sidebar stays
 * presentational. All sections are available to every participant; the
 * Settings section internally scopes its controls by role.
 */
const navItems = computed(() => SECTIONS)

function selectSection(key) {
  if (SECTIONS.some((section) => section.key === key)) {
    activeSection.value = key
  }
}

function resetPresentationState() {
  activeSection.value = 'overview'
  descriptionExpanded.value = false
  showImportModal.value = false
  showEditModal.value = false
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

// Description is framed as the campaign's world lore/background block.
const campaignDescription = computed(() => {
  if (!campaign.value) return ''
  return campaignStore.getCampaignDescription(campaign.value.id) || ''
})

function isCurrentUser(participantOrId) {
  const id =
    participantOrId && typeof participantOrId === 'object' ? participantOrId.id : participantOrId
  if (id === undefined || id === null) return false
  return String(id) === String(userStore.userId)
}

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

const openEditModal = () => {
  if (!isOwner.value) return
  showEditModal.value = true
}

const handleSaveCampaign = async (updatedCampaign) => {
  const notificationStore = useNotificationStore()

  try {
    await campaignStore.updateCampaignInfo(campaign.value.id, {
      name: updatedCampaign.title,
      description: updatedCampaign.description,
    })

    if (updatedCampaign.imageFile) {
      const updated = await campaignStore.uploadCampaignImage(
        campaign.value.id,
        updatedCampaign.imageFile,
      )
      campaign.value.imageUrl = updated.imageUrl
    }

    campaign.value.name = updatedCampaign.title
    campaign.value.description = updatedCampaign.description
    showEditModal.value = false

    notificationStore.addNotification('Campaign updated successfully!', 'success', 3000)
  } catch (error) {
    console.error('Campaign update chain interrupted:', error)
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
      :can-edit="isOwner"
      :open="campaignNavOpen"
      @select="selectSection"
      @edit="openEditModal"
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

        <BaseSection title="Adventuring Party">
          <ul v-if="participants.length" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <li
              v-for="participant in participants"
              :key="participant.id"
              class="flex items-center justify-between gap-2 border border-section rounded-md px-3 py-2"
            >
              <span
                class="text-default font-medium truncate"
                :title="getParticipantDisplayName(participant)"
              >
                {{ getParticipantDisplayName(participant) }}
              </span>
              <span class="flex items-center gap-1 flex-shrink-0">
                <span v-if="isCurrentUser(participant)" class="text-subtle text-xs">You</span>
                <span class="badge" :class="getRoleBadgeClass(participant.role)">
                  {{ participant.role || 'PLAYER' }}
                </span>
                <span
                  v-if="String(participant.id) === String(campaign.ownerId)"
                  class="badge badge-info"
                >
                  Owner
                </span>
              </span>
            </li>
          </ul>
          <p v-else class="text-muted text-sm italic">No participants yet.</p>
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
          <BaseButton variant="default" @click="showImportModal = true">
            Import Character
          </BaseButton>
        </template>

        <div v-if="isLoadingCharacters" class="py-6 text-center">
          <div class="spinner h-8 w-8 border-t-2 border-b-2"></div>
          <p class="mt-2 text-muted">Loading characters...</p>
        </div>

        <p
          v-else-if="!campaignCharacters.length"
          class="text-muted text-sm italic border border-section rounded-md p-4"
        >
          No characters have been added to this campaign yet.
        </p>

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
        </div>
      </BaseSection>

      <!-- Messages -->
      <BaseSection v-else-if="activeSection === 'messages'" title="Messages">
        <MessageBoard :campaign-id="campaign.id" :participants="campaign.participants" />
      </BaseSection>

      <!-- Settings -->
      <BaseSection v-else-if="activeSection === 'settings'" title="Campaign Settings">
        <CampaignSettings
          :campaign-id="String(campaign.id)"
          @participants-updated="handleParticipantsUpdated"
        />
      </BaseSection>
    </div>

    <EditCampaignModal
      v-if="showEditModal && campaign"
      :campaign="{
        id: campaign.id,
        title: campaignStore.getCampaignTitle(campaign.id),
        description: campaignStore.getCampaignDescription(campaign.id),
        imageUrl: campaignStore.getCampaignImageUrl(campaign.id),
      }"
      @close="showEditModal = false"
      @save="handleSaveCampaign"
    />

    <ImportCharacterModal
      v-model="showImportModal"
      :campaign-id="campaign.id"
      @character-imported="onCharacterImported"
    />
  </div>
</template>
