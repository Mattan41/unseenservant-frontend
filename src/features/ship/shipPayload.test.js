import { describe, it, expect } from 'vitest'
import { buildShipPayload } from '@/features/ship/shipPayload.js'

describe('buildShipPayload', () => {
  const ship = {
    id: 's1',
    campaignId: 'c1',
    name: 'Rustbucket',
    hull: 10,
    hullMax: 15,
    armor: 1,
    damage: '1D6+1',
    driveFuel: 2,
    maxDriveFuel: 4,
    credits: 5,
    upgrades: ['MedBay'],
    notes: 'Loud',
    imageUrl: '/ship.png',
    imageUrls: ['/a.png'],
    version: 3,
  }

  it('includes the editable fields and the version', () => {
    expect(buildShipPayload(ship)).toEqual({
      name: 'Rustbucket',
      hull: 10,
      hullMax: 15,
      armor: 1,
      damage: '1D6+1',
      driveFuel: 2,
      maxDriveFuel: 4,
      credits: 5,
      upgrades: ['MedBay'],
      notes: 'Loud',
      version: 3,
    })
  })

  it('excludes images and identity fields (managed elsewhere)', () => {
    const payload = buildShipPayload(ship)
    expect(payload).not.toHaveProperty('id')
    expect(payload).not.toHaveProperty('campaignId')
    expect(payload).not.toHaveProperty('imageUrl')
    expect(payload).not.toHaveProperty('imageUrls')
  })

  it('copies the upgrades array so the source is not mutated', () => {
    const payload = buildShipPayload(ship)
    payload.upgrades.push('Fuel Tanks')
    expect(ship.upgrades).toEqual(['MedBay'])
  })

  it('tolerates a missing ship and missing upgrades', () => {
    expect(buildShipPayload(null)).toMatchObject({ upgrades: [] })
    expect(buildShipPayload({ name: 'x' }).upgrades).toEqual([])
  })
})
