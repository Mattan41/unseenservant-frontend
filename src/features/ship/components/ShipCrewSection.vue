<script setup>
/**
 * Ship crew manifest: one card per current participant. The signed-in user's
 * card is editable in place (notes, the characters they have aboard, images);
 * everyone else's are read-only.
 *
 * Presentational — props in, events out. The parent (ShipSheet/ShipSection)
 * persists each change and owns the shared image gallery, so crew images open in
 * the same lightbox as the ship's own images. A picked image over the upload
 * limit emits `size-error` with the sentence to show.
 */
import { computed, reactive, ref, watch } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseMarkdownField from '@/components/base/BaseMarkdownField.vue'
import MarkdownText from '@/components/base/MarkdownText.vue'
import CampaignImage from '@/features/campaign/components/CampaignImage.vue'
import { getRoleBadgeClass } from '@/features/campaign/campaignUtils.js'
import { validateImageSize } from '@/utils/imageUpload.js'

const props = defineProps({
  /** Crew manifest: one entry per current participant. */
  crew: {
    type: Array,
    default: () => [],
  },
  /** Id of the signed-in user; their entry is the editable one. */
  currentUserId: {
    type: [String, Number],
    default: null,
  },
  /** True while a save/upload is in flight. */
  saving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save', 'add-image', 'remove-image', 'open-image', 'size-error'])

const editing = ref(false)
const draft = reactive({ notes: '', characters: [] })
const fileInput = ref(null)

const myEntry = computed(
  () => props.crew.find((member) => String(member.userId) === String(props.currentUserId)) || null,
)
// Everyone else, in roster order.
const otherEntries = computed(() =>
  props.crew.filter((member) => String(member.userId) !== String(props.currentUserId)),
)

function resetDraft() {
  const entry = myEntry.value
  draft.notes = entry?.notes || ''
  draft.characters = (entry?.characters || []).map((row) => ({ ...row }))
}

// Reset the draft from the saved entry — but never while editing, so a crew
// image upload (which refreshes the entry) cannot wipe in-progress notes.
watch(
  myEntry,
  () => {
    if (!editing.value) resetDraft()
  },
  { immediate: true },
)

function startEditing() {
  resetDraft()
  editing.value = true
}

function cancelEditing() {
  resetDraft()
  editing.value = false
}

function addCharacterRow() {
  draft.characters.push({ name: '', roleOnShip: '' })
}

function removeCharacterRow(index) {
  draft.characters.splice(index, 1)
}

function save() {
  emit('save', {
    notes: draft.notes,
    characters: draft.characters.map((row) => ({ ...row })),
  })
  editing.value = false
}

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileChange(event) {
  const file = event.target.files[0]
  event.target.value = ''
  if (!file) return

  const sizeError = validateImageSize(file)
  if (sizeError) {
    emit('size-error', sizeError)
    return
  }

  emit('add-image', file)
}
</script>

<template>
  <div class="border-t border-section pt-4">
    <div class="flex flex-wrap justify-between items-baseline gap-2 mb-3">
      <h4 class="font-semibold text-default">Crew</h4>
      <span class="text-xs text-muted">Everyone aboard — notes, images and purpose</span>
    </div>

    <!-- My entry (editable in place) -->
    <div class="border border-section rounded-lg p-4 mb-4">
      <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-medium text-default">{{ myEntry?.nickname || 'You' }}</span>
          <span class="badge" :class="getRoleBadgeClass(myEntry?.role)">
            {{ myEntry?.role || 'PLAYER' }}
          </span>
          <span class="text-xs text-muted">(you)</span>
        </div>
        <BaseButton v-if="!editing" variant="update" icon="edit" @click="startEditing">
          Edit my entry
        </BaseButton>
      </div>

      <template v-if="editing">
        <BaseMarkdownField
          id="crew-notes"
          v-model="draft.notes"
          class="mb-4"
          label="Notes"
          :rows="3"
          placeholder="Describe your personal space, what you are doing aboard, etc..."
        />

        <div class="mb-4">
          <p class="text-sm font-medium text-default mb-1">Characters aboard</p>
          <div v-if="draft.characters.length" class="flex flex-col gap-2">
            <div
              v-for="(row, index) in draft.characters"
              :key="index"
              class="flex flex-wrap items-center gap-2"
            >
              <label :for="`crew-character-name-${index}`" class="sr-only">Character name</label>
              <input
                :id="`crew-character-name-${index}`"
                v-model="row.name"
                type="text"
                class="input-field p-2 rounded flex-1 min-w-40"
                placeholder="Character name"
              />
              <label :for="`crew-character-role-${index}`" class="sr-only">Role on ship</label>
              <input
                :id="`crew-character-role-${index}`"
                v-model="row.roleOnShip"
                type="text"
                class="input-field p-2 rounded flex-1 min-w-40"
                placeholder="Role on ship (optional)"
              />
              <BaseButton variant="remove" @click="removeCharacterRow(index)">Remove</BaseButton>
            </div>
          </div>
          <p v-else class="text-sm text-muted italic mb-2">No characters listed yet.</p>
          <BaseButton variant="ghost" class="mt-2" @click="addCharacterRow"
            >+ add crew member</BaseButton
          >
        </div>

        <div class="mb-4">
          <p class="text-sm font-medium text-default mb-1">Images</p>
          <div v-if="myEntry?.imageUrls?.length" class="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
            <div v-for="url in myEntry.imageUrls" :key="url" class="flex flex-col gap-1">
              <button
                type="button"
                class="block overflow-hidden rounded border border-section"
                @click="emit('open-image', url)"
              >
                <CampaignImage :src="url" alt="Crew artwork" class="w-full h-20 object-cover" />
              </button>
              <BaseButton variant="remove" :disabled="saving" @click="emit('remove-image', url)">
                Remove
              </BaseButton>
            </div>
          </div>
          <p v-else class="text-sm text-muted italic mb-2">No images yet.</p>
          <label for="crew-image-upload" class="sr-only">Upload crew image</label>
          <input
            id="crew-image-upload"
            ref="fileInput"
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp"
            class="hidden"
            @change="onFileChange"
          />
          <BaseButton variant="add" :disabled="saving" @click="triggerFileInput"
            >Add image</BaseButton
          >
          <p class="text-xs text-muted mt-1">Your images appear in the ship gallery above.</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <BaseButton variant="add" :disabled="saving" :loading="saving" @click="save">
            Save my entry
          </BaseButton>
          <BaseButton variant="ghost" :disabled="saving" @click="cancelEditing">Cancel</BaseButton>
        </div>
      </template>

      <template v-else>
        <ul v-if="myEntry?.characters?.length" class="mt-2 flex flex-col gap-1 text-default">
          <li v-for="(row, index) in myEntry.characters" :key="index">
            <span class="font-medium">{{ row.name || 'Unnamed' }}</span>
            <span v-if="row.roleOnShip" class="text-muted"> — {{ row.roleOnShip }}</span>
          </li>
        </ul>
        <MarkdownText v-if="myEntry?.notes" :text="myEntry.notes" />
        <p v-else class="text-sm text-muted italic">No notes yet.</p>
      </template>
    </div>

    <!-- Other participants (read-only) -->
    <ul v-if="otherEntries.length" class="flex flex-col gap-3">
      <li
        v-for="member in otherEntries"
        :key="member.userId"
        class="border border-section rounded-lg p-4"
      >
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <span class="font-medium text-default">{{ member.nickname || 'Player' }}</span>
          <span class="badge" :class="getRoleBadgeClass(member.role)">
            {{ member.role || 'PLAYER' }}
          </span>
        </div>
        <MarkdownText v-if="member.notes" :text="member.notes" />
        <p v-else class="text-sm text-muted italic">No notes yet.</p>
        <ul v-if="member.characters.length" class="mt-2 flex flex-col gap-1 text-default">
          <li v-for="(row, index) in member.characters" :key="index">
            <span class="font-medium">{{ row.name || 'Unnamed' }}</span>
            <span v-if="row.roleOnShip" class="text-muted"> — {{ row.roleOnShip }}</span>
          </li>
        </ul>
        <div v-if="member.imageUrls.length" class="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          <button
            v-for="url in member.imageUrls"
            :key="url"
            type="button"
            class="block overflow-hidden rounded border border-section"
            @click="emit('open-image', url)"
          >
            <CampaignImage :src="url" alt="Crew artwork" class="w-full h-20 object-cover" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
