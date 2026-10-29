<script setup>
/**
 * Ship crew manifest: one card per character in the campaign. The crew is the
 * party, so a card is the character — its portrait, its name, the player who
 * brings it, its notes and its gallery. Nothing is edited here: the notes and
 * the images belong to the character and are edited in Edit character.
 *
 * Presentational — props in, events out. The parent (ShipSheet) owns the shared
 * lightbox, so an image click emits `open-image` with the character's images and
 * name: the picture opens captioned with the character and steps through that
 * character's art, never through the ship's own gallery.
 */
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import MarkdownText from '@/components/base/MarkdownText.vue'
import { getCharacterOwnerName, getRoleBadgeClass } from '@/features/campaign/campaignUtils.js'

const props = defineProps({
  /**
   * The campaign's characters, in the order the campaign store lists them
   * (own characters first, then a GM's, then alphabetical).
   */
  characters: {
    type: Array,
    default: () => [],
  },
  /** The campaign's participants, so a card can name the player and their role. */
  participants: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['open-image'])

/** The nickname of the participant who plays this character. */
function playerName(character) {
  return getCharacterOwnerName(character, props.participants)
}

/** That participant's table role, for the badge. */
function playerRole(character) {
  const player = (props.participants || []).find(
    (participant) => String(participant.id) === String(character.ownerId),
  )
  return player?.role || 'PLAYER'
}

/**
 * Open one of a character's images in the ship's lightbox, handing the parent
 * the set to step through (this character's images) and the caption to show.
 */
function openImage(character, url) {
  emit('open-image', {
    url,
    images: [...(character.imageUrls || [])],
    label: character.name || 'Crew',
  })
}
</script>

<template>
  <div class="border-t border-section pt-4">
    <div class="flex flex-wrap justify-between items-baseline gap-2 mb-3">
      <h4 class="font-semibold text-default">Crew</h4>
      <span class="text-xs text-muted"
        >Everyone aboard — notes and images, edited on the character</span
      >
    </div>

    <ul v-if="characters.length" class="flex flex-col gap-3">
      <li
        v-for="character in characters"
        :key="character.id"
        class="border border-section rounded-lg p-4"
      >
        <div class="flex items-start gap-3">
          <CharacterImage
            :src="character.avatarUrl"
            :alt="`${character.name || 'Character'} portrait`"
            :system-type="character.systemType"
            class="w-12 h-12 rounded-lg border border-section object-cover flex-shrink-0"
          />
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium text-default">{{ character.name || 'Unnamed' }}</span>
            <span class="text-sm text-muted">played by {{ playerName(character) }}</span>
            <span class="badge" :class="getRoleBadgeClass(playerRole(character))">
              {{ playerRole(character) }}
            </span>
          </div>
        </div>

        <MarkdownText v-if="character.notes" :text="character.notes" />
        <p v-else class="text-sm text-muted italic">No notes yet.</p>

        <div v-if="character.imageUrls?.length" class="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          <button
            v-for="url in character.imageUrls"
            :key="url"
            type="button"
            class="block overflow-hidden rounded border border-section"
            @click="openImage(character, url)"
          >
            <CharacterImage
              :src="url"
              :alt="`${character.name || 'Character'} artwork`"
              :system-type="character.systemType"
              class="w-full h-20 object-cover"
            />
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="text-sm text-muted italic">No characters in this campaign yet.</p>
  </div>
</template>
