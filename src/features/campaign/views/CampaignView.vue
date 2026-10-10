<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import CampaignSettingsSection from '@/features/campaign/components/CampaignSettingsSection.vue'
import { useNotificationStore } from '@/stores/notificationStore.js'
import ImportCharacterModal from '@/features/campaign/components/ImportCharacterModal.vue'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import { characterHealthLabel } from '@/features/character/dispatchers/systemRegistry.js'
import CampaignSidebar from '@/features/campaign/components/CampaignSidebar.vue'
import CampaignHeader from '@/features/campaign/components/CampaignHeader.vue'
import CampaignNavIcon from '@/features/campaign/components/CampaignNavIcon.vue'
import CampaignImage from '@/features/campaign/components/CampaignImage.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseClampedText from '@/components/base/BaseClampedText.vue'
import BaseSection from '@/components/base/BaseSection.vue'
import MessageBoard from '@/features/message/components/MessageBoard.vue'
import { useMessageStore } from '@/features/message/messageStore.js'
import {
  getCharacterOwnerName,
  getParticipantDisplayName,
  getRoleBadgeClass,
} from '@/features/campaign/campaignUtils.js'
import CampaignSystemRouter from '@/features/campaign/dispatchers/CampaignSystemRouter.vue'
import { useShipStore } from '@/features/ship/shipStore.js'
import { OFFWORLDERS_SHIP_DEFAULT_IMAGE } from '@/systems/offworlders/shipConstants.js'
import { confirmDiscardUnsavedChanges } from '@/utils/useUnsavedChanges.js'
import {
  CAMPAIGN_SYSTEM_LABELS,
  DND5E_SYSTEM_TYPE,
  OFFWORLDERS_SYSTEM_TYPE,
  isOffworlders,
} from '@/features/campaign/campaignSystems.js'

const route = useRoute()
const router = useRouter()
const campaignStore = useCampaignStore()
const userStore = useUserStore()
const messageStore = useMessageStore()
const shipStore = useShipStore()

const campaign = ref(null)
const isLoading = ref(false)
const isInitialLoad = ref(true)

// Contextual navigation section currently rendered in the main content area.
const activeSection = ref('overview')

// Local UI-state
const showImportModal = ref(false)
// Mobile campaign navigation drawer (triggered from the campaign top bar).
const campaignNavOpen = ref(false)

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'lore', label: 'World Lore & Background', icon: 'lore' },
  { key: 'characters', label: 'Characters', icon: 'characters' },
  { key: 'messages', label: 'Messages', icon: 'messages' },
  { key: 'ship', label: 'Ship', icon: 'ship', system: OFFWORLDERS_SYSTEM_TYPE },
  { key: 'spells', label: 'Spell Search', icon: 'spells', system: DND5E_SYSTEM_TYPE },
  { key: 'campaign-settings', label: 'Campaign Settings', icon: 'settings' },
]

/**
 * Navigation items are computed by this smart view so the sidebar stays
 * presentational. Every participant sees Overview/Lore/Characters/Messages/
 * Participants/Settings; the owner-only "Campaign Settings" section is filtered
 * out for everyone else.
 */
const navItems = computed(() =>
  SECTIONS.filter((section) => {
    if (section.ownerOnly && !isOwner.value) return false
    // System-specific sections only appear when the campaign's primary system
    // matches (e.g. the Offworlders Ship, the D&D 5e spell search).
    if (section.system && campaign.value?.primarySystem !== section.system) return false
    return true
  }),
)

/**
 * The ship section heading doubles as the ship's name (e.g. "Ship: Korven"),
 * so the name is not repeated inside the sheet itself. Falls back to plain
 * "Ship" while the ship is still loading or unnamed.
 */
const shipSectionTitle = computed(() => {
  const name = shipStore.ship?.name
  return name ? `Ship: ${name}` : 'Ship'
})

function selectSection(key) {
  if (key === activeSection.value) return
  // Section switching is local state, so the router guards never fire — ask any
  // active form (e.g. the ship sheet or campaign details) to confirm discarding
  // unsaved edits before we swap the section out.
  if (!confirmDiscardUnsavedChanges()) return
  if (navItems.value.some((section) => section.key === key)) {
    activeSection.value = key
  }
}

function resetPresentationState() {
  activeSection.value = 'overview'
  showImportModal.value = false
  campaignNavOpen.value = false
}

