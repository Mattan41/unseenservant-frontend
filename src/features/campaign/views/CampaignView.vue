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

const route = useRoute()
const router = useRouter()
const campaignStore = useCampaignStore()
const userStore = useUserStore()
const campaign = ref(null)
const isLoading = ref(false)
const isInitialLoad = ref(true)
const isCharactersListVisible = ref(false)
const showSettings = ref(false)
const descriptionExpanded = ref(false)
const showImportModal = ref(false)
const showEditModal = ref(false)

const isOwner = computed(() => {
  if (!campaign.value || !userStore.currentUser) return false
  return campaign.value.ownerId === userStore.userId
})

const loadCampaignData = async () => {
  const notificationStore = useNotificationStore()

  // Only show a full-page loading spinner on the very first visit (cold cache)
  if (isInitialLoad.value) {
    isLoading.value = true
  }

  try {
    await campaignStore.fetchAllCampaignsForCurrentUser()
  } catch (error) {
    console.error('Failed to load campaigns:', error)
    notificationStore.addNotification('Failed to load campaigns: ' + error.message, 'error')
    isLoading.value = false
    return
  }

  const campaignId = route.params.id
  const campaignExists = campaignStore.campaigns.some((c) => String(c.id) === String(campaignId))

  if (!campaignExists) {
    await router.push({ name: 'CampaignsView' })
    isLoading.value = false
    return
  }

  try {
    campaign.value = await campaignStore.fetchCampaign(campaignId)
    await campaignStore.fetchCharactersForCampaign(campaignId)
  } catch (error) {
    console.error('Failed to load campaign:', error)
    notificationStore.addNotification('Failed to load campaign: ' + error.message, 'error')
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

const charactersByParticipant = computed(() => {
  if (!campaign.value?.participants) return {}

  const characterMap = {}

  campaign.value.participants.forEach((participant) => {
    characterMap[participant.id] = {
      participant: participant,
      characters: [],
    }
  })

  if (campaign.value.ownerId && !characterMap[campaign.value.ownerId]) {
    let ownerInfo = campaign.value.participants.find((p) => p.id === campaign.value.ownerId)
    if (!ownerInfo) {
      ownerInfo = { id: campaign.value.ownerId, nickname: 'Campaign Owner' }
    }
    characterMap[ownerInfo.id] = {
      participant: ownerInfo,
      characters: [],
    }
  }

  if (campaignCharacters.value && campaignCharacters.value.length) {
    campaignCharacters.value.forEach((character) => {
      if (characterMap[character.ownerId]) {
        characterMap[character.ownerId].characters.push(character)
      }
    })
  }

  return characterMap
})

const onCharacterImported = () => {
  loadCampaignData()
}

const removeCharacter = async (characterId) => {
  if (confirm('Are you sure you want to remove this character from the campaign?')) {
    const id = route.params.id
    const campaignId = id // Keep as string for guest mode compatibility
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
  const notificationStore = useNotificationStore() // Bring this back for the single success message

  try {
    // 1. Update text info
    await campaignStore.updateCampaignInfo(campaign.value.id, {
      name: updatedCampaign.title,
      description: updatedCampaign.description,
    })

    // 2. Upload image file
    if (updatedCampaign.imageFile) {
      const updated = await campaignStore.uploadCampaignImage(
        campaign.value.id,
        updatedCampaign.imageFile,
      )
      campaign.value.imageUrl = updated.imageUrl
    }

    // 3. Update local reactive state
    campaign.value.name = updatedCampaign.title
    campaign.value.description = updatedCampaign.description

    // 4. Close the modal
    showEditModal.value = false

    notificationStore.addNotification('Campaign updated successfully!', 'success', 3000)
  } catch (error) {
    // Silent catch, because the specific API errors are handled gracefully inside the store actions
    console.error('Campaign update chain interrupted:', error)
  }
}

const toggleCharactersList = () => {
  isCharactersListVisible.value = !isCharactersListVisible.value
}

const toggleSettings = () => {
  showSettings.value = !showSettings.value
}

const toggleDescription = () => {
  descriptionExpanded.value = !descriptionExpanded.value
}

const handleParticipantsUpdated = () => {
  loadCampaignData()
}

onMounted(async () => {
  await loadCampaignData()
})

onUnmounted(() => {
  if (route.params.id) {
    const id = route.params.id
    const safeId = isNaN(id) ? id : parseInt(id)
    campaignStore.clearCampaignCharacters(safeId)
  }
})

watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      await loadCampaignData()
    }
  },
  { immediate: true },
)
</script>

