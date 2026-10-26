import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCharacterStore } from '@/features/character/characterStore.js'
import { useUserStore } from '@/features/user/userStore.js'
import CharacterService from '@/features/character/CharacterService.js'
import { recordView, viewHistory } from '@/utils/viewHistory.js'

vi.mock('@/features/character/CharacterService.js', () => ({
  default: {
    fetchAllCharactersForCurrentUser: vi.fn(),
    addCharacterImage: vi.fn(),
    removeCharacterImage: vi.fn(),
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

  // The gallery is what a crew card shows under an Offworlders ship, so the
  // action has to keep both the list entry and the open character in step.
  describe('gallery images', () => {
    const file = () => new File(['x'], 'art.png', { type: 'image/png' })

    beforeEach(async () => {
      const store = useCharacterStore()
      await store.fetchAllCharactersForCurrentUser()
      store.currentCharacter = store.characters[0]
    })

    it('stores the returned character and hands back its gallery', async () => {
      const store = useCharacterStore()
      CharacterService.addCharacterImage.mockResolvedValue({
        id: 1,
        name: 'Aragorn',
        imageUrls: ['/images/art.png'],
      })

      const imageUrls = await store.addCharacterImage(1, file())

      expect(imageUrls).toEqual(['/images/art.png'])
      expect(store.characters[0].imageUrls).toEqual(['/images/art.png'])
      expect(store.currentCharacter.imageUrls).toEqual(['/images/art.png'])
    })

    it('drops a removed image from the gallery', async () => {
      const store = useCharacterStore()
      CharacterService.removeCharacterImage.mockResolvedValue({
        id: 1,
        name: 'Aragorn',
        imageUrls: [],
      })

      const imageUrls = await store.removeCharacterImage(1, '/images/art.png')

      expect(imageUrls).toEqual([])
      expect(store.currentCharacter.imageUrls).toEqual([])
    })

    it('rethrows a failed upload so the caller can keep its own state', async () => {
      const store = useCharacterStore()
      CharacterService.addCharacterImage.mockRejectedValue(new Error('upload failed'))

      await expect(store.addCharacterImage(1, file())).rejects.toThrow('upload failed')
    })
  })
})