// Keep the active section valid when the campaign's primary system (and thus
// the available system-specific sections) changes: fall back to Overview.
watch(
  () => campaign.value?.primarySystem,
  () => {
    if (!navItems.value.some((section) => section.key === activeSection.value)) {
      activeSection.value = 'overview'
    }
  },
)

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

  // Fresh campaign: drop any ship state from a previously viewed campaign,
  // then load this campaign's ship (when Offworlders) so the Overview summary
  // and the Ship section share a single store.
  shipStore.clearShip()

  try {
    campaign.value = await campaignStore.fetchCampaign(campaignId)
    await campaignStore.fetchCharactersForCampaign(campaignId)
    if (isOffworlders(campaign.value?.primarySystem)) {
      await shipStore.fetchShip(campaignId)
    }
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

// Overview: the campaign's ruleset label, a capped party preview, and the
// Offworlders-only ship card (data is loaded by `loadCampaignData`).
const primarySystemLabel = computed(
  () => CAMPAIGN_SYSTEM_LABELS[campaign.value?.primarySystem] || 'Not set',
)
const isOffworldersCampaign = computed(() => isOffworlders(campaign.value?.primarySystem))
const partyPreview = computed(() => campaignCharacters.value.slice(0, 6))
const shipSummary = computed(() => shipStore.ship)
const isShipLoading = computed(() => shipStore.isLoading)

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

// Every campaign participant may open a character's details (they receive the
// public view — the private backstory stays owner/GM only). Removing a character
// is still restricted by canRemoveCharacter above.
function canOpenCharacter(character) {
  return !!character && !!userStore.currentUser
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
  shipStore.clearShip()
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
      <BaseButton variant="default" class="campaign-nav-trigger" @click="campaignNavOpen = true">
        <CampaignNavIcon name="menu" class="w-5 h-5 flex-shrink-0" />
        <span>Campaign Views</span>
      </BaseButton>
      <h2 class="campaign-mobile-title">{{ campaignStore.getCampaignTitle(campaign.id) }}</h2>
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
      <!-- Campaign image for every section except the ship, which shows its own image. -->
      <CampaignHeader
        v-if="activeSection !== 'ship'"
        :title="campaignStore.getCampaignTitle(campaign.id)"
        :image-url="campaignStore.getCampaignImageUrl(campaign.id)"
      />

      <!-- Overview -->
      <section v-if="activeSection === 'overview'">
        <BaseSection title="Campaign Summary">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <p class="text-xs uppercase text-muted">System</p>
              <p class="text-lg font-bold text-default mt-1">{{ primarySystemLabel }}</p>
              <p class="text-sm text-muted mt-1">primary ruleset</p>
            </BaseCard>
          </div>
        </BaseSection>

        <!-- Campaign background (opening lines; expands in place) -->
        <BaseSection title="About This Campaign">
          <BaseCard>
            <p v-if="!campaignDescription" class="italic text-muted text-sm">
              No background has been recorded for this campaign yet.
            </p>
            <BaseClampedText v-else :text="campaignDescription" :lines="4" />
          </BaseCard>
        </BaseSection>

        <!-- Party preview -->
        <BaseSection title="The Party">
          <template #actions>
            <BaseButton variant="default" @click="selectSection('characters')">
              View all characters
            </BaseButton>
          </template>

          <div v-if="!partyPreview.length" class="empty-cta">
            <p class="text-muted text-sm italic">
              No characters have been added to this campaign yet.
            </p>
            <BaseButton variant="add" @click="showImportModal = true">
              Import your first character
            </BaseButton>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <BaseCard
              v-for="character in partyPreview"
              :key="character.id"
              clickable
              class="h-full"
              @click="openCharacter(character)"
            >
              <div class="flex items-start gap-3">
                <CharacterImage
                  :src="character.avatarUrl"
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
            </BaseCard>
          </div>
        </BaseSection>

        <!-- Ship summary (Offworlders campaigns only) -->
        <BaseSection v-if="isOffworldersCampaign" title="The Ship">
          <template #actions>
            <BaseButton variant="default" @click="selectSection('ship')">View ship</BaseButton>
          </template>

          <BaseCard v-if="shipSummary" clickable @click="selectSection('ship')">
            <div class="flex items-start gap-4">
              <CampaignImage
                :src="shipSummary.imageUrl"
                :alt="shipSummary.name || 'Ship'"
                :default-src="OFFWORLDERS_SHIP_DEFAULT_IMAGE"
                class="w-24 h-24 rounded-lg border-2 object-cover flex-shrink-0"
                style="border-color: var(--color-primary-300)"
              />
              <div class="flex-1 min-w-0">
                <h5 class="text-base font-semibold break-words">
                  {{ shipSummary.name || 'Unnamed Ship' }}
                </h5>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span class="character-tag">
                    Hull {{ shipSummary.hull }}/{{ shipSummary.hullMax }}
                  </span>
                  <span class="character-tag">Armor {{ shipSummary.armor }}</span>
                  <span class="character-tag">Damage {{ shipSummary.damage }}</span>
                  <span class="character-tag">
                    Fuel {{ shipSummary.driveFuel }}/{{ shipSummary.maxDriveFuel }}
                  </span>
                </div>
              </div>
            </div>
          </BaseCard>
          <p v-else-if="isShipLoading" class="text-sm text-muted italic">Loading ship…</p>
        </BaseSection>

        <BaseSection title="Participants &amp; Roles">
          <ul class="flex flex-col gap-2">
            <li
              v-for="participant in participants"
              :key="participant.id"
              class="flex items-center justify-between gap-2 border border-section rounded p-3"
            >
              <span class="text-default truncate">
                {{ getParticipantDisplayName(participant) }}
                <span
                  v-if="String(participant.id) === String(campaign.ownerId)"
                  class="text-sm text-muted"
                >
                  · Owner
                </span>
              </span>
              <span class="badge" :class="getRoleBadgeClass(participant.role)">
                {{ participant.role || 'PLAYER' }}
              </span>
            </li>
          </ul>
        </BaseSection>
      </section>

      <!-- World Lore & Background -->
      <BaseSection v-else-if="activeSection === 'lore'" title="World Lore &amp; Background">
        <BaseCard>
          <p v-if="!campaignDescription" class="italic text-muted text-sm">
            No background has been recorded for this campaign yet.
          </p>
          <p v-else class="text-default text-sm whitespace-pre-line break-words">
            {{ campaignDescription }}
          </p>

          <!-- Private description — only returned to the owner/GM by the API. -->
          <div v-if="campaign.privateDescription" class="mt-4 pt-3 border-t border-section">
            <p class="text-xs italic mb-1 text-muted">Private — only the GM can see this</p>
            <p class="text-default text-sm whitespace-pre-line break-words">
              {{ campaign.privateDescription }}
            </p>
          </div>
        </BaseCard>
      </BaseSection>

      <!-- Characters -->
      <BaseSection v-else-if="activeSection === 'characters'" title="Party Characters">
        <template #actions>
          <BaseButton variant="default" icon="plus" @click="showImportModal = true">
            Import Character
          </BaseButton>
        </template>

        <div v-if="isLoadingCharacters" class="py-6 text-center">
          <div class="spinner h-8 w-8 border-t-2 border-b-2"></div>
          <p class="mt-2 text-muted">Loading characters...</p>
        </div>

        <div v-else-if="!campaignCharacters.length" class="empty-cta">
          <p class="text-muted text-sm italic">
            No characters have been added to this campaign yet.
          </p>
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
                :src="character.avatarUrl"
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
                <template v-if="character.dnd5e">
                  <span v-if="character.dnd5e.race" class="character-tag">
                    {{ character.dnd5e.race }}
                  </span>
                  <span v-if="character.dnd5e.characterClass" class="character-tag">
                    {{ character.dnd5e.characterClass }}
                  </span>
                  <span v-if="character.dnd5e.level" class="character-tag-level">
                    Level {{ character.dnd5e.level }}
                  </span>
                </template>
                <template v-else-if="character.offworlders">
                  <span v-if="character.offworlders.species" class="character-tag">
                    {{ character.offworlders.species }}
                  </span>
                  <span v-if="character.offworlders.characterClass" class="character-tag">
                    {{ character.offworlders.characterClass }}
                  </span>
                  <span class="character-tag-level">HP {{ characterHealthLabel(character) }}</span>
                </template>
                <span v-else class="character-tag">{{ character.systemType }}</span>
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

      <!-- System-specific sections (Offworlders Ship / D&D 5e spell search) -->
      <BaseSection v-else-if="activeSection === 'ship'" :title="shipSectionTitle">
        <CampaignSystemRouter
          :system-type="campaign.primarySystem"
          section="ship"
          :campaign-id="campaign.id"
        />
      </BaseSection>

      <BaseSection v-else-if="activeSection === 'spells'" title="Spell Search">
        <CampaignSystemRouter
          :system-type="campaign.primarySystem"
          section="spells"
          :campaign-id="campaign.id"
        />
      </BaseSection>

      <!-- Settings: personal nickname + participants + (owner) campaign details -->
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
