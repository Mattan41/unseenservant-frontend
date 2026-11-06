import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useShipStore } from '@/features/ship/shipStore.js'
import ShipService from '@/features/ship/ShipService.js'

vi.mock('@/features/ship/ShipService.js', () => ({
  default: {
    fetchShip: vi.fn(),
    saveShip: vi.fn(),
    uploadShipImage: vi.fn(),
    addShipGalleryImage: vi.fn(),
    removeShipGalleryImage: vi.fn(),
  },
}))

const SHIP = { id: 3, campaignId: 1, name: 'The Desert Rose', version: 4 }

/**
 * `lastUpdateSource` is what lets the ship sheet tell a background refresh from
 * a write this client made — the difference between keeping and dropping the
 * user's unsaved edits.
 */
describe('shipStore.lastUpdateSource', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('marks a fetch as a background refresh', async () => {
    ShipService.fetchShip.mockResolvedValue(SHIP)
    const store = useShipStore()

    await store.fetchShip(1)

    expect(store.lastUpdateSource).toBe('fetch')
  })

  it("marks a save as this client's own write", async () => {
    ShipService.saveShip.mockResolvedValue({ ...SHIP, version: 5 })
    const store = useShipStore()

    await store.saveShip(1, { name: 'The Desert Rose', version: 4 })

    expect(store.lastUpdateSource).toBe('save')
  })

  it('marks a quick-edit as a write of its own', async () => {
    ShipService.fetchShip.mockResolvedValue(SHIP)
    ShipService.saveShip.mockResolvedValue({ ...SHIP, version: 5 })
    const store = useShipStore()
    await store.fetchShip(1)

    await store.adjustShipField(1, 'credits', 250)

    expect(store.lastUpdateSource).toBe('adjust')
  })

  it('marks an image operation as a write of its own', async () => {
    ShipService.uploadShipImage.mockResolvedValue({ ...SHIP, imageUrl: '/ship.png' })
    const store = useShipStore()

    await store.uploadShipImage(1, new File(['x'], 'ship.png'))

    expect(store.lastUpdateSource).toBe('image')
  })

  it('forgets the source when the ship is cleared', async () => {
    ShipService.fetchShip.mockResolvedValue(SHIP)
    const store = useShipStore()
    await store.fetchShip(1)

    store.clearShip()

    expect(store.lastUpdateSource).toBe('')
  })
})
