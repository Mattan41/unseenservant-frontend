<script setup>
/**
 * Dispatches system-specific campaign sub-sections.
 *
 * Mirror of the character dispatchers: it owns the "which system is active"
 * decision and the knowledge of which section belongs to which system, so
 * `CampaignView` stays system-agnostic and never imports `src/systems/**`.
 *
 * The Offworlders Ship lives in the campaign-scoped `features/ship/` feature;
 * the D&D 5e spell search is owned by the `systems/dnd5e/` module.
 */
import {
  DND5E_SYSTEM_TYPE,
  OFFWORLDERS_SYSTEM_TYPE,
} from '@/features/campaign/campaignSystems.js'
import ShipSection from '@/features/ship/components/ShipSection.vue'
import Dnd5eSpellSearchPanel from '@/systems/dnd5e/components/Dnd5eSpellSearchPanel.vue'

defineProps({
  /** The campaign's primary system, e.g. 'DND5E' | 'OFFWORLDERS' | null. */
  systemType: {
    type: String,
    default: null,
  },
  /** Which system-specific section to render: 'ship' | 'spells'. */
  section: {
    type: String,
    required: true,
  },
  campaignId: {
    type: [Number, String],
    required: true,
  },
})
</script>

<template>
  <ShipSection
    v-if="section === 'ship' && systemType === OFFWORLDERS_SYSTEM_TYPE"
    :campaign-id="campaignId"
  />
  <Dnd5eSpellSearchPanel
    v-else-if="section === 'spells' && systemType === DND5E_SYSTEM_TYPE"
  />
  <p v-else class="text-muted">This section is not available for this campaign's system.</p>
</template>
