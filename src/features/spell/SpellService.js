import apiClient from '@/api/apiClient.js'

/**
 * SpellService - uses apiClient to fetch spells from backend or open5EApi
 */

const SpellService = {
  /**
   * Search spells via Open5e API v2
   * Uses name__contains for the v2 query parameter.
   * Open5e returns a paginated object: { count, next, previous, results: [...] }
   * @param {string} query - Search term
   * @param {number} page - Page number (default 1)
   * @returns {Promise<object>} Paginated response
   */
  async searchSpells(query, page = 1) {
    const response = await apiClient.getOpen5e('/spells/', {
      params: {
        name__contains: query,
        page,
        limit: 50,
        ordering: 'name',
      },
    })
    return response.data
  },

  /**
   * Fetch a single spell by its Open5e key (e.g., 'srd_fireball')
   * @param {string} key - Spell identifier key
   * @returns {Promise<object>} Spell object
   */
  async fetchSpellByKey(key) {
    const response = await apiClient.getOpen5e(`/spells/${key}/`)
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
