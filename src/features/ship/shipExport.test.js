import { describe, it, expect } from 'vitest'
import { buildShipExport } from '@/features/ship/shipExport.js'

const ship = {
  name: 'Rustbucket',
  hull: 10,
  hullMax: 15,
  armor: 1,
  damage: '1D6+1',
  driveFuel: 2,
  maxDriveFuel: 4,
  upgrades: ['Additional Armor', 'MedBay'],
  notes: '**Loud** engines',
}

describe('buildShipExport', () => {
  it('renders hull, armor, damage and fuel', () => {
    const txt = buildShipExport(ship, { format: 'txt' })
    expect(txt).toContain('Hull: 10 / 15')
    expect(txt).toContain('Damage: 1D6+1')
    expect(txt).toContain('Drive Fuel: 2 / 4')
  })

  it('expands upgrades with their catalog descriptions', () => {
    const txt = buildShipExport(ship, { format: 'txt' })
    expect(txt).toContain('- Additional Armor — +1 armor.')
    expect(txt).toContain('Automated medical equipment')
  })

  it('uses the campaign name as the subtitle when provided', () => {
    expect(buildShipExport(ship, { format: 'md', campaignName: 'The Crew' })).toContain(
      '_Campaign: The Crew_',
    )
  })

  it('flattens the notes markdown in txt', () => {
    const txt = buildShipExport(ship, { format: 'txt' })
    expect(txt).toContain('Loud engines')
    expect(txt).not.toContain('**')
  })
})
