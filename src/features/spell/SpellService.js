import apiClient from '@/api/apiClient.js'
import open5eAxios from '@/api/lib/open5e-axios.js'
import { useAuthStore } from '@/features/auth/authStore'

/**
 * SpellService - fetches spells from backend (authenticated) or Open5e API (everyone else).
 *
 * Design: each method decides directly whether to call the backend or Open5e,
 * instead of routing through a URL-sniffing wrapper. Param and response-shape
 * translation between backend (Spring Page) and Open5e live here, scoped to
 * the method that needs it.
 */

const SpellService = {
  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  /**
   * Only authenticated sessions (real logged-in users with a JWT) should
   * hit the backend DB for spells. Every other state — guest mode, plain
   * anonymous visitors, idle — should fetch directly from the Open5e API.
   * @returns {boolean}
   */
  _shouldUseOpen5eDirectly() {
    try {
      return !useAuthStore().isAuthenticated
    } catch {
      return true // default to Open5e on error
    }
  },

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Search spells.
   * - Authenticated: calls backend GET /api/spells
   * - Everyone else (guest mode, anonymous, idle): calls Open5e API v2 directly
   *
   * Always returns Open5e-compatible shape: { count, next, previous, results }
   *
   * @param {string} query - Search term
   * @param {number} page - Page number (1-indexed, default 1)
   * @returns {Promise<object>} Paginated response
   */
  async searchSpells(query, page = 1) {
    if (this._shouldUseOpen5eDirectly()) {
      // Guest, anonymous, or idle — fetch directly from the Open5e API
      const response = await open5eAxios.get('spells/', {
        params: {
          name__contains: query,
          page,
          limit: 50,
          ordering: 'name',
        },
      })
      return response.data
    }

    // Authenticated → backend
    // Map Open5e 1-indexed page to Spring 0-indexed page
    const response = await apiClient.get('api/spells', {
      params: {
        query,
        page: page - 1,
        size: 50,
      },
    })

    return response.data
  },

  /**
   * Fetch a single spell by its Open5e key (e.g., 'srd_fireball').
   * - Authenticated: calls backend GET /api/spells/{key}
   * - Everyone else (guest mode, anonymous, idle): calls Open5e API v2 directly
   *
   * @param {string} key - Spell identifier key
   * @returns {Promise<object>} Spell object
   */
  async fetchSpellByKey(key) {
    if (this._shouldUseOpen5eDirectly()) {
      // Guest, anonymous, or idle — fetch directly from the Open5e API
      const response = await open5eAxios.get(`spells/${key}/`)
      return response.data
    }

    // Authenticated → backend
    const response = await apiClient.get(`api/spells/${key}`)
    return response.data
  },

  /**
   * @param {number|string} characterId
   * @param {object} normalizedSpell - Clean homebrew-ready spell object
   * @returns {Promise<object>} Saved spell response
   */
  async saveSpellToCharacter(characterId, normalizedSpell) {
    // This structure ensures Spring Boot can find 'slug' and 'name' directly at the root,
    // while guest mode and future homebrew features have access to everything.
    // Note: isHomebrew and spellDetails are not read by the backend today — Jackson silently
    // ignores unknown fields. They exist so guest mode (which reads spellDetails) and a future
    // homebrew feature don't require a payload-shape change later.
    const unifiedPayload = {
      slug: normalizedSpell.key,
      name: normalizedSpell.name,
      isHomebrew: normalizedSpell.isHomebrew || false, // Future flag
      spellDetails: normalizedSpell, // Full normalized object for guest mode and future feature homebrew
    }

    const response = await apiClient.post(`api/characters/${characterId}/spells`, unifiedPayload)
    return response.data
  },

  /**
   * @param {number|string} characterId
   * @returns {Promise<Array>} Array of normalized spell objects
   */
  async fetchCharacterSpells(characterId) {
    const response = await apiClient.get(`api/characters/${characterId}/spells`)
    return response.data
  },

  /**
   * Remove a spell from a character.
   * @param {number|string} characterId
   * @param {string} spellKey - The Open5e key/slug of the spell
   */
  async removeSpellFromCharacter(characterId, spellKey) {
    const response = await apiClient.delete(`api/characters/${characterId}/spells/${spellKey}`)
    return response.data
  },
}

export default SpellService
