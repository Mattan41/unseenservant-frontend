import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import SpellService from '@/features/spell/SpellService.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { normalizeSpell } from '@/features/spell/spellUtils.js'

export const useSpellStore = defineStore('spell', () => {
  // ==========================================================================
  // State
  // ==========================================================================

  /** @type {import('vue').Ref<Array>} Current search results (array of spell objects) */
  const searchResults = ref([])

  /** @type {import('vue').Ref<Map<string, object>>} Spell cache keyed by Open5e key */
  const spellCache = ref(new Map())

  /** @type {import('vue').Ref<string>} Current search query */
  const currentQuery = ref('')

  /** @type {import('vue').Ref<number>} Current page number */
  const currentPage = ref(1)

  /** @type {import('vue').Ref<number|null>} Total number of results */
  const totalResults = ref(null)

  /** @type {import('vue').Ref<boolean>} Loading state */
  const isLoading = ref(false)

  /** @type {import('vue').Ref<string|null>} Error message */
  const error = ref(null)

  /** @type {import('vue').Ref<Array<{query: string, timestamp: number}>>} Search history */
  const searchHistory = ref([])

  // ==========================================================================
  // Computed
  // ==========================================================================

  /** Whether there are more pages to load (50 results per page) */
  const hasNextPage = computed(() => {
    return currentPage.value * 50 < (totalResults.value || 0)
  })

  /** Whether there is a previous page */
  const hasPreviousPage = computed(() => currentPage.value > 1)

  /** Total number of pages based on 50 results per page */
  const totalPages = computed(() => {
    if (!totalResults.value) return 1
    return Math.ceil(totalResults.value / 50)
  })

  // ==========================================================================
  // Internal helpers
  // ==========================================================================

  /**
   * Add spells to the cache by their Open5e key
   * @param {Array} spells - Array of spell objects
   */
  function cacheSpells(spells) {
    if (!Array.isArray(spells)) return
    spells.forEach((spell) => {
      if (spell.key) {
        spellCache.value.set(spell.key, spell)
      }
    })
  }

  /**
   * Add a query to search history (deduplicated, max 10 entries)
   * @param {string} query
   */
  function addToSearchHistory(query) {
    if (!query || !query.trim()) return
    const trimmed = query.trim()
    searchHistory.value = searchHistory.value.filter((h) => h.query !== trimmed)
    searchHistory.value.unshift({ query: trimmed, timestamp: Date.now() })
    if (searchHistory.value.length > 10) {
      searchHistory.value = searchHistory.value.slice(0, 10)
    }
  }

  // ==========================================================================
  // Debounce utility
  // ==========================================================================

  let debounceTimer = null

  function debounce(fn, delay = 300) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(fn, delay)
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Search spells from Open5e API v2.
   * Debounces input by 300ms to reduce API load.
   * Always sets searchResults = response.results (the array).
   * @param {string} query - Search query
   * @param {number} [page=1] - Page number
   */
  async function searchSpells(query, page = 1) {
    const notificationStore = useNotificationStore()
    const trimmedQuery = query ? query.trim() : ''

    if (!trimmedQuery) {
      searchResults.value = []
      currentQuery.value = ''
      currentPage.value = 1
      totalResults.value = null
      error.value = null
      return
    }

    currentQuery.value = trimmedQuery
    currentPage.value = page
    isLoading.value = true
    error.value = null

    try {
      const response = await SpellService.searchSpells(trimmedQuery, page)

      searchResults.value = (response.results || []).map(normalizeSpell)
      totalResults.value = response.count || 0

      cacheSpells(searchResults.value)

      if (page === 1) {
        addToSearchHistory(trimmedQuery)
      }
    } catch (err) {
      console.error('Spell search failed:', err)
      error.value = 'Failed to search spells. Please try again.'
      notificationStore.addNotification('Failed to search spells.', 'error')
      searchResults.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Initiate a debounced search. Call this from components on input.
   * @param {string} query
   * @param {number} [page=1]
   */
  function debouncedSearch(query, page = 1) {
    debounce(() => {
      searchSpells(query, page)
    }, 300)
  }

  /**
   * Fetch a single spell by Open5e key, using cache if available.
   * @param {string} key - Open5e spell key (e.g., 'srd_fireball')
   * @returns {Promise<object>} Spell object
   */
  async function fetchSpellByKey(key) {
    const notificationStore = useNotificationStore()

    if (spellCache.value.has(key)) {
      return spellCache.value.get(key)
    }

    isLoading.value = true
    error.value = null

    try {
      const spell = await SpellService.fetchSpellByKey(key)
      if (spell && spell.key) {
        spellCache.value.set(spell.key, spell)
      }
      return spell
    } catch (err) {
      console.error('Failed to fetch spell:', err)
      error.value = 'Failed to fetch spell details.'
      notificationStore.addNotification('Failed to fetch spell details.', 'error')
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Save a spell to a character.
   * @param {number|string} characterId
   * @param {object} spell - Full spell object from Open5e (will be normalized)
   * @returns {Promise<object|null>}
   */
  async function saveSpellToCharacter(characterId, spell) {
    const notificationStore = useNotificationStore()

    if (!spell || !spell.key) {
      notificationStore.addNotification('Invalid spell data.', 'error')
      return null
    }

    try {
      const normalized = normalizeSpell(spell)
      const savedSpell = await SpellService.saveSpellToCharacter(characterId, normalized)
      notificationStore.addNotification(`"${spell.name}" saved to character!`, 'success')
      return savedSpell
    } catch (err) {
      console.error('Failed to save spell:', err)
      notificationStore.addNotification('Failed to save spell to character.', 'error')
      throw err
    }
  }

  /**
   * Fetch spells for a character.
   * @param {number|string} characterId
   * @returns {Promise<Array>}
   */
  async function fetchCharacterSpells(characterId) {
    const notificationStore = useNotificationStore()

    isLoading.value = true
    error.value = null

    try {
      const responseData = await SpellService.fetchCharacterSpells(characterId)
      const spells = (responseData || []).map((item) => {
        return normalizeSpell(item.spellData || item)
      })

      if (Array.isArray(spells)) {
        cacheSpells(spells)
      }
      return spells || []
    } catch (err) {
      console.error('Failed to fetch character spells:', err)
      error.value = 'Failed to fetch character spells.'
      notificationStore.addNotification('Failed to fetch character spells.', 'error')
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear current search results and query
   */
  function clearSearch() {
    searchResults.value = []
    currentQuery.value = ''
    currentPage.value = 1
    totalResults.value = null
    error.value = null
  }

  /**
   * Load next page of results
   */
  function nextPage() {
    if (hasNextPage.value && currentQuery.value) {
      searchSpells(currentQuery.value, currentPage.value + 1)
    }
  }

  /**
   * Load previous page of results
   */
  function previousPage() {
    if (hasPreviousPage.value && currentQuery.value) {
      searchSpells(currentQuery.value, currentPage.value - 1)
    }
  }

  /**
   * Get a spell from the cache by key
   * @param {string} key
   * @returns {object|null}
   */
  function getCachedSpell(key) {
    return spellCache.value.get(key) || null
  }

  /**
   * Remove a spell from a character.
   * @param {number|string} characterId
   * @param {string} spellKey
   * @returns {Promise<boolean>}
   */
  async function removeSpellFromCharacter(characterId, spellKey) {
    const notificationStore = useNotificationStore()
    isLoading.value = true

    try {
      await SpellService.removeSpellFromCharacter(characterId, spellKey)
      notificationStore.addNotification('Spell removed from character.', 'success')
      return true
    } catch (err) {
      console.error('Failed to remove spell:', err)
      notificationStore.addNotification('Failed to remove spell from character.', 'error')
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Final unified API export
  return {
    // State
    searchResults,
    spellCache,
    currentQuery,
    currentPage,
    totalResults,
    isLoading,
    error,
    searchHistory,

    // Computed
    hasNextPage,
    hasPreviousPage,
    totalPages,

    // Actions
    searchSpells,
    debouncedSearch,
    fetchSpellByKey,
    saveSpellToCharacter,
    fetchCharacterSpells,
    removeSpellFromCharacter,
    clearSearch,
    nextPage,
    previousPage,
    getCachedSpell,
  }
})
