/**
 * Guest Mode LocalStorage Adapter
 *
 * This module provides an axios-like interface that reads/writes to localStorage.
 * It features automatic key-fallback mapping to handle both snake_case and camelCase
 * seed structures transparently.
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
  WHITELIST: 'guest_whitelist',
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
    if (part.startsWith('guest_') || !isNaN(parseInt(part, 10))) {
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

/** Reject a guest request with the same 403 shape axios surfaces in full mode. */
function forbidden(message) {
  return Promise.reject({
    response: {
      data: { message },
      status: 403,
      handled: false,
    },
  })
}

/** Reject a guest request with the same 400 shape the backend's validation uses. */
function badRequest(message) {
  return Promise.reject({
    response: {
      data: { message },
      status: 400,
      handled: false,
    },
  })
}

// ============================================================================
// Admin surface (guest demo)
// ============================================================================

/**
 * The Admin settings section exists in guest mode too, so the demo does not have
 * a hole where the real app has a tab. These mocks mirror the backend rules:
 * administrators only, a caller cannot change their own role, and the last
 * administrator cannot be demoted.
 */
function guestIsAdmin() {
  return String(getData(KEYS.USER, null)?.role || '').toUpperCase() === 'ADMIN'
}

function getGuestWhitelist() {
  return getData(KEYS.WHITELIST, [])
}

function saveGuestWhitelist(entries) {
  setData(KEYS.WHITELIST, entries)
}

function findGuestWhitelistEntry(id) {
  return getGuestWhitelist().find((entry) => String(entry.id) === String(id)) || null
}

/** Every demo account, led by the guest user (the real endpoint lists the caller too). */
function guestAccounts() {
  const current = getData(KEYS.USER, null)
  const others = getData(KEYS.USERS, []).map((user) => ({ role: 'USER', ...user }))
  return current ? [{ role: 'USER', ...current }, ...others] : others
}

function guestAdminCount(accounts = guestAccounts()) {
  return accounts.filter((user) => String(user.role).toUpperCase() === 'ADMIN').length
}

