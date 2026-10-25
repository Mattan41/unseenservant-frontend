/**
 * Guest Mode LocalStorage Adapter
 *
 * This module provides an axios-like interface that reads/writes to localStorage.
 * It features automatic key-fallback mapping to handle both snake_case and camelCase
 * seed structures transparently.
 *
 * The admin surface (`/api/admin/**`) is deliberately **not** served: Guest Demo
 * does not demonstrate user administration, and Settings → Admin is unreachable
 * while a guest session is active. Those URLs answer the generic fallback.
 */

import { useAuthStore } from '@/features/auth/authStore'
import { getCampaignPermissions, isCampaignGm } from '@/features/campaign/campaignPermissions.js'
import { MAX_PAGES as JOURNAL_MAX_PAGES, MAX_PAGE_CHARS as JOURNAL_MAX_PAGE_CHARS } from '@/features/journal/journalLimits.js'
import { MAX_NOTE_LENGTH as PLANNER_MAX_NOTE, MAX_TITLE_LENGTH as PLANNER_MAX_TITLE } from '@/features/planner/plannerConstants.js'

// Core local storage keys used by the adapter
const KEYS = {
  USER: 'guest_user',
  USERS: 'guest_users',
  CHARACTERS: 'guest_characters',
  CAMPAIGNS: 'guest_campaigns',
  MESSAGES: 'guest_messages',
  SHIPS: 'guest_ships',
  CREW: 'guest_ship_crew',
  JOURNALS: 'guest_journals',
  JOURNAL_PAGES: 'guest_journal_pages',
  PLANS: 'guest_planner_plans',
  PLAN_DATES: 'guest_planner_dates',
  PLAN_ATTENDANCES: 'guest_planner_attendances',
  PLAN_EXCLUSIONS: 'guest_planner_exclusions',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get data from localStorage with fallback handling for casing mismatches
 * @param {string} key - The intended storage key
 * @param {*} defaultValue - Fallback value if nothing is resolved
 */
function getData(key, defaultValue = null) {
  try {
    let data = localStorage.getItem(key)

    // Fallback alignment: Map seed keys to adapter specifications dynamically
    if (!data) {
      if (key === 'guest_user') data = localStorage.getItem('guestUser')
      if (key === 'guest_characters') data = localStorage.getItem('characters')
      if (key === 'guest_campaigns') data = localStorage.getItem('campaigns')
      if (key === 'guest_users') data = localStorage.getItem('users')
      if (key === 'guest_ships') data = localStorage.getItem('ships')

      // Auto-repair/normalize the location for immediate alignment
      if (data) {
        localStorage.setItem(key, data)
        console.debug(`[guest-axios] Successfully normalized and mapped seed key: ${key}`)
      }
    }

    return data ? JSON.parse(data) : defaultValue
  } catch (error) {
    console.error(`[guest-axios] Failed to read storage key [${key}]:`, error)
    return defaultValue
  }
}

function setData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error(`[guest-axios] Failed to write storage key [${key}]:`, error)
  }
}

