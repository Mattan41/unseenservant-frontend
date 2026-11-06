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

/**
 * Sections save on their own, as a partial PUT: only `sections` and the version
 * the store holds travel, so a section edit can never revert an in-progress
 * sheet edit (and vice versa).
 */
describe('shipStore.saveShipSections', () => {
  const SECTIONS = [
    { id: 's1', title: 'Cargo', body: 'Two crates.' },
    { id: 's2', title: 'Leads', body: 'A rumour.' },
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('saves the whole list, in order, against the version the store holds', async () => {
    ShipService.fetchShip.mockResolvedValue(SHIP)
    ShipService.saveShip.mockResolvedValue({ ...SHIP, sections: SECTIONS, version: 5 })
    const store = useShipStore()
    await store.fetchShip(1)

    await store.saveShipSections(1, SECTIONS)

    expect(ShipService.saveShip).toHaveBeenCalledWith(1, { sections: SECTIONS, version: 4 })
    expect(store.ship.sections).toEqual(SECTIONS)
  })

  it('marks the write as a section save, so the sheet keeps its draft', async () => {
    ShipService.fetchShip.mockResolvedValue(SHIP)
    ShipService.saveShip.mockResolvedValue({ ...SHIP, version: 5 })
    const store = useShipStore()
    await store.fetchShip(1)

    await store.saveShipSections(1, SECTIONS)

    expect(store.lastUpdateSource).toBe('section')
  })

  it('does nothing when there is no ship loaded', async () => {
    const store = useShipStore()

    await expect(store.saveShipSections(1, SECTIONS)).resolves.toBeNull()
    expect(ShipService.saveShip).not.toHaveBeenCalled()
  })
})
