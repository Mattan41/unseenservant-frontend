<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import SystemSheetRouter from '@/features/character/dispatchers/SystemSheetRouter.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseLinkButton from '@/components/base/BaseLinkButton.vue'
import BaseClampedText from '@/components/base/BaseClampedText.vue'
import ExportMenu from '@/components/base/ExportMenu.vue'
import { buildCharacterExport, buildCharacterBackup } from '@/features/character/characterExport.js'
import { characterSystemLabel } from '@/features/character/dispatchers/systemRegistry.js'
import { fetchExportExtras } from '@/features/character/dispatchers/systemExport.js'
import { downloadTextFile, dateStamp, slugifyFileName } from '@/utils/download.js'
import { useViewRecency } from '@/utils/useViewRecency.js'

const characterStore = useCharacterStore()
const campaignStore = useCampaignStore()
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

// Opening a character is what the character list orders by (`viewHistory.js`).
useViewRecency('character', () => route.params.id, userId)

// The character's own campaign, independent of the `from=campaign` context.
// Resolved from the campaign store; the campaign is fetched on mount when it is
// not already cached.
const characterCampaignId = computed(() => currentCharacter.value?.campaignId || null)
const characterCampaign = computed(() =>
  characterCampaignId.value ? campaignStore.getCampaignById(characterCampaignId.value) : null,
)
const characterCampaignName = computed(() => characterCampaign.value?.name || '')

async function loadCharacterCampaign() {
  const id = characterCampaignId.value
  if (!id || characterCampaign.value) return
  try {
    await campaignStore.fetchCampaign(id)
  } catch {
    // Not a participant (or the fetch failed): fall back to a neutral label.
  }
}

onMounted(async () => {
  try {
    await characterStore.fetchCharacter(characterId.value)
    await loadCharacterCampaign()
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

// Quick-edit of an Offworlders vital straight from the sheet (character owner
// only). Guest mode replaces the whole nested block on PATCH, so send it back
// complete; the steppers are disabled while the request is in flight.
const pendingVital = ref(false)

async function adjustOffworldersVital({ field, value }) {
  const character = currentCharacter.value
  if (!isOwner.value || !character?.offworlders) return
  pendingVital.value = true
  try {
    await characterStore.updateCharacterField(character.id, 'offworlders', {
      ...character.offworlders,
      [field]: value,
    })
  } catch {
    // Error is surfaced by the store.
  } finally {
    pendingVital.value = false
  }
}

// Formats offered by the export menu. JSON is a portable, lossless backup; md
// and txt are human-readable. Images are never included.
const CHARACTER_EXPORT_FORMATS = [
  { id: 'md', label: 'Markdown (.md)' },
  { id: 'txt', label: 'Plain text (.txt)' },
  { id: 'json', label: 'JSON backup (.json)' },
]

const exporting = ref(false)

/**
 * Build and download the character in the chosen format. Spells (D&D 5e) are
 * fetched best-effort beforehand; every other system has no extras.
 * @param {'md'|'txt'|'json'} format
 */
const exportCharacter = async (format) => {
  const character = currentCharacter.value
  if (!character || exporting.value) return

  exporting.value = true
  try {
    const { spells } = await fetchExportExtras(character.systemType, character.id)
    const base = `${slugifyFileName(character.name, 'character')}-${String(
      character.systemType || 'character',
    ).toLowerCase()}-${dateStamp()}`

    if (format === 'json') {
      const backup = buildCharacterBackup(character)
      downloadTextFile({
        filename: `${base}.json`,
        content: `${JSON.stringify(backup, null, 2)}\n`,
        mime: 'application/json',
      })
    } else {
      const content = buildCharacterExport(character, { format, spells })
      downloadTextFile({
        filename: `${base}.${format}`,
        content,
        mime: format === 'md' ? 'text/markdown' : 'text/plain',
      })
    }

    notificationStore.addNotification(
      `Exported ${character.name || 'character'} as .${format}`,
      'success',
    )
  } catch {
    notificationStore.addNotification('Failed to export the character.', 'error')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-7xl p-4">
    <div v-if="loading" class="text-center py-8">
      <div class="spinner h-8 w-8 border-t-2 border-b-2"></div>
      <p class="mt-2 text-secondary">Loading character...</p>
    </div>

    <div v-else-if="!currentCharacter" class="text-center py-8">
      <p class="text-secondary">Character not found.</p>
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
          <!-- Action bar: any viewer may export; only the owner may edit/delete. -->
          <div class="flex flex-wrap justify-end gap-2">
            <ExportMenu
              :formats="CHARACTER_EXPORT_FORMATS"
              :disabled="exporting"
              @export="exportCharacter"
            />
            <template v-if="isOwner">
              <BaseButton
                variant="update"
                icon="edit"
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
            </template>
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
            <span class="badge badge-primary mt-1">
              {{ characterSystemLabel(currentCharacter.systemType) }}
            </span>

            <!-- Link to the character's own campaign (independent of the
                 `from=campaign` context). A full button, so the association is
                 obvious rather than a quiet text link. -->
            <div v-if="characterCampaignId" class="mt-3">
              <BaseLinkButton :to="{ name: 'CampaignView', params: { id: characterCampaignId } }">
                Campaign: {{ characterCampaignName || 'View campaign' }}
              </BaseLinkButton>
            </div>
          </div>

          <!-- Notes -->
          <div class="text-default">
            <p class="mb-1"><strong>Notes:</strong></p>
            <BaseClampedText
              v-if="currentCharacter.notes"
              :text="currentCharacter.notes"
              mode="modal"
              title="Notes"
            />
            <p v-else class="text-sm text-muted italic">No notes.</p>
          </div>

          <!-- Appearance (generic, any system) -->
          <div v-if="currentCharacter.appearance" class="text-default">
            <p class="mb-1"><strong>Appearance:</strong></p>
            <BaseClampedText :text="currentCharacter.appearance" mode="modal" title="Appearance" />
          </div>

          <!-- Backstory (generic, any system) — sits with Notes/Appearance -->
          <div class="text-default">
            <p class="mb-1"><strong>Backstory:</strong></p>
            <BaseClampedText
              v-if="currentCharacter.backstory"
              :text="currentCharacter.backstory"
              mode="modal"
              title="Backstory"
            />
            <p v-else class="text-sm text-muted italic">No backstory recorded.</p>

            <!-- Only rendered when the API returned it (owner or campaign GM). -->
            <div v-if="currentCharacter.privateBackstory" class="mt-4 pt-3 border-t border-section">
              <p class="text-xs italic mb-1 text-muted">
                Private — only you and the GM can see this
              </p>
              <BaseClampedText
                :text="currentCharacter.privateBackstory"
                mode="modal"
                title="Private backstory"
              />
            </div>
          </div>
        </aside>

        <!-- Main column: a clean slot for whatever the active system renders -->
        <div class="flex-1 min-w-0">
          <!-- System-specific character sheet -->
          <SystemSheetRouter
            :character="currentCharacter"
            :is-owner="isOwner"
            :saving="pendingVital"
            @adjust-vital="adjustOffworldersVital"
          />

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
    </div>
  </div>
</template>
