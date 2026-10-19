import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import CharacterService from '@/features/character/CharacterService.js'
import { recordView, viewHistory } from '@/utils/viewHistory.js'

vi.mock('@/features/character/CharacterService.js', () => ({
  default: {
    fetchAllCharactersForCurrentUser: vi.fn(),
  },
}))

const USER = { id: 7, username: 'player', role: 'USER' }
const OTHER_USER_ID = 8

const CHARACTERS = [
  { id: 1, name: 'Aragorn' },
  { id: 2, name: 'Bilbo' },
  { id: 3, name: 'Celeborn' },
]

const ids = (items) => items.map((item) => item.id)

describe('characterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    // Module-level state, shared between tests.
    viewHistory.value = {}
    useUserStore().currentUser = USER
    CharacterService.fetchAllCharactersForCurrentUser.mockResolvedValue(CHARACTERS)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('sortedCharacters', () => {
    it('keeps the order the backend returned while nothing has been viewed', async () => {
      const store = useCharacterStore()

      await store.fetchAllCharactersForCurrentUser()

      expect(ids(store.sortedCharacters)).toEqual([1, 2, 3])
    })

    it('puts the most recently viewed character first', async () => {
      const store = useCharacterStore()
      await store.fetchAllCharactersForCurrentUser()

      // Fake timers keep the two views a known millisecond apart: equal
      // timestamps tie, and a tie keeps the backend order.
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'))
      recordView('character', 2, USER.id)
      vi.setSystemTime(new Date('2024-01-01T10:00:01Z'))
      recordView('character', 3, USER.id)

      expect(ids(store.sortedCharacters)).toEqual([3, 2, 1])
    })

    it("ignores another user's view history", async () => {
      const store = useCharacterStore()
      await store.fetchAllCharactersForCurrentUser()

      recordView('character', 3, OTHER_USER_ID)

      expect(ids(store.sortedCharacters)).toEqual([1, 2, 3])
    })

    it('leaves the raw list in backend order', async () => {
      const store = useCharacterStore()
      await store.fetchAllCharactersForCurrentUser()

      recordView('character', 3, USER.id)

      expect(ids(store.characters)).toEqual([1, 2, 3])
    })
  })
})
