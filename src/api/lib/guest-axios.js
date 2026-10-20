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

// Core local storage keys used by the adapter
const KEYS = {
  USER: 'guest_user',
  USERS: 'guest_users',
  CHARACTERS: 'guest_characters',
  CAMPAIGNS: 'guest_campaigns',
  MESSAGES: 'guest_messages',
  SHIPS: 'guest_ships',
  CREW: 'guest_ship_crew',
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
    const idsToRemove = new Set(
      data.participantIdsToRemove.map((entry) =>
        entry && typeof entry === 'object' ? String(entry.id) : String(entry),
      ),
    )
    participants = participants.filter((p) => p?.id && !idsToRemove.has(String(p.id)))
  }

  if (data.participantsToAdd?.length > 0) {
    const directory = getData(KEYS.USERS, [])
    for (const entry of data.participantsToAdd) {
      const participantId = entry && typeof entry === 'object' ? String(entry.id) : String(entry)
      if (!participantId || participants.some((p) => String(p.id) === participantId)) continue

      const user = directory.find((u) => String(u.id) === participantId)
      participants.push({
        id: participantId,
        nickname:
          user?.displayName ||
          user?.username ||
          (entry && typeof entry === 'object' ? entry.displayName || entry.username : null) ||
          'Player',
        role: 'PLAYER',
      })
    }
  }

  campaigns[index].participants = participants
  setData(KEYS.CAMPAIGNS, campaigns)
  return ok(campaigns[index])
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
  // `api/messages…`, so the messages route below never runs for a GET.
  { method: 'get', pattern: /users\/me|api\/me|users.*\/me$/, handler: handleProfile },
  { method: 'get', pattern: /users\/search/, handler: handleUserSearch },
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
  { method: 'put', pattern: /campaigns.*\/ship\/crew\/me/, handler: saveMyCrewEntry },
  { method: 'put', pattern: /campaigns.*\/ship/, handler: saveShip },
  { method: 'put', pattern: /campaigns/, handler: mergeCampaign },

  // --- PATCH ----------------------------------------------------------------
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
