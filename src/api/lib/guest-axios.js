/**
 * Guest Mode LocalStorage Adapter
 *
 * This module provides an axios-like interface that reads/writes to localStorage.
 * It features automatic key-fallback mapping to handle both snake_case and camelCase
 * seed structures transparently.
 */

import { useAuthStore } from '@/features/auth/authStore'

// Core local storage keys used by the adapter
const KEYS = {
  USER: 'guest_user',
  CHARACTERS: 'guest_characters',
  CAMPAIGNS: 'guest_campaigns',
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

// ============================================================================
// Guest Axios Mock Interface
// ============================================================================

const guestAxios = {
  get(url) {
    if (!isGuestMode()) return Promise.resolve({ data: null })
    console.debug(`[guest-axios] GET -> ${url}`)

    // User Profile Hooks
    if (url.includes('users/me') || url.includes('api/me') || (url.includes('users') && url.endsWith('/me'))) {
      return Promise.resolve({ data: getData(KEYS.USER, null) })
    }

    // User Search Interface (Handles query matching via URLSearchParams safely)
    if (url.includes('users/search')) {
      const queryString = url.split('?')[1] || ''
      const params = new URLSearchParams(queryString)
      const query = (params.get('query') || '').toLowerCase()

      const dummyUsers = getData('guest_users', [])
      const filtered = dummyUsers.filter(u =>
        (u.displayName && u.displayName.toLowerCase().includes(query)) ||
        (u.username && u.username.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query))
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
        return Promise.resolve({ data: filtered })
      }

      if (url.includes('without-campaign')) {
        return Promise.resolve({ data: characters.filter((c) => !c.campaignId) })
      }

      const id = extractId(url)
      if (id && id !== 'characters' && id !== 'me') {
        const character = characters.find((c) => String(c.id) === String(id))
        return Promise.resolve({ data: character || null })
      }

      // Default profile filter or fallback all array rows
      if (url.includes('/me')) {
        return Promise.resolve({ data: characters.filter((c) => c.ownerId === 'guest_demo') })
      }
      return Promise.resolve({ data: characters })
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

    return Promise.resolve({ data: null })
  },

  post(url, data = {}) {
    if (!isGuestMode()) return Promise.resolve({ data: null })
    console.debug(`[guest-axios] POST -> ${url}`)

    if (url.includes('campaigns') && url.includes('/image')) {
      return Promise.resolve({ data: { imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe' } })
    }

    if (url.includes('characters') && url.includes('/image')) {
      return Promise.resolve({ data: { imageUrl: '/defaultCharacter.svg' } })
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
            const normalizedSpell = {
              key: sourceData.key || data.slug || `spell_${Date.now()}`,
              name: sourceData.name || 'Unknown Spell',
              level: sourceData.level ?? 0,
              school: sourceData.school || '',
              documentKey: sourceData.documentKey || '',
              documentName: sourceData.documentName || '',
              classes: sourceData.classes || [],
              desc: sourceData.desc || sourceData.description || '',
              range: sourceData.range || '',
              duration: sourceData.duration || '',
              casting_time: sourceData.casting_time || '',
              components: sourceData.components || [],
              material: sourceData.material || '',
              ritual: sourceData.ritual || false,
              concentration: sourceData.concentration || false,
              higher_level: sourceData.higher_level || '',
              isHomebrew: data.isHomebrew || sourceData.isHomebrew || false,
            }
            characters[idx].spells.push(normalizedSpell)
            setData(KEYS.CHARACTERS, characters)
            return Promise.resolve({ data: normalizedSpell })
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
        imageUrl: '/default-campaign.svg',
        participants: [{ id: 'guest_demo', nickname: 'You (DM)', role: 'GM' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      campaigns.push(newCampaign)
      setData(KEYS.CAMPAIGNS, campaigns)
      return Promise.resolve({ data: newCampaign })
    }

    return Promise.resolve({ data: null })
  },

  put(url, data = {}) {
    if (!isGuestMode()) return Promise.resolve({ data: null })
    console.debug(`[guest-axios] PUT -> ${url}`)

    if (url.includes('campaigns')) {
      const id = extractId(url)
      if (id) {
        const campaigns = getData(KEYS.CAMPAIGNS, [])
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

  patch(url, data = {}) {
    if (!isGuestMode()) return Promise.resolve({ data: null })
    console.debug(`[guest-axios] PATCH -> ${url}`)

    if (url.includes('characters')) {
      const id = extractId(url)
      if (id) {
        const characters = getData(KEYS.CHARACTERS, [])
        const index = characters.findIndex((c) => String(c.id) === String(id))

        if (index !== -1) {
          if (url.includes('/campaign')) {
            const campaignId = (data && typeof data === 'object') ? data.campaignId : data
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

        const cIdx = campaigns.findIndex((c) => String(c.id) === String(campaignId))
        if (cIdx !== -1 && campaigns[cIdx].participants) {
          const pIdx = campaigns[cIdx].participants.findIndex(p => String(p.id) === String(participantId))
          if (pIdx !== -1) {
            if (url.includes('/nickname')) {
              campaigns[cIdx].participants[pIdx].nickname = typeof data === 'string' ? data : data.nickname
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

        const index = campaigns.findIndex((c) => String(c.id) === String(id))
        if (index !== -1) {
          let currentList = campaigns[index].participants || []

          if (data.participantIdsToRemove && data.participantIdsToRemove.length > 0) {
            const idsToRemove = data.participantIdsToRemove.map(p => p && typeof p === 'object' ? String(p.id) : String(p))
            currentList = currentList.filter(p => p && p.id && !idsToRemove.includes(String(p.id)))
          }

          if (data.participantsToAdd && data.participantsToAdd.length > 0) {
            const dummyUsers = getData('guest_users', [])

            data.participantsToAdd.forEach(p => {
              const participantId = p && typeof p === 'object' ? String(p.id) : String(p)

              if (participantId && !currentList.some(el => String(el.id) === participantId)) {
                const userDetails = dummyUsers.find(u => String(u.id) === participantId)

                currentList.push({
                  id: participantId,
                  nickname: userDetails?.displayName || userDetails?.username || (p && typeof p === 'object' ? p.displayName || p.username : null) || 'Player',
                  role: 'PLAYER'
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
        const index = campaigns.findIndex((c) => String(c.id) === String(id))
        if (index !== -1 && data.newOwnerId) {
          campaigns[index].ownerId = data.newOwnerId
          setData(KEYS.CAMPAIGNS, campaigns)
          return Promise.resolve({ data: campaigns[index] })
        }
      }

      const id = extractId(url)
      if (id && !url.includes('/participants') && !url.includes('/owner')) {
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

    // 4. Delete Campaign Fully
    if (url.includes('campaigns')) {
      const id = extractId(url)
      if (id) {
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
        return Promise.resolve({ data: { deleted: true } })
      }
    }

    return Promise.resolve({ data: { deleted: false } })
  },
}

export default guestAxios