<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex flex-col items-center justify-center h-full p-8">
    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    <p class="mt-2">Loading campaign...</p>
  </div>

  <!-- Campaign loaded successfully -->
  <div v-else-if="campaign" class="flex h-full">
    <!-- Campaign selector sidebar - completely self-contained now -->
    <CampaignSidebar
      :campaigns="
        campaignStore.campaigns.map((c) => ({
          ...c,
          imageUrl: campaignStore.getCampaignImageUrl(c.id),
          name: campaignStore.getCampaignTitle(c.id),
        }))
      "
      :current-campaign-id="parseInt(route.params.id)"
    />

    <!-- Main content area -->
    <div class="flex-1 p-4 overflow-y-auto">
      <!-- Campaign header with edit button -->
      <CampaignHeader
        :title="campaignStore.getCampaignTitle(campaign.id)"
        :description="campaignStore.getCampaignDescription(campaign.id)"
        :image-url="campaignStore.getCampaignImageUrl(campaign.id)"
        :is-owner="isOwner"
        :description-expanded="descriptionExpanded"
        @edit-click="openEditModal"
        @toggle-description="toggleDescription"
      />

      <!-- Campaign content -->
      <section class="mb-6">
        <!-- Participants collapsible section -->
        <div class="mb-4 border rounded p-3">
          <h3 class="font-medium cursor-pointer flex items-center" @click="toggleCharactersList">
            <span v-if="isCharactersListVisible" class="transform rotate-90 inline-block mr-1"
              >›</span
            >
            <span v-else class="inline-block mr-1">›</span>
            Participants & Characters
          </h3>

          <div v-if="isCharactersListVisible" class="mt-2">
            <div v-if="isLoadingCharacters" class="pl-4 py-2 text-gray-500">
              Loading characters...
            </div>

            <div v-else-if="!campaign?.participants?.length" class="pl-4 py-2 text-gray-500">
              No participants in this campaign yet.
            </div>

            <!-- For each participants and its characters -->
            <div v-else>
              <div
                v-for="(data, participantId) in charactersByParticipant"
                :key="participantId"
                class="mb-3 border-l-2 border-primary-200"
              >
                <div class="pl-4 py-1 font-medium flex flex-wrap items-center">
                  <span class="mr-2 flex-shrink-0">•</span>
                  <span
                    class="truncate max-w-[150px] sm:max-w-none"
                    :title="data.participant.nickname"
                  >
                    {{ data.participant.nickname }}
                  </span>
                  <span v-if="data.participant.role" class="text-gray-600 ml-1 truncate">
                    ({{ data.participant.role }})
                  </span>
                  <span
                    v-if="data.participant.id === campaign.ownerId"
                    class="text-primary-600 text-sm ml-1 whitespace-nowrap"
                  >
                    (Campaign Owner)
                  </span>
                </div>

                <!-- Show participants characters -->
                <div v-if="data.characters.length > 0" class="pl-8">
                  <div
                    v-for="character in data.characters"
                    :key="character.id"
                    class="py-1 flex flex-wrap items-center text-gray-700"
                  >
                    <span class="text-primary-500 mr-1 flex-shrink-0">◦</span>
                    <CharacterImage
                      :src="character.imageUrl"
                      :alt="`${character.name} portrait`"
                      class="w-10 h-10 rounded-lg border-2 border-primary-300 shadow-sm flex-shrink-0 object-cover"
                    />
                    <span
                      class="truncate max-w-[120px] sm:max-w-[200px] md:max-w-none"
                      :title="character.name"
                    >
                      {{ character.name }}
                    </span>
                    <span
                      v-if="character.characterClass"
                      class="text-sm text-gray-600 ml-1 truncate"
                    >
                      ({{ character.characterClass
                      }}<span v-if="character.level"> , Level {{ character.level }} </span>)
                    </span>

                    <router-link
                      v-if="
                        (userStore.currentUser && userStore.userId === character.ownerId) ||
                        campaignStore.isUserGM(campaign.id, userStore.userId)
                      "
                      :to="{
                        name: 'CharacterView',
                        params: { id: character.id },
                        query: { from: 'campaign', campaignId: campaign.id },
                      }"
                      class="button button-primary"
                    >
                      Open Character Details
                    </router-link>
                    <button
                      v-if="userStore.currentUser && userStore.userId === character.ownerId"
                      @click="removeCharacter(character.id)"
                      class="button button-remove ml-auto mt-1 sm:mt-0"
                      aria-label="Remove character"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <!-- If the participant has no characters yet in the campaign -->
                <div v-else class="pl-8 py-1 text-gray-500 text-sm italic">No characters</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <button class="button button-primary" @click="toggleSettings">Campaign Settings</button>
          <button class="button button-primary" @click="showImportModal = true">
            IMPORT CHARACTER
          </button>
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

        <!-- Import modal-component -->
        <ImportCharacterModal
          v-model="showImportModal"
          :campaign-id="campaign.id"
          @character-imported="onCharacterImported"
        />

        <!-- Modal overlay -->
        <div
          v-if="showSettings"
          class="fixed inset-0 z-30 bg-black/50 flex items-center justify-center"
          @click="showSettings = false"
        >
          <div
            class="bg-primary-100 p-6 rounded-lg max-w-2xl max-h-[90vh] overflow-y-auto w-full m-4 shadow-lg border border-primary-300"
            @click.stop
          >
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-2xl font-semibold text-third-800">Campaign Settings</h3>
              <button
                @click="showSettings = false"
                class="text-gray-600 hover:text-gray-800 focus:outline-none"
              >
                &times;
              </button>
            </div>
            <CampaignSettings
              :campaignId="String(campaign.id)"
              @close-modal="showSettings = false"
              @participants-updated="handleParticipantsUpdated"
            />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
