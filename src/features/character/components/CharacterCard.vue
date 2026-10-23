<script setup>
/**
 * Character card — one roster entry, shared by the character list and the home
 * strip, so a character reads the same wherever it appears.
 *
 * Presentational: the campaign name is resolved by the smart parent from the
 * campaign store and passed in, and nothing here touches a store (see
 * ARCHITECTURE.MD → Component conventions).
 *
 * The whole card is one link, which is why "View Details" is a styled span
 * rather than a control of its own — a link cannot nest a link.
 */
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import {
  characterHealthLabel,
  characterSystemLabel,
} from '@/features/character/dispatchers/systemRegistry.js'

defineProps({
  /** The character to render. */
  character: {
    type: Object,
    required: true,
  },
  /** The campaign's display name, already resolved by the parent. */
  campaignName: {
    type: String,
    default: 'No campaign',
  },
  /**
   * Where the card was opened from — the `?from=` context on `CharacterView`.
   * The character page uses it for the Edit navigation's campaign context, and
   * the default matches the character list.
   */
  from: {
    type: String,
    default: 'characterList',
  },
})
</script>

<template>
  <RouterLink
    :to="{ name: 'CharacterView', params: { id: character.id }, query: { from } }"
    class="bg-[var(--color-surface)] rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer border border-subtle flex flex-col h-full"
  >
    <div class="p-4 flex-grow">
      <div class="flex items-start space-x-3">
        <CharacterImage
          :src="character.avatarUrl"
          :alt="`${character.name} portrait`"
          class="w-16 h-16 rounded-lg border-2 shadow-sm flex-shrink-0 object-cover"
          style="border-color: var(--color-primary-300)"
        />

        <div class="flex-1 min-w-0">
          <h5 class="character-name card-title line-clamp-2 break-words" :title="character.name">
            {{ character.name }}
          </h5>

          <!-- Campaign, with icon -->
          <div class="flex items-center text-xs text-secondary mt-1">
            <span class="inline-flex items-center truncate w-full">
              <span class="mr-1 flex-shrink-0">🏰</span>
              <span class="truncate" :title="campaignName">{{ campaignName }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Character information -->
      <div class="mt-3 pt-2 border-t" style="border-color: var(--border-subtle)">
        <div class="flex flex-wrap gap-2">
          <template v-if="character.dnd5e">
            <span class="character-tag">{{ character.dnd5e.race }}</span>
            <span class="character-tag">{{ character.dnd5e.characterClass }}</span>
            <span class="character-tag-level"> Level {{ character.dnd5e.level }} </span>
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
          <span v-else class="character-tag">{{ characterSystemLabel(character.systemType) }}</span>
        </div>
      </div>
    </div>

    <!-- Footer: last update + the card link's own affordance -->
    <div
      class="px-4 py-2 border-t flex justify-between items-center"
      style="background-color: var(--surface-muted); border-color: var(--border-subtle)"
    >
      <div class="text-xs text-muted truncate mr-2">
        <span v-if="character.lastUpdated"
          >Updated {{ new Date(character.lastUpdated).toLocaleDateString() }}</span
        >
      </div>
      <span
        class="read-more-link font-medium text-sm transition-colors inline-flex items-center flex-shrink-0"
      >
        View Details
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3 ml-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </div>
  </RouterLink>
</template>