function generateId() {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/** Default Offworlders ship (rulebook p.13): 15 Hull, 0 Armor, 1D6, 4 Fuel. */
function defaultShip(campaignId) {
  return {
    id: generateId(),
    campaignId: String(campaignId),
    version: 0,
    name: '',
    hull: 15,
    hullMax: 15,
    armor: 0,
    damage: '1D6',
    driveFuel: 4,
    maxDriveFuel: 4,
    credits: 0,
    upgrades: [],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/** Find a campaign's ship in localStorage, or null. */
function findShip(campaignId) {
  const ships = getData(KEYS.SHIPS, [])
  return ships.find((ship) => String(ship.campaignId) === String(campaignId)) || null
}

/** Create the default ship for a campaign if it has none (idempotent). */
function ensureDefaultShip(campaignId) {
  const ships = getData(KEYS.SHIPS, [])
  const existing = ships.find((ship) => String(ship.campaignId) === String(campaignId))
  if (existing) return existing
  const ship = defaultShip(campaignId)
  ships.push(ship)
  setData(KEYS.SHIPS, ships)
  return ship
}

/** Guest mode can't really store uploads, so images resolve to a stock placeholder. */
const SHIP_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'

/**
 * Apply a (mocked) ship image upload: set the profile image, or append to the
 * gallery. Returns the updated ship, or null when the campaign has no ship.
 */
function applyShipImageUpload(campaignId, gallery) {
  const ships = getData(KEYS.SHIPS, [])
  const index = ships.findIndex((ship) => String(ship.campaignId) === String(campaignId))
  if (index === -1) return null

  const ship = { ...ships[index] }
  if (gallery) {
    ship.imageUrls = [...(ship.imageUrls || []), SHIP_IMAGE_FALLBACK]
  } else {
    ship.imageUrl = SHIP_IMAGE_FALLBACK
  }
  ship.version = Number(ship.version || 0) + 1
  ship.updatedAt = new Date().toISOString()
  ships[index] = ship
  setData(KEYS.SHIPS, ships)
  return ship
}

/** The add-on key the planner is stored under (mirrors the backend's `AddonKey`). */
const PLANNER_KEY = 'planner'

/** One campaign by id, or null. */
function guestCampaign(campaignId) {
  return getData(KEYS.CAMPAIGNS, []).find((c) => String(c.id) === String(campaignId)) || null
}

/**
 * Whether a campaign has an add-on switched on.
 *
 * Guest mode deliberately serves **no** add-on endpoint: what a demo campaign has is
 * what its seed data says (`demoData.js`), and the Add-ons block in Campaign
 * Settings is read-only for a guest session (see docs/ARCHITECTURE.MD → Guest Mode
 * Limitations).
 */
function guestAddonEnabled(campaignId, addonKey) {
  const campaign = guestCampaign(campaignId)
  return Array.isArray(campaign?.addons) && campaign.addons.includes(addonKey)
}

/** The plans stored for one campaign. */
function guestPlans(campaignId) {
  return getData(KEYS.PLANS, []).filter((plan) => String(plan.campaignId) === String(campaignId))
}

function guestPlanDates(planId) {
  return getData(KEYS.PLAN_DATES, []).filter((date) => String(date.planId) === String(planId))
}

function guestPlanExclusions(planId) {
  return getData(KEYS.PLAN_EXCLUSIONS, []).filter((row) => String(row.planId) === String(planId))
}

/** Insert or replace one stored row, keyed on its id. */
function savePlannerRow(key, row) {
  const rows = getData(key, [])
  const index = rows.findIndex((entry) => String(entry.id) === String(row.id))
  setData(key, index === -1 ? [...rows, row] : rows.map((entry, i) => (i === index ? row : entry)))
  return row
}

/** Delete one stored row. */
function removePlannerRow(key, id) {
  setData(key, getData(key, []).filter((entry) => String(entry.id) !== String(id)))
}

/**
 * Every campaign participant as a roster row, flagged when this plan has them out.
 * The roster is implicit in guest mode exactly as on the backend: participants
 * minus the plan's exclusion rows.
 */
function guestPlanMembers(campaignId, exclusions) {
  return (guestCampaign(campaignId)?.participants || [])
    .map((participant) => {
      const exclusion = exclusions.find((row) => String(row.userId) === String(participant.id))
      return {
        userId: participant.id,
        nickname: participant.nickname,
        role: participant.role,
        excluded: Boolean(exclusion),
        removedByOwner: Boolean(exclusion?.removedByOwner),
      }
    })
    .sort((a, b) => String(a.nickname).localeCompare(String(b.nickname), undefined, { sensitivity: 'base' }))
}

/** A whole plan, the way the backend's PlannerPlanDTO describes one. */
function guestPlanDTO(plan) {
  if (!plan) return null

  const attendances = getData(KEYS.PLAN_ATTENDANCES, [])
  const dates = guestPlanDates(plan.id).sort((a, b) => String(a.date).localeCompare(String(b.date)))

  return {
    id: plan.id,
    campaignId: plan.campaignId,
    title: plan.title,
    description: plan.description || '',
    status: plan.status,
    decidedDateId: plan.decidedDateId ?? null,
    createdByUserId: plan.createdByUserId,
    version: Number(plan.version || 0),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    dates: dates.map((date) => ({
      id: date.id,
      date: date.date,
      startTime: date.startTime ?? null,
      endTime: date.endTime ?? null,
      note: date.note ?? null,
      createdByUserId: date.createdByUserId,
      version: Number(date.version || 0),
      attendances: attendances
        .filter((entry) => String(entry.planDateId) === String(date.id))
        .map((entry) => ({ userId: entry.userId, state: entry.state })),
    })),
    members: guestPlanMembers(plan.campaignId, guestPlanExclusions(plan.id)),
  }
}

/**
 * Resolve a plan for the current guest, or the refusal to answer with. Mirrors the
 * backend's order: unknown id → 404, add-on off → 400, outsider → 403.
 */
function resolveGuestPlan(planId, { ownerOnly = false } = {}) {
  const plan = getData(KEYS.PLANS, []).find((entry) => String(entry.id) === String(planId))
  if (!plan) return { error: notFound('Plan not found with id: ' + planId) }
  if (!guestAddonEnabled(plan.campaignId, PLANNER_KEY)) {
    return { error: badRequest('The planner is not enabled for this campaign') }
  }
  if (!isGuestParticipant(plan.campaignId)) {
    return { error: forbidden('User is not a participant in this campaign') }
  }
  if (ownerOnly && !guestCampaignPermissions(plan.campaignId).isOwner) {
    return { error: forbidden('Only the campaign owner can move another member in or out of a plan') }
  }
  return { plan }
}

/** Resolve one candidate date, and the plan it belongs to. */
function resolveGuestDate(dateId) {
  const date = getData(KEYS.PLAN_DATES, []).find((entry) => String(entry.id) === String(dateId))
  if (!date) return { error: notFound('Plan date not found with id: ' + dateId) }

  const resolved = resolveGuestPlan(date.planId)
  return resolved.error ? resolved : { plan: resolved.plan, date }
}

/** A plan the caller may change: open, and settled plans freeze until reopened. */
function requireOpenPlan(plan) {
  if (plan.status !== 'OPEN') {
    return badRequest('This plan is decided. Reopen it before changing dates, answers or the roster.')
  }
  return null
}

/** Remove a gallery image (by URL) from a campaign's ship. */
function removeShipGalleryImage(campaignId, imageUrl) {
  const ships = getData(KEYS.SHIPS, [])
  const index = ships.findIndex((ship) => String(ship.campaignId) === String(campaignId))
  if (index === -1) return null

  const ship = { ...ships[index] }
  ship.imageUrls = (ship.imageUrls || []).filter((url) => url !== imageUrl)
  ship.version = Number(ship.version || 0) + 1
  ship.updatedAt = new Date().toISOString()
  ships[index] = ship
  setData(KEYS.SHIPS, ships)
  return ship
}

/**
 * Ship crew manifest helpers. One entry per participant, keyed by campaign +
 * user (stored as `guest_ship_crew`); entries persist when a participant leaves
 * and re-activate on rejoin, mirroring the backend.
 */
function shipCrewRows(campaignId) {
  return getData(KEYS.CREW, []).filter((row) => String(row.campaignId) === String(campaignId))
}

function saveShipCrewRow(campaignId, userId, patch) {
  const rows = getData(KEYS.CREW, [])
  const index = rows.findIndex(
    (row) => String(row.campaignId) === String(campaignId) && String(row.userId) === String(userId),
  )
  const base =
    index === -1
      ? {
          campaignId: String(campaignId),
          userId: String(userId),
          notes: '',
          imageUrls: [],
          characters: [],
        }
      : rows[index]
  const next = { ...base, ...patch }
  if (index === -1) rows.push(next)
  else rows[index] = next
  setData(KEYS.CREW, rows)
  return next
}

/** Crew DTOs for the campaign's current participants, in roster order. */
function crewDTOs(campaignId) {
  const campaigns = getData(KEYS.CAMPAIGNS, [])
  const campaign = campaigns.find((c) => String(c.id) === String(campaignId))
  const rows = shipCrewRows(campaignId)
  return (campaign?.participants || []).map((participant) => {
    const row = rows.find((entry) => String(entry.userId) === String(participant.id))
    return {
      userId: participant.id,
      nickname: participant.nickname,
      role: participant.role || 'PLAYER',
      notes: row?.notes || '',
      imageUrls: row?.imageUrls || [],
      characters: row?.characters || [],
    }
  })
}

/** True when the signed-in guest is a participant of the campaign. */
function isGuestParticipant(campaignId) {
  const campaigns = getData(KEYS.CAMPAIGNS, [])
  const campaign = campaigns.find((c) => String(c.id) === String(campaignId))
  return (
    !!campaign &&
    (campaign.participants || []).some(
      (participant) => String(participant.id) === String(currentGuestUserId()),
    )
  )
}

/** The signed-in guest's crew DTO after a change. */
function myCrewDTO(campaignId) {
  const userId = currentGuestUserId()
  return (
    crewDTOs(campaignId).find((member) => String(member.userId) === String(userId)) || {
      userId,
      nickname: '',
      role: 'PLAYER',
      notes: '',
      imageUrls: [],
      characters: [],
    }
  )
}

function extractId(url) {
  const cleanUrl = url.split('?')[0]
  const parts = cleanUrl.split('/').filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
    if (part.startsWith('guest_') || !Number.isNaN(Number.parseInt(part, 10))) {
      return part
    }
  }
  return null
}

function isGuestMode() {
  try {
    const authStore = useAuthStore()
    return authStore.isGuest || false
  } catch {
    return false
  }
}

function currentGuestUserId() {
  return getData(KEYS.USER, null)?.id || 'guest_demo'
}

function isGuestGameMaster(campaignId, userId) {
  if (!campaignId) return false
  const campaigns = getData(KEYS.CAMPAIGNS, [])
  const campaign = campaigns.find((c) => String(c.id) === String(campaignId))
  return isCampaignGm(campaign || null, userId)
}

/**
 * Resolve the current guest user's campaign capabilities from localStorage,
 * reusing the app-wide permission model so guest mode enforces the same rules
 * the real backend would (ownership → administration, GM → world-building).
 */
function guestCampaignPermissions(campaignId) {
  const campaigns = getData(KEYS.CAMPAIGNS, [])
  const campaign = campaigns.find((c) => String(c.id) === String(campaignId)) || null
  return getCampaignPermissions(campaign, currentGuestUserId())
}

/**
 * Build an axios-shaped rejection for guest mode.
 *
 * Guest mode has no HTTP layer, but every caller expects an axios error: a real
 * `Error` whose `response.data.message` and `response.status` are set (the
 * stores branch on `err.response.status`, `extractErrorMessage` reads
 * `response.data`). Wrapping the object in `new Error(...)` keeps that shape
 * while the rejection reason is a proper `Error`.
 *
 * @param {string} message Human-readable error message.
 * @param {number} status HTTP status code to mirror.
 * @returns {Error} An `Error` carrying a `response` shaped like axios'.
 */
function guestError(message, status) {
  return Object.assign(new Error(message), {
    response: {
      data: { message },
      status,
      handled: false,
    },
  })
}

/** Reject a guest request with the same 403 shape axios surfaces in full mode. */
function forbidden(message) {
  return Promise.reject(guestError(message, 403))
}

/** Reject a guest request with the same 400 shape the backend's validation uses. */
function badRequest(message) {
  return Promise.reject(guestError(message, 400))
}

/** Reject a guest request with the same 404 shape the backend uses. */
function notFound(message) {
  return Promise.reject(guestError(message, 404))
}

/** Reject a guest request with the same 409 shape the backend uses. */
function conflict(message) {
  return Promise.reject(guestError(message, 409))
}

/**
 * Mirrors the backend rule: the private backstory is returned only to the
 * character's owner or the campaign GM. Everyone else gets it stripped out.
 */
function withVisibleBackstory(character) {
  if (!character || typeof character !== 'object' || !('privateBackstory' in character)) {
    return character
  }
  const viewerId = currentGuestUserId()
  const isOwner = String(character.ownerId) === String(viewerId)
  if (isOwner || isGuestGameMaster(character.campaignId, viewerId)) {
    return character
  }
  const stripped = { ...character }
  delete stripped.privateBackstory
  return stripped
}

function withVisibleBackstories(characters) {
  return Array.isArray(characters) ? characters.map(withVisibleBackstory) : characters
}

// ============================================================================
// Route handlers — one function per endpoint
// ============================================================================
// Each handler mirrors one branch of the former `get`/`post`/… if-chain: the
// same guards, the same status codes and the same messages. Which handler runs
// for a URL is decided by the ROUTES table further down, never by the handler.

/** Wrap a payload in the axios-shaped response every caller expects. */
function ok(data) {
  return Promise.resolve({ data })
}

// --- GET --------------------------------------------------------------------

/** GET api/users/me | api/me | api/users/{id}/me — the signed-in profile. */
function handleProfile() {
  return ok(getData(KEYS.USER, null))
}

/**
 * GET api/users/search?query=… — the demo directory, matched on display name,
 * username or email. A falsy field never matches, exactly as before.
 */
function handleUserSearch({ url }) {
  const params = new URLSearchParams(url.split('?')[1] || '')
  const query = (params.get('query') || '').toLowerCase()
  const matches = (value) => (value ? value.toLowerCase().includes(query) : false)

  return ok(
    getData(KEYS.USERS, []).filter(
      (user) => matches(user.displayName) || matches(user.username) || matches(user.email),
    ),
  )
}

/** GET api/characters/{id}/spells — a character's saved spells. */
function handleCharacterSpells({ url }) {
  const match = url.match(/characters\/([^/]+)\/spells/)
  const characterId = match?.[1] || null
  if (!characterId) return ok([])

  const character = getData(KEYS.CHARACTERS, []).find((c) => String(c.id) === String(characterId))
  return ok(character?.spells || [])
}

/** GET api/characters?campaignId={id} — a campaign's party. */
function handleCharactersByCampaign({ url }) {
  const match = url.match(/campaignId=([^&]+)/)
  const campaignId = match?.[1] || null
  const characters = getData(KEYS.CHARACTERS, [])

  return ok(
    withVisibleBackstories(characters.filter((c) => String(c.campaignId) === String(campaignId))),
  )
}

/** GET api/characters/without-campaign — the characters in no campaign. */
function handleDetachedCharacters() {
  const characters = getData(KEYS.CHARACTERS, [])
  return ok(withVisibleBackstories(characters.filter((character) => !character.campaignId)))
}

/** GET api/characters/me — the demo user's own characters. */
function handleOwnCharacters() {
  const characters = getData(KEYS.CHARACTERS, [])
  return ok(withVisibleBackstories(characters.filter((c) => c.ownerId === 'guest_demo')))
}

/**
 * GET api/characters and api/characters/{id} — the last route of the family.
 * Without an id in the path it answers the whole list, which is what the former
 * chain did when its id test came up empty.
 */
function handleCharacters({ url }) {
  const id = extractId(url)
  const characters = getData(KEYS.CHARACTERS, [])
  if (!id || id === 'characters' || id === 'me') return ok(withVisibleBackstories(characters))

  const character = characters.find((c) => String(c.id) === String(id))
  return ok(withVisibleBackstory(character || null))
}

/** GET api/campaigns/{id}/ship/crew — the crew manifest (participants only). */
function handleShipCrew({ url }) {
  const match = url.match(/campaigns\/([^/]+)\/ship\/crew/)
  const campaignId = match?.[1] || null
  if (!campaignId || !isGuestParticipant(campaignId)) {
    return forbidden('You are not a participant in this campaign.')
  }

  return ok(crewDTOs(campaignId))
}

/** GET api/campaigns/{id}/ship — the campaign's ship, 404 when it has none. */
function handleShip({ url }) {
  const match = url.match(/campaigns\/([^/]+)\/ship/)
  const campaignId = match?.[1] || null
  const ship = campaignId ? findShip(campaignId) : null
  if (!ship) return Promise.reject(guestError('Ship not found for campaign: ' + campaignId, 404))

  return ok(ship)
}

/** GET api/campaigns and api/campaigns/{id}. */
function handleCampaigns({ url }) {
  const campaigns = getData(KEYS.CAMPAIGNS, [])
  const id = extractId(url)
  if (!id || id === 'campaigns' || id === 'me') return ok(campaigns)

  return ok(campaigns.find((c) => String(c.id) === String(id)) || null)
}

/**
 * GET api/messages | api/messages/{id} | api/messages/campaign/{id}.
 *
 * Unreachable through `get`: the profile route tests `url.includes('api/me')`,
 * which the `api/messages` paths satisfy as well. Kept so the branch survives a
 * future narrowing of that pattern.
 */
function handleMessages({ url }) {
  const messages = getData(KEYS.MESSAGES, [])
  const campaignId = messagesCampaignId(url)
  if (campaignId) {
    return ok(messages.filter((message) => String(message.campaignId) === String(campaignId)))
  }

  const id = extractId(url)
  if (id && id !== 'messages') {
    return ok(messages.find((message) => String(message.id) === String(id)) || null)
  }

  return ok(messages)
}

/** The campaign id in a `.../campaign/{id}` messages URL, or null. */
function messagesCampaignId(url) {
  if (!url.includes('/campaign/')) return null
  const parts = url.split('/')
  const index = parts.indexOf('campaign')
  return index === -1 ? null : parts[index + 1]?.split('?')[0] || null
}

// --- POST -------------------------------------------------------------------

/** POST api/campaigns/{id}/ship/crew/me/images — mock a crew image upload. */
function addCrewImage({ url }) {
  const match = url.match(/campaigns\/([^/]+)\/ship\/crew\/me\/images/)
  const campaignId = match?.[1] || null
  if (!campaignId || !isGuestParticipant(campaignId)) {
    return forbidden('You are not a participant in this campaign.')
  }

  const userId = currentGuestUserId()
  const existing = shipCrewRows(campaignId).find((row) => String(row.userId) === String(userId))
  saveShipCrewRow(campaignId, userId, {
    imageUrls: [...(existing?.imageUrls || []), SHIP_IMAGE_FALLBACK],
  })
  return ok(myCrewDTO(campaignId))
}

/** POST api/campaigns/{id}/ship/image — mock the ship profile image upload. */
function addShipImage({ url }) {
  const match = url.match(/campaigns\/([^/]+)\/ship\/image/)
  return ok(applyShipImageUpload(match?.[1] || null, false))
}

/**
 * POST api/campaigns/{id}/ship/images — the gallery upload.
 *
 * Never reached: `/ship/images` contains `/ship/image`, so the route above
 * answers that URL first. Kept in that order on purpose (see ROUTES).
 */
function addShipGalleryImage({ url }) {
  const match = url.match(/campaigns\/([^/]+)\/ship\/images/)
  return ok(applyShipImageUpload(match?.[1] || null, true))
}

/** POST api/campaigns/{id}/image — GM only; answers a stock placeholder. */
function uploadCampaignImage({ url }) {
  const campaignId = extractId(url)
  if (!guestCampaignPermissions(campaignId).canUploadCampaignImage) {
    return forbidden('You do not have permission to change the campaign image.')
  }

  return ok({ imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe' })
}

/** POST api/characters/{id}/image — mock the avatar upload. */
function uploadCharacterImage() {
  return ok({ avatarUrl: '/defaultCharacter.svg' })
}

/**
 * POST api/characters/{id}/spells — save a spell. Saving the same key twice
 * answers with the spell already stored instead of duplicating it.
 */
function saveSpell({ url, data }) {
  const match = url.match(/characters\/([^/]+)\/spells/)
  const characterId = match?.[1] || null
  if (!characterId) return ok(null)

  const characters = getData(KEYS.CHARACTERS, [])
  const index = characters.findIndex((c) => String(c.id) === String(characterId))
  if (index === -1) return ok(null)
  if (!characters[index].spells) characters[index].spells = []

  const sourceData = data.spellDetails || data
  const spellKey = sourceData.key || data.slug
  const stored = characters[index].spells.find((s) => s.key === spellKey || s.slug === spellKey)
  if (stored) return ok(stored)

  // Store the full normalized spell object (sourceData is already normalized by
  // spellStore.saveSpellToCharacter before it is passed as spellDetails).
  const spellToStore = { ...sourceData }
  if (!spellToStore.key) spellToStore.key = data.slug || `spell_${Date.now()}`
  if (spellToStore.isHomebrew === undefined) spellToStore.isHomebrew = data.isHomebrew || false
  characters[index].spells.push(spellToStore)
  setData(KEYS.CHARACTERS, characters)
  return ok(spellToStore)
}

/** POST api/characters — create a character, owned by the demo user. */
function createCharacter({ data }) {
  const characters = getData(KEYS.CHARACTERS, [])
  const created = {
    ...data,
    id: generateId(),
    ownerId: 'guest_demo',
    campaignId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  characters.push(created)
  setData(KEYS.CHARACTERS, characters)
  return ok(created)
}

/** POST api/campaigns — create a campaign (Offworlders brings its ship). */
function createCampaign({ data }) {
  const campaigns = getData(KEYS.CAMPAIGNS, [])
  const created = {
    id: generateId(),
    ownerId: 'guest_demo',
    name: data.name || 'New Campaign',
    description: data.description || '',
    worldLore: data.worldLore || null,
    privateDescription: data.privateDescription || null,
    imageUrl: '/default-campaign.svg',
    primarySystem: data.primarySystem || null,
    participants: [{ id: 'guest_demo', nickname: 'You (DM)', role: 'GM' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  campaigns.push(created)
  setData(KEYS.CAMPAIGNS, campaigns)

  // An Offworlders campaign always owns a ship.
  if (created.primarySystem === 'OFFWORLDERS') ensureDefaultShip(created.id)

  return ok(created)
}

/** POST api/messages — post a message as the demo user. */
function createMessage({ data }) {
  const messages = getData(KEYS.MESSAGES, [])
  const guestUser = getData(KEYS.USER, null)
  const created = {
    id: generateId(),
    campaignId: data.campaignId,
    userId: guestUser?.id || 'guest_demo',
    messageBody: data.messageBody || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  messages.push(created)
  setData(KEYS.MESSAGES, messages)
  return ok(created)
}

// --- PUT --------------------------------------------------------------------

/** PUT api/campaigns/{id}/ship/crew/me — save my own crew entry. */
function saveMyCrewEntry({ url, data }) {
  const match = url.match(/campaigns\/([^/]+)\/ship\/crew\/me/)
  const campaignId = match?.[1] || null
  if (!campaignId || !isGuestParticipant(campaignId)) {
    return forbidden('You are not a participant in this campaign.')
  }

  saveShipCrewRow(campaignId, currentGuestUserId(), {
    notes: data.notes ?? '',
    characters: Array.isArray(data.characters) ? data.characters : [],
  })
  return ok(myCrewDTO(campaignId))
}

/** PUT api/campaigns/{id}/ship — upsert a ship (optimistic concurrency). */
function saveShip({ url, data }) {
  const match = url.match(/campaigns\/([^/]+)\/ship/)
  const campaignId = match?.[1] || null
  const ships = getData(KEYS.SHIPS, [])
  const index = ships.findIndex((ship) => String(ship.campaignId) === String(campaignId))

  if (index === -1) {
    const created = {
      ...data,
      id: generateId(),
      campaignId: String(campaignId),
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    ships.push(created)
    setData(KEYS.SHIPS, ships)
    return ok(created)
  }

  const current = ships[index]
  const isStale =
    data.version !== undefined &&
    data.version !== null &&
    Number(data.version) !== Number(current.version)
  if (isStale) {
    return Promise.reject(
      guestError('The ship was updated by someone else. Reload and try again.', 409),
    )
  }

  ships[index] = {
    ...current,
    ...data,
    version: Number(current.version) + 1,
    updatedAt: new Date().toISOString(),
  }
  setData(KEYS.SHIPS, ships)
  return ok(ships[index])
}

/** PUT api/campaigns/{id} — merge the campaign fields. */
function mergeCampaign({ url, data }) {
  const id = extractId(url)
  if (!id) return ok(null)

  const campaigns = getData(KEYS.CAMPAIGNS, [])
  const index = campaigns.findIndex((campaign) => String(campaign.id) === String(id))
  if (index === -1) return ok(null)

  campaigns[index] = { ...campaigns[index], ...data, updatedAt: new Date().toISOString() }
  setData(KEYS.CAMPAIGNS, campaigns)

  // Switching a campaign to Offworlders creates its ship the first time.
  if (campaigns[index].primarySystem === 'OFFWORLDERS') ensureDefaultShip(campaigns[index].id)

  return ok(campaigns[index])
}

// --- PATCH ------------------------------------------------------------------

/**
 * PATCH api/users/{id} — the guest's own display name. The live backend treats
 * this as self-service and display-name only.
 */
function updateOwnProfile({ url, data }) {
  const userId = extractId(url)
  const current = getData(KEYS.USER, null)
  if (!current) return badRequest('No profile to update.')
  if (String(userId) !== String(current.id)) {
    return forbidden('You may only update your own profile.')
  }
  if (data?.userName !== undefined || data?.email !== undefined) {
    return badRequest('Only the display name can be changed here.')
  }

  const updated = { ...current }
  if (data?.displayName !== undefined) updated.displayName = data.displayName
  setData(KEYS.USER, updated)
  return ok(updated)
}

/** PATCH api/characters/{id} and api/characters/{id}/campaign. */
function patchCharacter({ url, data }) {
  const id = extractId(url)
  if (!id) return ok(null)

  const characters = getData(KEYS.CHARACTERS, [])
  const index = characters.findIndex((character) => String(character.id) === String(id))
  if (index === -1) return ok(null)

  if (url.includes('/campaign')) {
    const campaignId = data && typeof data === 'object' ? data.campaignId : data
    characters[index].campaignId = campaignId || null
  } else if (typeof data === 'object' && data !== null) {
    characters[index] = { ...characters[index], ...data }
  }

  characters[index].updatedAt = new Date().toISOString()
  setData(KEYS.CHARACTERS, characters)
  return ok(characters[index])
}

/** PATCH api/campaigns/{id}/participants/{pid}/nickname | /role. */
function updateParticipant({ url, data }) {
  const parts = url.split('/')
  const campaignId = parts[parts.indexOf('campaigns') + 1]
  let participantId = parts[parts.indexOf('participants') + 1]
  if (participantId === 'null') participantId = 'guest_demo'

  // GM edits other people's nicknames; the owner changes roles; any participant
  // may edit their own nickname.
  const permissions = guestCampaignPermissions(campaignId)
  if (url.includes('/nickname')) {
    const isSelfNickname = String(participantId) === String(currentGuestUserId())
    if (!isSelfNickname && !permissions.canEditOthersNicknames) {
      return forbidden('You do not have permission to change this nickname.')
    }
  } else if (!permissions.canChangeParticipantRoles) {
    return forbidden('You do not have permission to change participant roles.')
  }

  const campaigns = getData(KEYS.CAMPAIGNS, [])
  const campaignIndex = campaigns.findIndex((c) => String(c.id) === String(campaignId))
  const participants = campaignIndex === -1 ? null : campaigns[campaignIndex].participants
  const participantIndex = participants
    ? participants.findIndex((p) => String(p.id) === String(participantId))
    : -1
  if (participantIndex === -1) return ok(null)

  const participant = participants[participantIndex]
  if (url.includes('/nickname')) {
    participant.nickname = typeof data === 'string' ? data : data.nickname
  } else {
    participant.role = typeof data === 'string' ? data : data.role
  }
  setData(KEYS.CAMPAIGNS, campaigns)
  return ok(campaigns[campaignIndex])
}

/** PATCH api/campaigns/{id}/participants — add and remove participants. */
function updateParticipants({ url, data }) {
  const match = url.match(/campaigns\/([^/]+)/)
  const campaignId = match?.[1] || null
  if (!guestCampaignPermissions(campaignId).canManageParticipants) {
    return forbidden('You do not have permission to manage participants.')
  }

  const campaigns = getData(KEYS.CAMPAIGNS, [])
  const index = campaigns.findIndex((campaign) => String(campaign.id) === String(campaignId))
  if (index === -1) return ok(null)

  let participants = campaigns[index].participants || []
  if (data.participantIdsToRemove?.length > 0) {
    participants = withoutParticipants(participants, data.participantIdsToRemove)
  }
  if (data.participantsToAdd?.length > 0) {
    participants = withParticipants(participants, data.participantsToAdd)
  }

  campaigns[index].participants = participants
  setData(KEYS.CAMPAIGNS, campaigns)
  return ok(campaigns[index])
}

/** A participant payload entry as an id string — a bare id or an `{ id }` object. */
function asParticipantId(entry) {
  return entry && typeof entry === 'object' ? String(entry.id) : String(entry)
}

/**
 * Drop the listed participants. An entry without an id is dropped as well, which
 * is what the inline filter did before this was extracted.
 */
function withoutParticipants(participants, entries) {
  const idsToRemove = new Set(entries.map(asParticipantId))
  return participants.filter((p) => p?.id && !idsToRemove.has(String(p.id)))
}

/**
 * Append the new participants, skipping an id that is already listed. The list is
 * extended in place, exactly like the branch this was extracted from.
 */
function withParticipants(participants, entries) {
  const directory = getData(KEYS.USERS, [])

  for (const entry of entries) {
    const id = asParticipantId(entry)
    if (!id || participants.some((p) => String(p.id) === id)) continue

    participants.push({
      id,
      nickname: participantNickname(
        directory.find((u) => String(u.id) === id),
        entry,
      ),
      role: 'PLAYER',
    })
  }

  return participants
}

/** The nickname a new participant gets: demo directory → payload → 'Player'. */
function participantNickname(user, entry) {
  const fromPayload =
    entry && typeof entry === 'object' ? entry.displayName || entry.username : null
  return user?.displayName || user?.username || fromPayload || 'Player'
}

/** PATCH api/campaigns/{id}/owner — transfer ownership. */
function transferOwnership({ url, data }) {
  const id = extractId(url)
  if (!guestCampaignPermissions(id).canTransferOwnership) {
    return forbidden('You do not have permission to transfer ownership.')
  }

  const campaigns = getData(KEYS.CAMPAIGNS, [])
  const index = campaigns.findIndex((campaign) => String(campaign.id) === String(id))
  if (index === -1 || !data.newOwnerId) return ok(null)

  campaigns[index].ownerId = data.newOwnerId
  setData(KEYS.CAMPAIGNS, campaigns)
  return ok(campaigns[index])
}

/** PATCH api/campaigns/{id} — the campaign details, GM only. */
function updateCampaignDetails({ url, data }) {
  const id = extractId(url)
  if (!id) return ok(null)

  if (!guestCampaignPermissions(id).canEditCampaignDetails) {
    return forbidden('You do not have permission to edit this campaign.')
  }

  const campaigns = getData(KEYS.CAMPAIGNS, [])
  const index = campaigns.findIndex((campaign) => String(campaign.id) === String(id))
  if (index === -1) return ok(null)

  campaigns[index] = { ...campaigns[index], ...data, updatedAt: new Date().toISOString() }
  setData(KEYS.CAMPAIGNS, campaigns)
  return ok(campaigns[index])
}

// --- DELETE -----------------------------------------------------------------

/** DELETE api/characters/{id}/spells/{key} — remove a spell from a character. */
function removeSpell({ url }) {
  const parts = url.split('/')
  const spellsIndex = parts.indexOf('spells')
  const characterId = parts[spellsIndex - 1]
  const spellKey = parts[spellsIndex + 1]?.split('?')[0]
  if (!characterId || !spellKey) return ok({ success: false })

  const characters = getData(KEYS.CHARACTERS, [])
  const index = characters.findIndex((c) => String(c.id) === String(characterId))
  if (index === -1 || !characters[index].spells) return ok({ success: false })

  characters[index].spells = characters[index].spells.filter(
    (spell) => String(spell.key) !== String(spellKey) && String(spell.slug) !== String(spellKey),
  )
  setData(KEYS.CHARACTERS, characters)
  return ok({ success: true })
}

/** DELETE api/characters/{id}/campaign — detach a character (never delete it). */
function detachCharacter({ url }) {
  const id = extractId(url)
  const characters = getData(KEYS.CHARACTERS, [])
  const index = characters.findIndex((character) => String(character.id) === String(id))
  if (index === -1) return ok({ success: true })

  // Mirrors the backend: the character's owner, the campaign GM, or the campaign
  // owner may detach (this never deletes the character).
  const character = characters[index]
  const isCharacterOwner = String(character.ownerId) === String(currentGuestUserId())
  const permissions = character.campaignId ? guestCampaignPermissions(character.campaignId) : null
  const mayManageCampaign = !!permissions && (permissions.isGm || permissions.isOwner)
  if (!isCharacterOwner && !mayManageCampaign) {
    return forbidden('You may not remove this character from its campaign.')
  }

  characters[index].campaignId = null
  setData(KEYS.CHARACTERS, characters)
  return ok({ success: true })
}

/** DELETE api/characters/{id} — delete a character outright. */
function deleteCharacter({ url }) {
  const id = extractId(url)
  if (!id) return ok({ deleted: false })

  const characters = getData(KEYS.CHARACTERS, [])
  setData(
    KEYS.CHARACTERS,
    characters.filter((character) => String(character.id) !== String(id)),
  )
  return ok({ deleted: true })
}

/** DELETE api/campaigns/{id}/ship/crew/me/images?url=… — drop a crew image. */
function removeCrewImage({ url }) {
  const match = url.match(/campaigns\/([^/]+)\/ship\/crew\/me\/images/)
  const campaignId = match?.[1] || null
  if (!campaignId || !isGuestParticipant(campaignId)) {
    return forbidden('You are not a participant in this campaign.')
  }

  const imageUrl = new URLSearchParams(url.split('?')[1] || '').get('url')
  const userId = currentGuestUserId()
  const existing = shipCrewRows(campaignId).find((row) => String(row.userId) === String(userId))
  saveShipCrewRow(campaignId, userId, {
    imageUrls: (existing?.imageUrls || []).filter((entry) => entry !== imageUrl),
  })
  return ok(myCrewDTO(campaignId))
}

/** DELETE api/campaigns/{id}/ship/images?url=… — drop a gallery image. */
function removeGalleryImage({ url }) {
  const match = url.match(/campaigns\/([^/]+)\/ship\/images/)
  const imageUrl = new URLSearchParams(url.split('?')[1] || '').get('url')
  return ok(removeShipGalleryImage(match?.[1] || null, imageUrl))
}

/** DELETE api/campaigns/{id} — the campaign, its ship and its character links. */
function deleteCampaign({ url }) {
  const id = extractId(url)
  if (!id) return ok({ deleted: false })
  if (!guestCampaignPermissions(id).canDeleteCampaign) {
    return forbidden('You do not have permission to delete this campaign.')
  }

  const campaigns = getData(KEYS.CAMPAIGNS, [])
  setData(
    KEYS.CAMPAIGNS,
    campaigns.filter((campaign) => String(campaign.id) !== String(id)),
  )

  const characters = getData(KEYS.CHARACTERS, [])
  setData(
    KEYS.CHARACTERS,
    characters.map((character) =>
      String(character.campaignId) === String(id) ? { ...character, campaignId: null } : character,
    ),
  )

  // A campaign's ship is removed with the campaign.
  const ships = getData(KEYS.SHIPS, [])
  setData(
    KEYS.SHIPS,
    ships.filter((ship) => String(ship.campaignId) !== String(id)),
  )

  return ok({ deleted: true })
}

/** DELETE api/messages/{id} — only the sender may delete a message. */
function deleteMessage({ url }) {
  const id = extractId(url)
  if (!id) return ok({ deleted: false })

  const messages = getData(KEYS.MESSAGES, [])
  const index = messages.findIndex((message) => String(message.id) === String(id))
  if (index === -1) return ok({ deleted: false })

  const currentUserId = getData(KEYS.USER, null)?.id || 'guest_demo'
  if (String(messages[index].userId) !== String(currentUserId)) {
    return Promise.reject(guestError('You do not have permission to delete this message.', 403))
  }

  messages.splice(index, 1)
  setData(KEYS.MESSAGES, messages)
  return ok({ deleted: true })
}

// ============================================================================
// Journals — the private book of numbered pages each participant owns
// ============================================================================
// The rules mirror the backend exactly: only the owner may read or write a
// journal, a page that belongs to somebody else answers like an unknown id, and
// the page after the last stored one is a blank, *virtual* page — writing on it
// creates a page, and clearing a stored last page removes it again (together
// with any further blank pages at the end), so no empty rows accumulate.

/** The stored pages of a journal, in reading order (position, then id). */
function journalPagesFor(journalId) {
  return getData(KEYS.JOURNAL_PAGES, [])
    .filter((page) => String(page.journalId) === String(journalId))
    .sort((a, b) => a.position - b.position || String(a.id).localeCompare(String(b.id)))
}

/** The caller's journal row in a campaign, if they have written anything. */
function findJournal(campaignId, userId) {
  return (
    getData(KEYS.JOURNALS, []).find(
      (journal) =>
        String(journal.campaignId) === String(campaignId) && String(journal.userId) === String(userId),
    ) || null
  )
}

/** The journal row, created on first write (never on a read). */
function findOrCreateJournal(campaignId, userId) {
  const existing = findJournal(campaignId, userId)
  if (existing) return existing

  const journals = getData(KEYS.JOURNALS, [])
  const created = {
    id: generateId(),
    campaignId: String(campaignId),
    userId: String(userId),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  journals.push(created)
  setData(KEYS.JOURNALS, journals)
  return created
}

/** One page as the API describes it: the number is its 1-based position. */
function journalPageDTO(page) {
  return {
    id: page.id,
    pageNumber: page.position,
    content: page.content || '',
    version: Number(page.version) || 0,
    createdAt: page.createdAt || null,
    updatedAt: page.updatedAt || null,
  }
}

/** A journal as the API describes it: stored pages only, never the virtual one. */
function journalDTO(campaignId, userId) {
  const journal = findJournal(campaignId, userId)
  if (!journal) {
    return { id: null, campaignId: String(campaignId), userId: String(userId), pageCount: 0, pages: [] }
  }

  const pages = journalPagesFor(journal.id).map(journalPageDTO)
  return {
    id: journal.id,
    campaignId: journal.campaignId,
    userId: journal.userId,
    pageCount: pages.length,
    pages,
  }
}

/** Move every later page one step, like the backend's bulk UPDATE. */
function shiftJournalPositions(journalId, fromPosition, delta) {
  const shifted = getData(KEYS.JOURNAL_PAGES, []).map((page) => {
    if (String(page.journalId) !== String(journalId)) return page
    const affected = delta > 0 ? page.position >= fromPosition : page.position > fromPosition
    return affected ? { ...page, position: page.position + delta } : page
  })
  setData(KEYS.JOURNAL_PAGES, shifted)
}

/**
 * The request's page, resolved through the same rules the backend applies.
 *
 * `error` is a plain `Error`, not a rejection: the caller is what turns it into
 * one (`return Promise.reject(resolved.error)`), so nothing here is tested as if
 * it were a promise.
 */
function resolveJournalPage(url, userId) {
  const pageId = extractId(url)
  const page = getData(KEYS.JOURNAL_PAGES, []).find((entry) => String(entry.id) === String(pageId))
  if (!page) return { error: guestError('Journal page not found with id: ' + pageId, 404) }

  const journal = getData(KEYS.JOURNALS, []).find((entry) => String(entry.id) === String(page.journalId))
  if (!journal || String(journal.userId) !== String(userId)) {
    // Another participant's page is not addressable at all.
    return { error: guestError('Journal page not found with id: ' + pageId, 404) }
  }
  if (!isGuestParticipant(journal.campaignId)) {
    return { error: guestError('You are not a participant in this campaign.', 403) }
  }
  return { page, journal }
}

/** GET api/journals/campaign/{campaignId} — the caller's own journal. */
function handleJournal({ url }) {
  const match = url.match(/journals\/campaign\/([^/?]+)/)
  const campaignId = match?.[1] || null
  if (!campaignId) return badRequest('A journal needs a campaign.')

  const exists = getData(KEYS.CAMPAIGNS, []).some((c) => String(c.id) === String(campaignId))
  if (!exists) return notFound('Campaign not found with id: ' + campaignId)
  if (!isGuestParticipant(campaignId)) {
    return forbidden('You are not a participant in this campaign.')
  }

  return ok(journalDTO(campaignId, currentGuestUserId()))
}

/** POST api/journals/campaign/{campaignId}/pages — insert a page. */
function createJournalPage({ url, data }) {
  const match = url.match(/journals\/campaign\/([^/?]+)\/pages/)
  const campaignId = match?.[1] || null
  if (!campaignId) return badRequest('A journal page needs a campaign.')

  const exists = getData(KEYS.CAMPAIGNS, []).some((c) => String(c.id) === String(campaignId))
  if (!exists) return notFound('Campaign not found with id: ' + campaignId)
  if (!isGuestParticipant(campaignId)) {
    return forbidden('You are not a participant in this campaign.')
  }

  const content = typeof data?.content === 'string' ? data.content : ''
  const afterPageId = data?.afterPageId ?? null
  if (content.length > JOURNAL_MAX_PAGE_CHARS) {
    return badRequest('A journal page may be at most ' + JOURNAL_MAX_PAGE_CHARS + ' characters')
  }

  const userId = currentGuestUserId()

  // Appending a blank page is a no-op, and it must not create the journal row
  // either: the backend writes nothing at all on this path.
  if (afterPageId === null && content.trim() === '') return ok(journalDTO(campaignId, userId))

  const journal = findOrCreateJournal(campaignId, userId)

  const pages = journalPagesFor(journal.id)
  if (pages.length >= JOURNAL_MAX_PAGES) {
    return badRequest('A journal may have at most ' + JOURNAL_MAX_PAGES + ' pages')
  }

  let position = pages.length > 0 ? pages[pages.length - 1].position + 1 : 1
  if (afterPageId !== null) {
    const anchor = pages.find((page) => String(page.id) === String(afterPageId))
    if (!anchor) return notFound('Journal page not found with id: ' + afterPageId)
    // The pages after the anchor move along, exactly as the backend does it.
    position = anchor.position + 1
    shiftJournalPositions(journal.id, position, 1)
  }

  const created = {
    id: generateId(),
    journalId: journal.id,
    content,
    position,
    version: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  setData(KEYS.JOURNAL_PAGES, [...getData(KEYS.JOURNAL_PAGES, []), created])
  return ok(journalDTO(campaignId, userId))
}

/** PATCH api/journals/pages/{pageId} — rewrite one page. */
function updateJournalPage({ url, data }) {
  const resolved = resolveJournalPage(url, currentGuestUserId())
  if (resolved.error) return Promise.reject(resolved.error)
  const { page, journal } = resolved

  const content = typeof data?.content === 'string' ? data.content : ''
  if (content.length > JOURNAL_MAX_PAGE_CHARS) {
    return badRequest('A journal page may be at most ' + JOURNAL_MAX_PAGE_CHARS + ' characters')
  }
  // Required, like the backend: without the token the check below is skipped.
  if (data?.version === undefined || data?.version === null) {
    return badRequest('version is required')
  }
  if (Number(data.version) !== Number(page.version)) {
    return conflict('This journal page was updated by someone else. Reload and try again.')
  }

  const all = getData(KEYS.JOURNAL_PAGES, [])
  const mine = (entries) =>
    entries.filter((entry) => String(entry.journalId) === String(journal.id))
  const lastStored = mine(all)
    .sort((a, b) => a.position - b.position)
    .at(-1)

  if (content.trim() === '' && lastStored && String(lastStored.id) === String(page.id)) {
    // Clearing the last page removes it, and blank pages before it collapse with
    // it: a journal keeps exactly one trailing blank page, and it is virtual.
    let remaining = all.filter((entry) => String(entry.id) !== String(page.id))
    let tail = mine(remaining)
      .sort((a, b) => a.position - b.position)
      .at(-1)
    while (tail && String(tail.content || '').trim() === '') {
      remaining = remaining.filter((entry) => String(entry.id) !== String(tail.id))
      tail = mine(remaining)
        .sort((a, b) => a.position - b.position)
        .at(-1)
    }
    setData(KEYS.JOURNAL_PAGES, remaining)
    return ok({ page: null, pageCount: mine(remaining).length })
  }

  const updated = all.map((entry) =>
    String(entry.id) === String(page.id)
      ? { ...entry, content, version: Number(entry.version) + 1, updatedAt: new Date().toISOString() }
      : entry,
  )
  setData(KEYS.JOURNAL_PAGES, updated)

  return ok({
    page: journalPageDTO(updated.find((entry) => String(entry.id) === String(page.id))),
    pageCount: mine(updated).length,
  })
}

/** DELETE api/journals/pages/{pageId} — delete one page. */
function deleteJournalPage({ url }) {
  const resolved = resolveJournalPage(url, currentGuestUserId())
  if (resolved.error) return Promise.reject(resolved.error)
  const { page, journal } = resolved

  setData(
    KEYS.JOURNAL_PAGES,
    getData(KEYS.JOURNAL_PAGES, []).filter((entry) => String(entry.id) !== String(page.id)),
  )
  shiftJournalPositions(journal.id, page.position, -1)

  return ok(journalDTO(journal.campaignId, currentGuestUserId()))
}

// --- Planner (the campaign planner add-on) ----------------------------------

/** The id after `marker` in a planner URL — `plans`, `dates` or `campaign`. */
function plannerId(url, marker) {
  return url.match(new RegExp(`${marker}/([^/]+)`))?.[1] || null
}

/** GET api/planner/campaign/{id}/plans — a campaign's plans, open ones first. */
function handlePlannerPlans({ url }) {
  const campaignId = plannerId(url, 'campaign')
  if (!campaignId || !guestCampaign(campaignId)) {
    return notFound('Campaign not found with id: ' + campaignId)
  }
  if (!guestAddonEnabled(campaignId, PLANNER_KEY)) {
    return badRequest('The planner is not enabled for this campaign')
  }
  if (!isGuestParticipant(campaignId)) {
    return forbidden('User is not a participant in this campaign')
  }

  const ordered = guestPlans(campaignId).sort((a, b) => {
    if (a.status !== b.status) return a.status === 'OPEN' ? -1 : 1
    return String(b.createdAt).localeCompare(String(a.createdAt))
  })

  return ok(ordered.map(guestPlanDTO))
}

/** GET api/planner/plans/{id} — one plan, whole. */
function handlePlannerPlan({ url }) {
  const resolved = resolveGuestPlan(plannerId(url, 'plans'))
  return resolved.error ? resolved.error : ok(guestPlanDTO(resolved.plan))
}

/** POST api/planner/campaign/{id}/plans — start a plan (any participant may). */
function createPlannerPlan({ url, data }) {
  const campaignId = plannerId(url, 'campaign')
  if (!campaignId || !guestCampaign(campaignId)) {
    return notFound('Campaign not found with id: ' + campaignId)
  }
  if (!guestAddonEnabled(campaignId, PLANNER_KEY)) {
    return badRequest('The planner is not enabled for this campaign')
  }
  if (!isGuestParticipant(campaignId)) {
    return forbidden('User is not a participant in this campaign')
  }

  const title = String(data?.title || '').trim()
  if (!title) return badRequest('A plan needs a title')
  if (title.length > PLANNER_MAX_TITLE) {
    return badRequest('A plan title may be at most ' + PLANNER_MAX_TITLE + ' characters')
  }

  const now = new Date().toISOString()
  const plan = {
    id: generateId(),
    campaignId,
    title,
    description: data?.description || '',
    status: 'OPEN',
    decidedDateId: null,
    createdByUserId: currentGuestUserId(),
    version: 0,
    createdAt: now,
    updatedAt: now,
  }

  return ok(guestPlanDTO(savePlannerRow(KEYS.PLANS, plan)))
}

/** PATCH api/planner/plans/{id} — the title and description. */
function updatePlannerPlan({ url, data }) {
  const resolved = resolveGuestPlan(plannerId(url, 'plans'))
  if (resolved.error) return resolved.error

  const frozen = requireOpenPlan(resolved.plan)
  if (frozen) return frozen
  if (data?.version === undefined || data?.version === null) {
    return badRequest('A version is required to change a plan')
  }
  if (Number(data.version) !== Number(resolved.plan.version)) {
    return conflict('This plan was updated by someone else. Reload and try again.')
  }

  const title = String(data?.title || '').trim()
  if (!title) return badRequest('A plan needs a title')

  const updated = savePlannerRow(KEYS.PLANS, {
    ...resolved.plan,
    title,
    description: data?.description || '',
    version: Number(resolved.plan.version) + 1,
    updatedAt: new Date().toISOString(),
  })

  return ok(guestPlanDTO(updated))
}

/** PATCH api/planner/plans/{id}/status — decide on one date, or reopen. */
function updatePlannerStatus({ url, data }) {
  const resolved = resolveGuestPlan(plannerId(url, 'plans'))
  if (resolved.error) return resolved.error

  if (data?.version === undefined || data?.version === null) {
    return badRequest('A version is required to change a plan')
  }
  if (Number(data.version) !== Number(resolved.plan.version)) {
    return conflict('This plan was updated by someone else. Reload and try again.')
  }

  const status = String(data?.status || '').toUpperCase()
  if (status !== 'OPEN' && status !== 'DECIDED') {
    return badRequest('Unknown plan status: ' + data?.status)
  }

  let decidedDateId = null
  if (status === 'DECIDED') {
    const frozen = requireOpenPlan(resolved.plan)
    if (frozen) return frozen

    const chosen = guestPlanDates(resolved.plan.id).find(
      (date) => String(date.id) === String(data?.decidedDateId),
    )
    if (!data?.decidedDateId) return badRequest('A decided plan needs one of its own dates')
    if (!chosen) return badRequest('Date ' + data.decidedDateId + ' is not a date of this plan')
    decidedDateId = chosen.id
  }

  const updated = savePlannerRow(KEYS.PLANS, {
    ...resolved.plan,
    status,
    decidedDateId,
    version: Number(resolved.plan.version) + 1,
    updatedAt: new Date().toISOString(),
  })

  return ok(guestPlanDTO(updated))
}

/** DELETE api/planner/plans/{id} — the plan, its dates and their answers. */
function deletePlannerPlan({ url }) {
  const resolved = resolveGuestPlan(plannerId(url, 'plans'))
  if (resolved.error) return resolved.error

  const isCreator = String(resolved.plan.createdByUserId) === String(currentGuestUserId())
  if (!isCreator && !guestCampaignPermissions(resolved.plan.campaignId).isOwner) {
    return forbidden("Only the plan's creator or the campaign owner can delete a plan")
  }

  const dateIds = guestPlanDates(resolved.plan.id).map((date) => date.id)
  dateIds.forEach((dateId) => removePlannerRow(KEYS.PLAN_DATES, dateId))
  setData(
    KEYS.PLAN_ATTENDANCES,
    getData(KEYS.PLAN_ATTENDANCES, []).filter(
      (entry) => !dateIds.some((dateId) => String(dateId) === String(entry.planDateId)),
    ),
  )
  removePlannerRow(KEYS.PLANS, resolved.plan.id)

  return ok(null)
}

/** POST api/planner/plans/{id}/dates — offer a date. */
function addPlannerDate({ url, data }) {
  const resolved = resolveGuestPlan(plannerId(url, 'plans'))
  if (resolved.error) return resolved.error

  const frozen = requireOpenPlan(resolved.plan)
  if (frozen) return frozen
  if (!data?.date) return badRequest('A date is required')
  if (data?.endTime && !data?.startTime) return badRequest('An end time needs a start time')
  if (data?.endTime && data?.startTime && data.endTime <= data.startTime) {
    return badRequest('An end time has to be after the start time')
  }
  if (data?.note && data.note.length > PLANNER_MAX_NOTE) {
    return badRequest('A date note may be at most ' + PLANNER_MAX_NOTE + ' characters')
  }
  if (guestPlanDates(resolved.plan.id).some((date) => date.date === data.date)) {
    return conflict("Value '" + data.date + "' is already in use for date")
  }

  const now = new Date().toISOString()
  savePlannerRow(KEYS.PLAN_DATES, {
    id: generateId(),
    planId: resolved.plan.id,
    date: data.date,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    note: data.note || null,
    createdByUserId: currentGuestUserId(),
    version: 0,
    createdAt: now,
    updatedAt: now,
  })

  return ok(guestPlanDTO(resolved.plan))
}

/** PATCH api/planner/dates/{id} — correct a date. */
function updatePlannerDate({ url, data }) {
  const resolved = resolveGuestDate(plannerId(url, 'dates'))
  if (resolved.error) return resolved.error

  const frozen = requireOpenPlan(resolved.plan)
  if (frozen) return frozen
  if (data?.version === undefined || data?.version === null) {
    return badRequest('A version is required to change a date')
  }
  if (Number(data.version) !== Number(resolved.date.version)) {
    return conflict('This date was updated by someone else. Reload and try again.')
  }
  if (!data?.date) return badRequest('A date is required')
  if (data?.endTime && !data?.startTime) return badRequest('An end time needs a start time')

  const clash = guestPlanDates(resolved.plan.id).some(
    (date) => date.date === data.date && String(date.id) !== String(resolved.date.id),
  )
  if (clash) return conflict("Value '" + data.date + "' is already in use for date")

  savePlannerRow(KEYS.PLAN_DATES, {
    ...resolved.date,
    date: data.date,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    note: data.note || null,
    version: Number(resolved.date.version) + 1,
    updatedAt: new Date().toISOString(),
  })

  return ok(guestPlanDTO(resolved.plan))
}

/** DELETE api/planner/dates/{id} — the date, and the answers given for it. */
function deletePlannerDate({ url }) {
  const resolved = resolveGuestDate(plannerId(url, 'dates'))
  if (resolved.error) return resolved.error

  const frozen = requireOpenPlan(resolved.plan)
  if (frozen) return frozen

  setData(
    KEYS.PLAN_ATTENDANCES,
    getData(KEYS.PLAN_ATTENDANCES, []).filter(
      (entry) => String(entry.planDateId) !== String(resolved.date.id),
    ),
  )
  removePlannerRow(KEYS.PLAN_DATES, resolved.date.id)

  // A plan that had settled on this date keeps its decision but loses the date.
  if (String(resolved.plan.decidedDateId) === String(resolved.date.id)) {
    savePlannerRow(KEYS.PLANS, { ...resolved.plan, decidedDateId: null })
  }

  return ok(guestPlanDTO(resolved.plan))
}

/** PUT api/planner/dates/{id}/attendance — the caller's answer. */
function setPlannerAttendance({ url, data }) {
  const resolved = resolveGuestDate(plannerId(url, 'dates'))
  if (resolved.error) return resolved.error

  const frozen = requireOpenPlan(resolved.plan)
  if (frozen) return frozen

  const userId = currentGuestUserId()
  const exclusion = guestPlanExclusions(resolved.plan.id).find(
    (row) => String(row.userId) === String(userId),
  )
  if (exclusion) return forbidden('You are not in this plan. Rejoin it before answering.')

  const state = String(data?.state || '').toUpperCase()
  if (!['YES', 'NO', 'MAYBE'].includes(state)) {
    return badRequest('Unknown attendance state: ' + data?.state)
  }

  const rows = getData(KEYS.PLAN_ATTENDANCES, [])
  const existing = rows.find(
    (entry) =>
      String(entry.planDateId) === String(resolved.date.id) && String(entry.userId) === String(userId),
  )
  const now = new Date().toISOString()

  setData(
    KEYS.PLAN_ATTENDANCES,
    existing
      ? rows.map((entry) =>
          String(entry.id) === String(existing.id) ? { ...entry, state, updatedAt: now } : entry,
        )
      : [
          ...rows,
          { id: generateId(), planDateId: resolved.date.id, userId, state, createdAt: now, updatedAt: now },
        ],
  )

  return ok(guestPlanDTO(resolved.plan))
}

/** DELETE api/planner/dates/{id}/attendance — withdraw the caller's answer. */
function clearPlannerAttendance({ url }) {
  const resolved = resolveGuestDate(plannerId(url, 'dates'))
  if (resolved.error) return resolved.error

  const frozen = requireOpenPlan(resolved.plan)
  if (frozen) return frozen

  const userId = currentGuestUserId()
  setData(
    KEYS.PLAN_ATTENDANCES,
    getData(KEYS.PLAN_ATTENDANCES, []).filter(
      (entry) =>
        !(
          String(entry.planDateId) === String(resolved.date.id) &&
          String(entry.userId) === String(userId)
        ),
    ),
  )

  return ok(guestPlanDTO(resolved.plan))
}

/** PUT api/planner/plans/{id}/members/me — rejoin a plan the caller left. */
function rejoinPlannerPlan({ url }) {
  const resolved = resolveGuestPlan(plannerId(url, 'plans'))
  if (resolved.error) return resolved.error

  const frozen = requireOpenPlan(resolved.plan)
  if (frozen) return frozen

  const userId = currentGuestUserId()
  const exclusion = guestPlanExclusions(resolved.plan.id).find(
    (row) => String(row.userId) === String(userId),
  )
  if (exclusion?.removedByOwner) {
    return forbidden('The campaign owner removed you from this plan; only they can put you back')
  }
  if (exclusion) removePlannerRow(KEYS.PLAN_EXCLUSIONS, exclusion.id)

  return ok(guestPlanDTO(resolved.plan))
}

/** DELETE api/planner/plans/{id}/members/me — leave the plan. */
function leavePlannerPlan({ url }) {
  const resolved = resolveGuestPlan(plannerId(url, 'plans'))
  if (resolved.error) return resolved.error

  const frozen = requireOpenPlan(resolved.plan)
  if (frozen) return frozen

  const userId = currentGuestUserId()
  const already = guestPlanExclusions(resolved.plan.id).some(
    (row) => String(row.userId) === String(userId),
  )

  if (!already) {
    savePlannerRow(KEYS.PLAN_EXCLUSIONS, {
      id: generateId(),
      planId: resolved.plan.id,
      userId,
      removedByOwner: false,
      removedBy: 'guest',
      createdAt: new Date().toISOString(),
    })
  }

  return ok(guestPlanDTO(resolved.plan))
}

/** DELETE api/planner/plans/{id}/members/{userId} — the campaign owner's removal. */
function removePlannerMember({ url }) {
  const resolved = resolveGuestPlan(plannerId(url, 'plans'), { ownerOnly: true })
  if (resolved.error) return resolved.error

  const frozen = requireOpenPlan(resolved.plan)
  if (frozen) return frozen

  const memberId = plannerId(url, 'members')
  const participants = guestCampaign(resolved.plan.campaignId)?.participants || []
  if (!participants.some((participant) => String(participant.id) === String(memberId))) {
    return forbidden('User is not a participant in this campaign')
  }

  const selfRemoval = String(memberId) === String(currentGuestUserId())
  const existing = guestPlanExclusions(resolved.plan.id).find(
    (row) => String(row.userId) === String(memberId),
  )

  savePlannerRow(KEYS.PLAN_EXCLUSIONS, {
    id: existing?.id || generateId(),
    planId: resolved.plan.id,
    userId: memberId,
    removedByOwner: !selfRemoval,
    removedBy: 'guest',
    createdAt: existing?.createdAt || new Date().toISOString(),
  })

  return ok(guestPlanDTO(resolved.plan))
}

/** PUT api/planner/plans/{id}/members/{userId} — the owner putting a member back. */
function addPlannerMember({ url }) {
  const resolved = resolveGuestPlan(plannerId(url, 'plans'), { ownerOnly: true })
  if (resolved.error) return resolved.error

  const frozen = requireOpenPlan(resolved.plan)
  if (frozen) return frozen

  const memberId = plannerId(url, 'members')
  const participants = guestCampaign(resolved.plan.campaignId)?.participants || []
  if (!participants.some((participant) => String(participant.id) === String(memberId))) {
    return forbidden('User is not a participant in this campaign')
  }

  // Idempotent, like leaving and rejoining: not being out is not an error.
  const existing = guestPlanExclusions(resolved.plan.id).find(
    (row) => String(row.userId) === String(memberId),
  )
  if (existing) removePlannerRow(KEYS.PLAN_EXCLUSIONS, existing.id)

  return ok(guestPlanDTO(resolved.plan))
}

// ============================================================================
// Route table — method + URL pattern → handler
// ============================================================================
// Entries are tested in order and the first match wins, exactly like the
// if-chains this replaced, so the order is load-bearing:
//   • `campaigns/*/ship/crew/...` before `campaigns/*/ship*`
//   • DELETE `characters/*/spells/*`, then `characters/*/campaign`, then
//     `characters/*`
//   • POST `ship/image` before POST `ship/images` — the first pattern also
//     matches the second URL, which is why the gallery upload never runs
// Adding an endpoint means adding one entry here: no new branch anywhere else.
// `unless` keeps a route away from URLs it would otherwise swallow (the admin
// user list is not served at all — see the module header).
const ROUTES = [
  // --- GET ------------------------------------------------------------------
  // The profile test is a substring, exactly as before: it also matches
  // `api/messages…`, so the messages route below never runs for a GET. The
  // alternation is wrapped in a non-capturing group, which is cosmetic — it
  // changes neither what the pattern matches nor what it captures.
  { method: 'get', pattern: /(?:users\/me|api\/me|users.*\/me$)/, handler: handleProfile },
  { method: 'get', pattern: /users\/search/, handler: handleUserSearch },
  { method: 'get', pattern: /planner\/campaign\/[^/]+\/plans/, handler: handlePlannerPlans },
  { method: 'get', pattern: /planner\/plans\//, handler: handlePlannerPlan },
  { method: 'get', pattern: /journals\/campaign\//, handler: handleJournal },
  { method: 'get', pattern: /characters.*\/spells/, handler: handleCharacterSpells },
  { method: 'get', pattern: /characters.*campaignId=/, handler: handleCharactersByCampaign },
  { method: 'get', pattern: /characters.*without-campaign/, handler: handleDetachedCharacters },
  { method: 'get', pattern: /characters.*\/me/, handler: handleOwnCharacters },
  { method: 'get', pattern: /characters/, handler: handleCharacters },
  { method: 'get', pattern: /campaigns.*\/ship\/crew/, handler: handleShipCrew },
  { method: 'get', pattern: /campaigns.*\/ship/, handler: handleShip },
  { method: 'get', pattern: /campaigns/, handler: handleCampaigns },
  { method: 'get', pattern: /messages/, handler: handleMessages },

  // --- POST -----------------------------------------------------------------
  { method: 'post', pattern: /planner\/campaign\/[^/]+\/plans/, handler: createPlannerPlan },
  { method: 'post', pattern: /planner\/plans\/.*\/dates/, handler: addPlannerDate },
  { method: 'post', pattern: /journals\/campaign\/.*\/pages/, handler: createJournalPage },
  { method: 'post', pattern: /campaigns.*\/ship\/crew\/me\/images/, handler: addCrewImage },
  { method: 'post', pattern: /campaigns.*\/ship\/image/, handler: addShipImage },
  { method: 'post', pattern: /campaigns.*\/ship\/images/, handler: addShipGalleryImage },
  { method: 'post', pattern: /campaigns.*\/image/, handler: uploadCampaignImage },
  { method: 'post', pattern: /characters.*\/image/, handler: uploadCharacterImage },
  { method: 'post', pattern: /characters.*\/spells/, handler: saveSpell },
  { method: 'post', pattern: /characters/, handler: createCharacter },
  { method: 'post', pattern: /campaigns/, handler: createCampaign },
  { method: 'post', pattern: /messages/, handler: createMessage },

  // --- PUT ------------------------------------------------------------------
  { method: 'put', pattern: /planner\/dates\/.*\/attendance/, handler: setPlannerAttendance },
  { method: 'put', pattern: /planner\/plans\/.*\/members\/me/, handler: rejoinPlannerPlan },
  { method: 'put', pattern: /planner\/plans\/.*\/members\//, handler: addPlannerMember },
  { method: 'put', pattern: /campaigns.*\/ship\/crew\/me/, handler: saveMyCrewEntry },
  { method: 'put', pattern: /campaigns.*\/ship/, handler: saveShip },
  { method: 'put', pattern: /campaigns/, handler: mergeCampaign },

  // --- PATCH ----------------------------------------------------------------
  { method: 'patch', pattern: /planner\/plans\/.*\/status/, handler: updatePlannerStatus },
  { method: 'patch', pattern: /planner\/plans\//, handler: updatePlannerPlan },
  { method: 'patch', pattern: /planner\/dates\//, handler: updatePlannerDate },
  { method: 'patch', pattern: /journals\/pages\//, handler: updateJournalPage },
  { method: 'patch', pattern: /users/, unless: /admin\/users/, handler: updateOwnProfile },
  { method: 'patch', pattern: /characters/, handler: patchCharacter },
  {
    method: 'patch',
    pattern: /campaigns.*\/participants\/.*(nickname|role)/,
    handler: updateParticipant,
  },
  { method: 'patch', pattern: /campaigns.*\/participants/, handler: updateParticipants },
  { method: 'patch', pattern: /campaigns.*\/owner/, handler: transferOwnership },
  { method: 'patch', pattern: /campaigns/, handler: updateCampaignDetails },

  // --- DELETE ---------------------------------------------------------------
  { method: 'delete', pattern: /planner\/dates\/.*\/attendance/, handler: clearPlannerAttendance },
  { method: 'delete', pattern: /planner\/plans\/.*\/members\/me/, handler: leavePlannerPlan },
  { method: 'delete', pattern: /planner\/plans\/.*\/members\//, handler: removePlannerMember },
  { method: 'delete', pattern: /planner\/dates\//, handler: deletePlannerDate },
  { method: 'delete', pattern: /planner\/plans\//, handler: deletePlannerPlan },
  { method: 'delete', pattern: /journals\/pages\//, handler: deleteJournalPage },
  { method: 'delete', pattern: /characters.*\/spells\//, handler: removeSpell },
  { method: 'delete', pattern: /characters.*\/campaign/, handler: detachCharacter },
  { method: 'delete', pattern: /characters/, handler: deleteCharacter },
  { method: 'delete', pattern: /campaigns.*\/ship\/crew\/me\/images/, handler: removeCrewImage },
  { method: 'delete', pattern: /campaigns.*\/ship\/images/, handler: removeGalleryImage },
  { method: 'delete', pattern: /campaigns/, handler: deleteCampaign },
  { method: 'delete', pattern: /messages/, handler: deleteMessage },
]

// ============================================================================
// Dispatcher
// ============================================================================

/**
 * The body a method answers with when no route matches — and, since guest mode
 * has no HTTP layer, whenever the app is not in guest mode at all. A factory
 * per method, so no two responses ever share one object.
 */
const FALLBACKS = {
  get: () => ({ data: null }),
  post: () => ({ data: null }),
  put: () => ({ data: null }),
  patch: () => ({ data: null }),
  delete: () => ({ data: { deleted: false } }),
}

/**
 * Answer one request. A matching route either resolves with the response body
 * or rejects with an axios-shaped error (`forbidden` / `badRequest`).
 *
 * @param {string} method - one of the keys of `FALLBACKS`
 * @param {string} url
 * @param {object} [data] request body, for the methods that carry one
 * @returns {Promise<{data: *}>}
 */
function dispatch(method, url, data) {
  if (!isGuestMode()) return Promise.resolve(FALLBACKS[method]())
  console.debug(`[guest-axios] ${method.toUpperCase()} -> ${url}`)

  const route = ROUTES.find(
    (entry) => entry.method === method && entry.pattern.test(url) && !entry.unless?.test(url),
  )
  return route ? route.handler({ url, data }) : Promise.resolve(FALLBACKS[method]())
}

/**
 * The mock client `apiClient.js` swaps in while a guest session is active. The
 * public surface stays `get`/`post`/`put`/`patch`/`delete`, with the same
 * arguments the real axios instance takes.
 */
const guestAxios = {
  get(url) {
    return dispatch('get', url)
  },
  post(url, data = {}) {
    return dispatch('post', url, data)
  },
  put(url, data = {}) {
    return dispatch('put', url, data)
  },
  patch(url, data = {}) {
    return dispatch('patch', url, data)
  },
  delete(url) {
    return dispatch('delete', url)
  },
}

export default guestAxios
