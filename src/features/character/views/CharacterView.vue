<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import SystemSheetRouter from '@/features/character/components/SystemSheetRouter.vue'
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
  <div class="container mx-auto p-4 max-w-4xl">
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
        class="rounded-lg shadow-lg overflow-hidden"
        style="background-color: var(--color-primary-50)"
      >
        <!-- Action bar -->
        <div v-if="isOwner" class="flex justify-end p-2 space-x-2">
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

        <!-- Generic header: image + basic info -->
        <div class="p-6 border-b" style="border-color: var(--color-third-200)">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div class="flex flex-col items-center md:items-start">
              <CharacterImage
                :src="currentCharacter.avatarUrl"
                alt="Character portrait"
                class="w-64 h-64 rounded-lg border-2 shadow-md mb-2"
                style="border-color: var(--color-primary-300)"
              />
              <h3 class="text-xl font-bold" style="color: var(--color-third-700)">
                {{ currentCharacter.name }}
              </h3>
              <span class="badge badge-primary mt-1">{{ currentCharacter.systemType }}</span>
            </div>
            <div
              class="flex flex-col justify-center md:col-span-1"
              style="color: var(--color-third-700)"
            >
              <div class="space-y-2">
                <p v-if="currentCharacter.notes">
                  <strong>Notes:</strong> {{ currentCharacter.notes }}
                </p>
                <p v-else class="text-sm text-muted italic">No notes.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- System-specific character sheet -->
        <SystemSheetRouter :character="currentCharacter" :is-owner="isOwner" />

        <!-- Additional info -->
        <div class="p-6 border-t border-section">
          <h2 class="section-heading mb-4">Additional Information</h2>
          <p>
            <strong>Created:</strong>
            {{ new Date(currentCharacter.createdAt).toLocaleDateString() }}
          </p>
          <p>
            <strong>Last Updated:</strong>
            {{ currentCharacter.updatedAt ? new Date(currentCharacter.updatedAt).toLocaleDateString() : '-' }}
          </p>
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
