<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import SystemSheetRouter from '@/features/character/dispatchers/SystemSheetRouter.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const characterStore = useCharacterStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const characterId = computed(() => route.params.id)
const from = route.query.from || 'characterList'
const campaignId = route.query.campaignId || null

const { userId } = storeToRefs(userStore)
const { currentCharacter } = storeToRefs(characterStore)

onMounted(async () => {
  try {
    await characterStore.fetchCharacter(characterId.value)
  } finally {
    loading.value = false
  }
})

const isOwner = computed(
  () =>
    !!currentCharacter.value &&
    !!userId.value &&
    String(currentCharacter.value.ownerId) === String(userId.value),
)

const deleteCharacter = async () => {
  const success = await characterStore.deleteCharacter(characterId.value)
  if (success) {
    notificationStore.addNotification('Character deleted successfully!', 'success')
    await router.push({ name: 'CharactersView' })
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-7xl p-4">
    <div v-if="loading" class="text-center py-8">
      <div class="spinner h-8 w-8 border-t-2 border-b-2"></div>
      <p class="mt-2" style="color: var(--color-third-600)">Loading character...</p>
    </div>

    <div v-else-if="!currentCharacter" class="text-center py-8">
      <p style="color: var(--color-third-600)">Character not found.</p>
      <BaseButton variant="default" class="mt-4" @click="router.push({ name: 'CharactersView' })">
        Back to Character List
      </BaseButton>
    </div>

    <div v-else>
      <div
        class="rounded-lg shadow-lg overflow-hidden flex flex-col lg:flex-row lg:items-stretch"
        style="background-color: var(--color-primary-50)"
      >
        <!--
          Identity rail: system-agnostic chrome shared by every game system.
          Stacks above the sheet on mobile; becomes a fixed-width rail on lg+.
          Kept intentionally generic so it can later be extracted into a shared
          CharacterViewShell.vue without touching system-specific code.
        -->
        <aside
          class="flex flex-col gap-4 p-6 border-b border-section lg:border-b-0 lg:border-r lg:w-72 xl:w-80 lg:flex-shrink-0"
        >
          <!-- Action bar -->
          <div v-if="isOwner" class="flex justify-end gap-2">
            <BaseButton
              variant="ghost"
              @click="
                router.push({
                  name: 'EditCharacter',
                  params: { id: currentCharacter.id },
                  query: from === 'campaign' && campaignId ? { from, campaignId } : {},
                })
              "
            >
              Edit
            </BaseButton>
            <BaseButton
              variant="remove"
              :confirm-message="`Are you sure you want to delete ${currentCharacter.name || 'this participant'}? This action cannot be undone.`"
              @click="deleteCharacter"
              >Delete</BaseButton
            >
          </div>

          <!-- Identity: portrait + name + system -->
          <div class="flex flex-col items-center text-center">
            <CharacterImage
              :src="currentCharacter.avatarUrl"
              alt="Character portrait"
              class="w-full max-w-64 aspect-square rounded-lg border-2 shadow-md object-cover"
              style="border-color: var(--color-primary-300)"
            />
            <h3 class="mt-3 text-xl font-bold text-default">
              {{ currentCharacter.name }}
            </h3>
            <span class="badge badge-primary mt-1">{{ currentCharacter.systemType }}</span>
          </div>

          <!-- Notes -->
          <div class="text-default">
            <p v-if="currentCharacter.notes">
              <strong>Notes:</strong> {{ currentCharacter.notes }}
            </p>
            <p v-else class="text-sm text-muted italic">No notes.</p>
          </div>

          <!-- Appearance (generic, any system) -->
          <div v-if="currentCharacter.appearance" class="text-default">
            <p><strong>Appearance:</strong></p>
            <p class="text-sm whitespace-pre-line break-words">{{ currentCharacter.appearance }}</p>
          </div>
        </aside>

        <!-- Main column: a clean slot for whatever the active system renders -->
        <div class="flex-1 min-w-0">
          <!-- System-specific character sheet -->
          <SystemSheetRouter :character="currentCharacter" :is-owner="isOwner" />

          <!-- Backstory (core character, shared by every system) -->
          <div class="p-6 border-t border-section">
            <h2 class="section-heading mb-4">Backstory</h2>
            <p
              v-if="currentCharacter.backstory"
              class="text-default whitespace-pre-line break-words"
            >
              {{ currentCharacter.backstory }}
            </p>
            <p v-else class="text-sm text-muted italic">No backstory recorded.</p>

            <!-- Only rendered when the API returned it (owner or campaign GM). -->
            <div
              v-if="currentCharacter.privateBackstory"
              class="mt-6 pt-4 border-t border-section"
            >
              <p class="text-xs italic mb-1 text-muted">
                Private — only you and the GM can see this
              </p>
              <p class="text-default whitespace-pre-line break-words">
                {{ currentCharacter.privateBackstory }}
              </p>
            </div>
          </div>

          <!-- Additional info -->
          <div class="p-6 border-t border-section">
            <h2 class="section-heading mb-4">Additional Information</h2>
            <p>
              <strong>Created:</strong>
              {{ new Date(currentCharacter.createdAt).toLocaleDateString() }}
            </p>
            <p>
              <strong>Last Updated:</strong>
              {{
                currentCharacter.updatedAt
                  ? new Date(currentCharacter.updatedAt).toLocaleDateString()
                  : '-'
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Back navigation -->
      <div class="mt-6">
        <router-link
          v-if="from === 'campaign' && campaignId"
          :to="{ name: 'CampaignView', params: { id: campaignId } }"
          class="element-link"
        >
          ← Back to Campaign
        </router-link>
        <router-link v-else :to="{ name: 'CharactersView' }" class="element-link">
          ← Back to Character List
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
