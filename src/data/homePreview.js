/**
 * Home preview content.
 *
 * The example cards an anonymous visitor sees on `/`, so the first page shows
 * what the app holds instead of an empty greeting. Deliberately not demo data:
 * `demoData.js` seeds a *working* Guest Demo session in `localStorage`, while
 * these are illustrations only — nothing here is stored, and nothing links.
 *
 * The art is each system's own placeholder, read from the system modules so a
 * change of art cannot leave the preview behind.
 */
import { DND5E_CHARACTER_DEFAULT_IMAGE } from '@/systems/dnd5e/constants.js'
import {
  OFFWORLDERS_CAMPAIGN_DEFAULT_IMAGE,
  OFFWORLDERS_CHARACTER_DEFAULT_IMAGE,
} from '@/systems/offworlders/constants.js'

const DND5E_CAMPAIGN_IMAGE = '/default-campaign.svg'

/** Example campaigns, in display order: one 5e and one Offworlders per pair. */
export const HOME_PREVIEW_CAMPAIGNS = [
  {
    id: 'preview_campaign_1',
    title: 'Ashfall Keep',
    meta: '5e · 4 players',
    imageUrl: DND5E_CAMPAIGN_IMAGE,
  },
  {
    id: 'preview_campaign_2',
    title: 'Cold Start',
    meta: 'Offworlders · 3 players',
    imageUrl: OFFWORLDERS_CAMPAIGN_DEFAULT_IMAGE,
  },
  {
    id: 'preview_campaign_3',
    title: 'The Sunken Road',
    meta: '5e · 5 players',
    imageUrl: DND5E_CAMPAIGN_IMAGE,
  },
  {
    id: 'preview_campaign_4',
    title: 'Long Haul',
    meta: 'Offworlders · 4 players',
    imageUrl: OFFWORLDERS_CAMPAIGN_DEFAULT_IMAGE,
  },
]

/** Example characters, in display order. */
export const HOME_PREVIEW_CHARACTERS = [
  {
    id: 'preview_character_1',
    title: 'Bramblewick',
    meta: '5e · Level 4 rogue',
    imageUrl: DND5E_CHARACTER_DEFAULT_IMAGE,
  },
  {
    id: 'preview_character_2',
    title: 'Vega Nine',
    meta: 'Offworlders · Outlaw',
    imageUrl: OFFWORLDERS_CHARACTER_DEFAULT_IMAGE,
  },
  {
    id: 'preview_character_3',
    title: 'Sable',
    meta: '5e · Level 7 warlock',
    imageUrl: DND5E_CHARACTER_DEFAULT_IMAGE,
  },
  {
    id: 'preview_character_4',
    title: 'Kesh',
    meta: 'Offworlders · Geek',
    imageUrl: OFFWORLDERS_CHARACTER_DEFAULT_IMAGE,
  },
]