/** Writes a role change back to whichever store owns that account. */
function setGuestUserRole(userId, role) {
  const current = getData(KEYS.USER, null)
  if (current && String(current.id) === String(userId)) {
    const updated = { ...current, role }
    setData(KEYS.USER, updated)
    return updated
  }

  const others = getData(KEYS.USERS, [])
  const index = others.findIndex((user) => String(user.id) === String(userId))
  if (index === -1) return null
  others[index] = { ...others[index], role }
  setData(KEYS.USERS, others)
  return others[index]
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
// Guest Axios Mock Interface
// ============================================================================

const guestAxios = {
  get(url) {
    if (!isGuestMode()) return Promise.resolve({ data: null })
    console.debug(`[guest-axios] GET -> ${url}`)

    // Admin surface — the account list and the whitelist (administrators only)
    if (url.includes('admin/users')) {
      if (!guestIsAdmin()) return forbidden('Administrators only.')
      return Promise.resolve({ data: guestAccounts() })
    }

    if (url.includes('admin/whitelist')) {
      if (!guestIsAdmin()) return forbidden('Administrators only.')
      return Promise.resolve({ data: getGuestWhitelist() })
    }

    // User Profile Hooks
    if (
      url.includes('users/me') ||
      url.includes('api/me') ||
      (url.includes('users') && url.endsWith('/me'))
    ) {
      return Promise.resolve({ data: getData(KEYS.USER, null) })
    }

    // User Search Interface (Handles query matching via URLSearchParams safely)
    if (url.includes('users/search')) {
      const queryString = url.split('?')[1] || ''
      const params = new URLSearchParams(queryString)
      const query = (params.get('query') || '').toLowerCase()

      const dummyUsers = getData('guest_users', [])
      const filtered = dummyUsers.filter(
        (u) =>
          (u.displayName && u.displayName.toLowerCase().includes(query)) ||
          (u.username && u.username.toLowerCase().includes(query)) ||
          (u.email && u.email.toLowerCase().includes(query)),
      )
      return Promise.resolve({ data: filtered })
    }

    // Characters Routing Logic
    if (url.includes('characters')) {
      const characters = getData(KEYS.CHARACTERS, [])

      // GET /api/characters/{id}/spells — return character's spells
      if (url.includes('/spells')) {
        const match = url.match(/characters\/([^/]+)\/spells/)
        const characterId = match ? match[1] : null
        if (characterId) {
          const character = characters.find((c) => String(c.id) === String(characterId))
          return Promise.resolve({ data: character?.spells || [] })
        }
        return Promise.resolve({ data: [] })
      }

      if (url.includes('campaignId=')) {
        const match = url.match(/campaignId=([^&]+)/)
        const campaignId = match ? match[1] : null
        const filtered = characters.filter((c) => String(c.campaignId) === String(campaignId))
        return Promise.resolve({ data: withVisibleBackstories(filtered) })
      }

      if (url.includes('without-campaign')) {
        return Promise.resolve({
          data: withVisibleBackstories(characters.filter((c) => !c.campaignId)),
        })
      }

      const id = extractId(url)
      if (id && id !== 'characters' && id !== 'me') {
        const character = characters.find((c) => String(c.id) === String(id))
        return Promise.resolve({ data: withVisibleBackstory(character || null) })
      }

      // Default profile filter or fallback all array rows
      if (url.includes('/me')) {
        return Promise.resolve({
          data: withVisibleBackstories(characters.filter((c) => c.ownerId === 'guest_demo')),
        })
      }
      return Promise.resolve({ data: withVisibleBackstories(characters) })
    }

    // Ship crew manifest (must precede the ship block)
    if (url.includes('campaigns') && url.includes('/ship/crew')) {
      const match = url.match(/campaigns\/([^/]+)\/ship\/crew/)
      const campaignId = match ? match[1] : null
      if (!campaignId || !isGuestParticipant(campaignId)) {
        return forbidden('You are not a participant in this campaign.')
      }
      return Promise.resolve({ data: crewDTOs(campaignId) })
    }

    // Campaign Ship Routing Logic (must precede the campaigns block)
    if (url.includes('campaigns') && url.includes('/ship')) {
      const match = url.match(/campaigns\/([^/]+)\/ship/)
      const campaignId = match ? match[1] : null
      const ship = campaignId ? findShip(campaignId) : null
      if (!ship) {
        return Promise.reject({
          response: {
            data: { message: 'Ship not found for campaign: ' + campaignId },
            status: 404,
            handled: false,
          },
        })
      }
      return Promise.resolve({ data: ship })
    }

    // Campaigns Routing Logic
    if (url.includes('campaigns')) {
      const id = extractId(url)
      const campaigns = getData(KEYS.CAMPAIGNS, [])

      if (id && id !== 'campaigns' && id !== 'me') {
        const campaign = campaigns.find((c) => String(c.id) === String(id))
        return Promise.resolve({ data: campaign || null })
      }
      return Promise.resolve({ data: campaigns })
    }

    // Messages Routing Logic
    if (url.includes('messages')) {
      const messages = getData(KEYS.MESSAGES, [])

      // GET /api/messages/campaign/{campaignId}
      if (url.includes('/campaign/')) {
        const parts = url.split('/')
        const campaignIdx = parts.indexOf('campaign')
        const campaignId = campaignIdx !== -1 ? parts[campaignIdx + 1]?.split('?')[0] : null
        if (campaignId) {
          const filtered = messages.filter((m) => String(m.campaignId) === String(campaignId))
          return Promise.resolve({ data: filtered })
        }
      }

      // GET /api/messages/{id}
      const id = extractId(url)
      if (id && id !== 'messages') {
        const message = messages.find((m) => String(m.id) === String(id))
        return Promise.resolve({ data: message || null })
      }

      return Promise.resolve({ data: messages })
    }

    return Promise.resolve({ data: null })
  },

  post(url, data = {}) {
    if (!isGuestMode()) return Promise.resolve({ data: null })
    console.debug(`[guest-axios] POST -> ${url}`)

    // Admin surface — admit an address, or re-activate a revoked one
    if (url.includes('admin/whitelist')) {
      if (!guestIsAdmin()) return forbidden('Administrators only.')

      const email = String(data?.email || '')
        .trim()
        .toLowerCase()
      if (!email || !email.includes('@')) return badRequest('A valid email address is required.')

      const role = data?.role === 'ADMIN' ? 'ADMIN' : 'USER'
      const entries = getGuestWhitelist()
      const existing = entries.find((entry) => entry.email === email)

      if (existing) {
        existing.role = role
        existing.active = true
        saveGuestWhitelist(entries)
        return Promise.resolve({ data: existing })
      }

      const created = { id: generateId(), email, role, active: true }
      entries.push(created)
      saveGuestWhitelist(entries)
      return Promise.resolve({ data: created })
    }

    // Ship crew image upload (must precede the ship image branches)
    if (url.includes('campaigns') && url.includes('/ship/crew/me/images')) {
      const match = url.match(/campaigns\/([^/]+)\/ship\/crew\/me\/images/)
      const campaignId = match ? match[1] : null
      if (!campaignId || !isGuestParticipant(campaignId)) {
        return forbidden('You are not a participant in this campaign.')
      }
      const userId = currentGuestUserId()
      const existing = shipCrewRows(campaignId).find((row) => String(row.userId) === String(userId))
      saveShipCrewRow(campaignId, userId, {
        imageUrls: [...(existing?.imageUrls || []), SHIP_IMAGE_FALLBACK],
      })
      return Promise.resolve({ data: myCrewDTO(campaignId) })
    }

    // Ship images (must precede the campaign image branch)
    if (url.includes('campaigns') && url.includes('/ship/image')) {
      const match = url.match(/campaigns\/([^/]+)\/ship\/image/)
      return Promise.resolve({ data: applyShipImageUpload(match ? match[1] : null, false) })
    }
    if (url.includes('campaigns') && url.includes('/ship/images')) {
      const match = url.match(/campaigns\/([^/]+)\/ship\/images/)
      return Promise.resolve({ data: applyShipImageUpload(match ? match[1] : null, true) })
    }

    if (url.includes('campaigns') && url.includes('/image')) {
      const campaignId = extractId(url)
      if (!guestCampaignPermissions(campaignId).canUploadCampaignImage) {
        return forbidden('You do not have permission to change the campaign image.')
      }
      return Promise.resolve({
        data: { imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe' },
      })
    }

    if (url.includes('characters') && url.includes('/image')) {
      return Promise.resolve({ data: { avatarUrl: '/defaultCharacter.svg' } })
    }

    if (url.includes('characters') && url.includes('/spells')) {
      // POST /api/characters/{id}/spells — save a spell to a character
      const match = url.match(/characters\/([^/]+)\/spells/)
      const characterId = match ? match[1] : null
      if (characterId) {
        const characters = getData(KEYS.CHARACTERS, [])
        const idx = characters.findIndex((c) => String(c.id) === String(characterId))

        if (idx !== -1) {
          if (!characters[idx].spells) {
            characters[idx].spells = []
          }

          const sourceData = data.spellDetails || data
          const spellKey = sourceData.key || data.slug
          const exists = characters[idx].spells.some(
            (s) => s.key === spellKey || s.slug === spellKey,
          )

          if (!exists) {
            // Store the full normalized spell object (sourceData is already normalized
            // by spellStore.saveSpellToCharacter before being passed as spellDetails)
            const spellToStore = { ...sourceData }
            // Ensure key and isHomebrew are set from the payload root as well
            if (!spellToStore.key) spellToStore.key = data.slug || `spell_${Date.now()}`
            if (spellToStore.isHomebrew === undefined)
              spellToStore.isHomebrew = data.isHomebrew || false
            characters[idx].spells.push(spellToStore)
            setData(KEYS.CHARACTERS, characters)
            return Promise.resolve({ data: spellToStore })
          }

          const existing = characters[idx].spells.find(
            (s) => s.key === spellKey || s.slug === spellKey,
          )
          return Promise.resolve({ data: existing })
        }
      }
      return Promise.resolve({ data: null })
    }

    if (url.includes('characters')) {
      const characters = getData(KEYS.CHARACTERS, [])
      const newCharacter = {
        ...data,
        id: generateId(),
        ownerId: 'guest_demo',
        campaignId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      characters.push(newCharacter)
      setData(KEYS.CHARACTERS, characters)
      return Promise.resolve({ data: newCharacter })
    }

    if (url.includes('campaigns')) {
      const campaigns = getData(KEYS.CAMPAIGNS, [])
      const newCampaign = {
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
      campaigns.push(newCampaign)
      setData(KEYS.CAMPAIGNS, campaigns)

      // An Offworlders campaign always owns a ship.
      if (newCampaign.primarySystem === 'OFFWORLDERS') {
        ensureDefaultShip(newCampaign.id)
      }

      return Promise.resolve({ data: newCampaign })
    }

    // Create Message
    if (url.includes('messages')) {
      const messages = getData(KEYS.MESSAGES, [])
      const guestUser = getData(KEYS.USER, null)
      const newMessage = {
        id: generateId(),
        campaignId: data.campaignId,
        userId: guestUser?.id || 'guest_demo',
        messageBody: data.messageBody || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      messages.push(newMessage)
      setData(KEYS.MESSAGES, messages)
      return Promise.resolve({ data: newMessage })
    }

    return Promise.resolve({ data: null })
  },

  put(url, data = {}) {
    if (!isGuestMode()) return Promise.resolve({ data: null })
    console.debug(`[guest-axios] PUT -> ${url}`)

    // Ship crew: save my own entry (must precede the ship upsert)
    if (url.includes('campaigns') && url.includes('/ship/crew/me')) {
      const match = url.match(/campaigns\/([^/]+)\/ship\/crew\/me/)
      const campaignId = match ? match[1] : null
      if (!campaignId || !isGuestParticipant(campaignId)) {
        return forbidden('You are not a participant in this campaign.')
      }
      saveShipCrewRow(campaignId, currentGuestUserId(), {
        notes: data.notes ?? '',
        characters: Array.isArray(data.characters) ? data.characters : [],
      })
      return Promise.resolve({ data: myCrewDTO(campaignId) })
    }

    // Campaign Ship (upsert with optimistic concurrency)
    if (url.includes('campaigns') && url.includes('/ship')) {
      const match = url.match(/campaigns\/([^/]+)\/ship/)
      const campaignId = match ? match[1] : null
      const ships = getData(KEYS.SHIPS, [])
      const index = ships.findIndex((s) => String(s.campaignId) === String(campaignId))

      if (index === -1) {
        const ship = {
          ...data,
          id: generateId(),
          campaignId: String(campaignId),
          version: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        ships.push(ship)
        setData(KEYS.SHIPS, ships)
        return Promise.resolve({ data: ship })
      }

      const current = ships[index]
      if (
        data.version !== undefined &&
        data.version !== null &&
        Number(data.version) !== Number(current.version)
      ) {
        return Promise.reject({
          response: {
            data: { message: 'The ship was updated by someone else. Reload and try again.' },
            status: 409,
            handled: false,
          },
        })
      }

      ships[index] = {
        ...current,
        ...data,
        version: Number(current.version) + 1,
        updatedAt: new Date().toISOString(),
      }
      setData(KEYS.SHIPS, ships)
      return Promise.resolve({ data: ships[index] })
    }

    if (url.includes('campaigns')) {
      const id = extractId(url)
      if (id) {
        const campaigns = getData(KEYS.CAMPAIGNS, [])
        const index = campaigns.findIndex((c) => String(c.id) === String(id))
        if (index !== -1) {
          campaigns[index] = { ...campaigns[index], ...data, updatedAt: new Date().toISOString() }
          setData(KEYS.CAMPAIGNS, campaigns)

          // Switching a campaign to Offworlders creates its ship the first time.
          if (campaigns[index].primarySystem === 'OFFWORLDERS') {
            ensureDefaultShip(campaigns[index].id)
          }

          return Promise.resolve({ data: campaigns[index] })
        }
      }
    }
    return Promise.resolve({ data: null })
  },

  patch(url, data = {}) {
    if (!isGuestMode()) return Promise.resolve({ data: null })
    console.debug(`[guest-axios] PATCH -> ${url}`)

    // Admin surface — change an account's role
    if (url.includes('admin/users')) {
      if (!guestIsAdmin()) return forbidden('Administrators only.')

      const routeMatch = url.match(/admin\/users\/([^/]+)\/role/)
      const targetId = routeMatch ? routeMatch[1] : null
      const requestedRole = String(data?.role || '').toUpperCase()
      const role = ['USER', 'ADMIN'].includes(requestedRole) ? requestedRole : null
      if (!targetId) return badRequest('No user with that id.')
      if (!role) return badRequest('A role is required (USER, ADMIN).')

      const accounts = guestAccounts()
      const target = accounts.find((user) => String(user.id) === String(targetId))
      if (!target) return badRequest('No user with that id.')
      if (String(targetId) === String(currentGuestUserId())) {
        return badRequest('You cannot change your own role.')
      }

      const keysNow = guestAdminCount(accounts)
      if (target.role === 'ADMIN' && role !== 'ADMIN' && keysNow <= 1) {
        return badRequest('The last administrator cannot be demoted.')
      }

      const updated = setGuestUserRole(targetId, role)
      return Promise.resolve({ data: updated })
    }

    // Admin surface — re-role, revoke or re-admit a whitelist address
    if (url.includes('admin/whitelist')) {
      if (!guestIsAdmin()) return forbidden('Administrators only.')

      const entry = findGuestWhitelistEntry(extractId(url))
      if (!entry) return badRequest('No whitelist entry with that id.')
      if (data?.role === undefined && data?.active === undefined) {
        return badRequest('Nothing to update: provide a role, an active flag, or both.')
      }

      const entries = getGuestWhitelist()
      const stored = entries.find((row) => String(row.id) === String(entry.id))
      if (data?.role !== undefined) stored.role = data.role === 'ADMIN' ? 'ADMIN' : 'USER'
      if (data?.active !== undefined) stored.active = !!data.active
      saveGuestWhitelist(entries)
      return Promise.resolve({ data: stored })
    }

    // The guest's own profile (display name) — mirrors PATCH /api/users/{id},
    // which is self-service and display-name only in the live backend too.
    if (url.includes('users') && !url.includes('admin/users')) {
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
      return Promise.resolve({ data: updated })
    }

    if (url.includes('characters')) {
      const id = extractId(url)
      if (id) {
        const characters = getData(KEYS.CHARACTERS, [])
        const index = characters.findIndex((c) => String(c.id) === String(id))

        if (index !== -1) {
          if (url.includes('/campaign')) {
            const campaignId = data && typeof data === 'object' ? data.campaignId : data
            characters[index].campaignId = campaignId || null
          } else if (typeof data === 'object' && data !== null) {
            characters[index] = { ...characters[index], ...data }
          }

          characters[index].updatedAt = new Date().toISOString()
          setData(KEYS.CHARACTERS, characters)
          return Promise.resolve({ data: characters[index] })
        }
      }
    }

    if (url.includes('campaigns')) {
      const campaigns = getData(KEYS.CAMPAIGNS, [])

      if (url.includes('/participants/') && (url.includes('/nickname') || url.includes('/role'))) {
        const urlParts = url.split('/')
        const campaignId = urlParts[urlParts.indexOf('campaigns') + 1]
        let participantId = urlParts[urlParts.indexOf('participants') + 1]
        if (participantId === 'null') participantId = 'guest_demo'

        // GM edits other people's nicknames; the owner changes roles; any
        // participant may edit their own nickname.
        const permissions = guestCampaignPermissions(campaignId)
        if (url.includes('/nickname')) {
          const isSelfNickname = String(participantId) === String(currentGuestUserId())
          if (!isSelfNickname && !permissions.canEditOthersNicknames) {
            return forbidden('You do not have permission to change this nickname.')
          }
        } else if (!permissions.canChangeParticipantRoles) {
          return forbidden('You do not have permission to change participant roles.')
        }

        const cIdx = campaigns.findIndex((c) => String(c.id) === String(campaignId))
        if (cIdx !== -1 && campaigns[cIdx].participants) {
          const pIdx = campaigns[cIdx].participants.findIndex(
            (p) => String(p.id) === String(participantId),
          )
          if (pIdx !== -1) {
            if (url.includes('/nickname')) {
              campaigns[cIdx].participants[pIdx].nickname =
                typeof data === 'string' ? data : data.nickname
            } else if (url.includes('/role')) {
              campaigns[cIdx].participants[pIdx].role = typeof data === 'string' ? data : data.role
            }
            setData(KEYS.CAMPAIGNS, campaigns)
            return Promise.resolve({ data: campaigns[cIdx] })
          }
        }
      }

      if (url.includes('/participants') && !url.includes('/nickname') && !url.includes('/role')) {
        const match = url.match(/campaigns\/([^/]+)/)
        const id = match ? match[1] : null

        if (!guestCampaignPermissions(id).canManageParticipants) {
          return forbidden('You do not have permission to manage participants.')
        }

        const index = campaigns.findIndex((c) => String(c.id) === String(id))
        if (index !== -1) {
          let currentList = campaigns[index].participants || []

          if (data.participantIdsToRemove && data.participantIdsToRemove.length > 0) {
            const idsToRemove = data.participantIdsToRemove.map((p) =>
              p && typeof p === 'object' ? String(p.id) : String(p),
            )
            currentList = currentList.filter(
              (p) => p && p.id && !idsToRemove.includes(String(p.id)),
            )
          }

          if (data.participantsToAdd && data.participantsToAdd.length > 0) {
            const dummyUsers = getData('guest_users', [])

            data.participantsToAdd.forEach((p) => {
              const participantId = p && typeof p === 'object' ? String(p.id) : String(p)

              if (participantId && !currentList.some((el) => String(el.id) === participantId)) {
                const userDetails = dummyUsers.find((u) => String(u.id) === participantId)

                currentList.push({
                  id: participantId,
                  nickname:
                    userDetails?.displayName ||
                    userDetails?.username ||
                    (p && typeof p === 'object' ? p.displayName || p.username : null) ||
                    'Player',
                  role: 'PLAYER',
                })
              }
            })
          }

          campaigns[index].participants = currentList
          setData(KEYS.CAMPAIGNS, campaigns)
          return Promise.resolve({ data: campaigns[index] })
        }
      }

      if (url.includes('/owner')) {
        const id = extractId(url)
        if (!guestCampaignPermissions(id).canTransferOwnership) {
          return forbidden('You do not have permission to transfer ownership.')
        }
        const index = campaigns.findIndex((c) => String(c.id) === String(id))
        if (index !== -1 && data.newOwnerId) {
          campaigns[index].ownerId = data.newOwnerId
          setData(KEYS.CAMPAIGNS, campaigns)
          return Promise.resolve({ data: campaigns[index] })
        }
      }

      const id = extractId(url)
      if (id && !url.includes('/participants') && !url.includes('/owner')) {
        if (!guestCampaignPermissions(id).canEditCampaignDetails) {
          return forbidden('You do not have permission to edit this campaign.')
        }
        const index = campaigns.findIndex((c) => String(c.id) === String(id))
        if (index !== -1) {
          campaigns[index] = { ...campaigns[index], ...data, updatedAt: new Date().toISOString() }
          setData(KEYS.CAMPAIGNS, campaigns)
          return Promise.resolve({ data: campaigns[index] })
        }
      }
    }

    return Promise.resolve({ data: null })
  },

  delete(url) {
    if (!isGuestMode()) return Promise.resolve({ data: { deleted: false } })
    console.debug(`[guest-axios] DELETE -> ${url}`)

    // Admin surface — revoke a whitelist address (a soft delete: the row stays)
    if (url.includes('admin/whitelist')) {
      if (!guestIsAdmin()) return forbidden('Administrators only.')

      const entry = findGuestWhitelistEntry(extractId(url))
      if (!entry) return badRequest('No whitelist entry with that id.')

      const entries = getGuestWhitelist()
      const stored = entries.find((row) => String(row.id) === String(entry.id))
      stored.active = false
      saveGuestWhitelist(entries)
      return Promise.resolve({ data: { deleted: true } })
    }

    // 1. CHOSEN ROUTE: Remove a spell from a character
    if (url.includes('characters') && url.includes('/spells/')) {
      const urlParts = url.split('/')
      const spellsIdx = urlParts.indexOf('spells')
      const characterId = urlParts[spellsIdx - 1]
      const spellKey = urlParts[spellsIdx + 1]?.split('?')[0]

      if (characterId && spellKey) {
        const characters = getData(KEYS.CHARACTERS, [])
        const idx = characters.findIndex((c) => String(c.id) === String(characterId))

        if (idx !== -1 && characters[idx].spells) {
          characters[idx].spells = characters[idx].spells.filter(
            (s) => String(s.key) !== String(spellKey) && String(s.slug) !== String(spellKey),
          )
          setData(KEYS.CHARACTERS, characters)
          return Promise.resolve({ data: { success: true } })
        }
      }
      return Promise.resolve({ data: { success: false } })
    }

    // 2. Remove character from campaign (dissociate, don't delete)
    if (url.includes('characters') && url.includes('/campaign')) {
      const id = extractId(url)
      const characters = getData(KEYS.CHARACTERS, [])
      const index = characters.findIndex((c) => String(c.id) === String(id))
      if (index !== -1) {
        // Mirrors the backend: the character's owner, the campaign GM, or the
        // campaign owner may detach (this never deletes the character).
        const character = characters[index]
        const isCharacterOwner = String(character.ownerId) === String(currentGuestUserId())
        const permissions = character.campaignId
          ? guestCampaignPermissions(character.campaignId)
          : null
        const mayManageCampaign = !!permissions && (permissions.isGm || permissions.isOwner)
        if (!isCharacterOwner && !mayManageCampaign) {
          return forbidden('You may not remove this character from its campaign.')
        }

        characters[index].campaignId = null
        setData(KEYS.CHARACTERS, characters)
      }
      return Promise.resolve({ data: { success: true } })
    }

    // 3. DELETE CHARACTER FULLY (Only caught if above routing options mismatch)
    if (url.includes('characters')) {
      const id = extractId(url)
      if (id) {
        const characters = getData(KEYS.CHARACTERS, [])
        setData(
          KEYS.CHARACTERS,
          characters.filter((c) => String(c.id) !== String(id)),
        )
        return Promise.resolve({ data: { deleted: true } })
      }
    }

    // 3a. Remove a crew image from my own entry (must precede the ship images block)
    if (url.includes('campaigns') && url.includes('/ship/crew/me/images')) {
      const match = url.match(/campaigns\/([^/]+)\/ship\/crew\/me\/images/)
      const campaignId = match ? match[1] : null
      if (!campaignId || !isGuestParticipant(campaignId)) {
        return forbidden('You are not a participant in this campaign.')
      }
      const userId = currentGuestUserId()
      const params = new URLSearchParams(url.split('?')[1] || '')
      const imageUrl = params.get('url')
      const existing = shipCrewRows(campaignId).find((row) => String(row.userId) === String(userId))
      saveShipCrewRow(campaignId, userId, {
        imageUrls: (existing?.imageUrls || []).filter((entry) => entry !== imageUrl),
      })
      return Promise.resolve({ data: myCrewDTO(campaignId) })
    }

    // 3b. Remove a ship gallery image (must precede the campaign delete block)
    if (url.includes('campaigns') && url.includes('/ship/images')) {
      const match = url.match(/campaigns\/([^/]+)\/ship\/images/)
      const campaignId = match ? match[1] : null
      const params = new URLSearchParams(url.split('?')[1] || '')
      return Promise.resolve({ data: removeShipGalleryImage(campaignId, params.get('url')) })
    }

    // 4. Delete Campaign Fully
    if (url.includes('campaigns')) {
      const id = extractId(url)
      if (id) {
        if (!guestCampaignPermissions(id).canDeleteCampaign) {
          return forbidden('You do not have permission to delete this campaign.')
        }

        const campaigns = getData(KEYS.CAMPAIGNS, [])
        setData(
          KEYS.CAMPAIGNS,
          campaigns.filter((c) => String(c.id) !== String(id)),
        )

        const characters = getData(KEYS.CHARACTERS, [])
        setData(
          KEYS.CHARACTERS,
          characters.map((c) =>
            String(c.campaignId) === String(id) ? { ...c, campaignId: null } : c,
          ),
        )

        // A campaign's ship is removed with the campaign.
        const ships = getData(KEYS.SHIPS, [])
        setData(
          KEYS.SHIPS,
          ships.filter((s) => String(s.campaignId) !== String(id)),
        )
        return Promise.resolve({ data: { deleted: true } })
      }
    }

    // 5. Delete Message (only sender can delete)
    if (url.includes('messages')) {
      const id = extractId(url)
      if (id) {
        const messages = getData(KEYS.MESSAGES, [])
        const messageIndex = messages.findIndex((m) => String(m.id) === String(id))
        if (messageIndex !== -1) {
          const guestUser = getData(KEYS.USER, null)
          const currentUserId = guestUser?.id || 'guest_demo'
          // Only the message sender can delete
          if (String(messages[messageIndex].userId) !== String(currentUserId)) {
            const error = {
              data: { message: 'You do not have permission to delete this message.' },
              status: 403,
              handled: false,
            }
            return Promise.reject({ response: error })
          }
          messages.splice(messageIndex, 1)
          setData(KEYS.MESSAGES, messages)
          return Promise.resolve({ data: { deleted: true } })
        }
      }
    }

    return Promise.resolve({ data: { deleted: false } })
  },
}

export default guestAxios
