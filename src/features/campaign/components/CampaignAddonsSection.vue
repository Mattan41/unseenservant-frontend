<script setup>
/**
 * Campaign add-ons: the optional capabilities the owner can switch on, and which
 * campaign section each one opens.
 *
 * Owner-only, and hidden for a guest session: Guest Demo serves no add-on endpoint
 * (see docs/ARCHITECTURE.MD → Guest Mode Limitations), so a demo campaign carries
 * its add-ons in the seed data instead and this block shows them read-only behind
 * the same `.guest-notice` the image uploads use.
 *
 * The list itself comes from `campaignAddons.js`, so the next add-on is a row there.
 */
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth/authStore.js'
import { CAMPAIGN_ADDONS, isAddonEnabled } from '@/features/campaign/campaignAddons.js'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseIcon from '@/components/base/BaseIcon.vue'

const props = defineProps({
  /** CampaignResponseDTO — its `addons` list is what is switched on. */
  campaign: {
    type: Object,
    required: true,
  },
  /** True while a change is in flight, so the controls lock rather than double-send. */
  isSaving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle'])

const authStore = useAuthStore()

/** Guest Demo cannot change add-ons, so it does not offer to. */
const readOnly = computed(() => authStore.isGuest)

const addons = computed(() =>
  CAMPAIGN_ADDONS.map((addon) => ({ ...addon, enabled: isAddonEnabled(props.campaign, addon.id) })),
)

function toggle(addon) {
  emit('toggle', { addonId: addon.id, enabled: !addon.enabled })
}
</script>

<template>
  <div>
    <h3 class="section-heading mb-2">Add-ons</h3>
    <p class="text-muted mb-3 text-sm">
      Optional parts of the campaign. They add a section to the campaign menu for
      everybody in it; nothing is deleted when one is switched off.
    </p>

    <ul class="space-y-2">
      <li
        v-for="addon in addons"
        :key="addon.id"
        class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-section p-3"
      >
        <div class="flex items-start gap-2">
          <BaseIcon :name="addon.icon" class="mt-1 h-5 w-5 text-default" />
          <div>
            <p class="text-default font-semibold">
              {{ addon.label }}
              <span v-if="addon.enabled" class="badge badge-secondary ml-1">Added</span>
            </p>
            <p class="text-muted text-xs">{{ addon.description }}</p>
          </div>
        </div>

        <BaseButton
          v-if="!readOnly"
          :variant="addon.enabled ? 'remove' : 'add'"
          :disabled="isSaving"
          @click="toggle(addon)"
        >
          {{ addon.enabled ? 'Remove from campaign' : 'Add to campaign' }}
        </BaseButton>
      </li>
    </ul>

    <div v-if="readOnly" class="guest-notice mt-3">
      Add-ons are pre-set in Guest Demo and cannot be changed here. Sign in — or run
      the demo profile — to manage them.
    </div>
  </div>
</template>
