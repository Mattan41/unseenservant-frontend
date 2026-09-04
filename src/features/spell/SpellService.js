import apiClient from '@/api/apiClient.js'
import axios from '@/api/lib/axios.js'
import open5eAxios from '@/api/lib/open5e-axios.js'
import { useAuthStore } from '@/features/auth/authStore'

/**
 * SpellService - fetches spells from backend (authenticated) or Open5e API (guest).
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
   * True when the current session is guest mode (no auth).
   * @returns {boolean}
   */
  _isGuestMode() {
    try {
      return useAuthStore().isGuest || false
    } catch {
      return false
    }
  },

  /**
   * Translate a Spring Page response into the Open5e paginated shape.
   * Spring: { content, totalElements, totalPages, number, size, ... }
   * Open5e: { count, next, previous, results }
   * @param {object} springData
   * @returns {object}
   */
  _springPageToOpen5e(springData) {
    const currentPage = springData.number ?? 0
    const totalPages = springData.totalPages ?? 1
    return {
      count: springData.totalElements ?? 0,
      next: currentPage < totalPages - 1 ? `/spells/?page=${currentPage + 2}` : null,
      previous: currentPage > 0 ? `/spells/?page=${currentPage}` : null,
      results: springData.content || [],
    }
  },

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Search spells.
   * - Authenticated: calls backend GET /api/spells (Spring Page → Open5e shape)
   * - Guest: calls Open5e API v2 GET /spells/
   *
   * Always returns Open5e-compatible shape: { count, next, previous, results }
   *
   * @param {string} query - Search term
   * @param {number} page - Page number (1-indexed, default 1)
   * @returns {Promise<object>} Paginated response
   */
  async searchSpells(query, page = 1) {
    if (this._isGuestMode()) {
      const response = await open5eAxios.get('/spells/', {
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
    const response = await axios.get('/api/spells', {
      params: {
        query,
        page: page - 1,
        size: 50,
      },
    })

    // If the backend returned a Spring Page, translate to Open5e shape
    if (response.data && response.data.content !== undefined) {
      return this._springPageToOpen5e(response.data)
    }

    return response.data
  },

  /**
   * Fetch a single spell by its Open5e key (e.g., 'srd_fireball').
   * - Authenticated: calls backend GET /api/spells/{key}
   * - Guest: calls Open5e API v2 GET /spells/{key}/
   *
   * @param {string} key - Spell identifier key
   * @returns {Promise<object>} Spell object
   */
  async fetchSpellByKey(key) {
    if (this._isGuestMode()) {
      const response = await open5eAxios.get(`/spells/${key}/`)
      return response.data
    }

    // Authenticated → backend
    const response = await axios.get(`/api/spells/${key}`)
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
