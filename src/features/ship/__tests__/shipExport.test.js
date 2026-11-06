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

describe('buildShipExport — sections', () => {
  const withSections = {
    ...ship,
    sections: [
      { id: 's1', title: 'Cargo', body: 'Two crates of medical supplies.' },
      { id: 's2', title: 'Leads', body: 'A rumour about the Dry Dock.' },
    ],
  }

  it('gives each section its own heading in markdown', () => {
    const md = buildShipExport(withSections, { format: 'md' })

    expect(md).toContain('## Cargo')
    expect(md).toContain('Two crates of medical supplies.')
    expect(md).toContain('## Leads')
    expect(md).toContain('A rumour about the Dry Dock.')
  })

  it('renders each section as a title and its body in plain text', () => {
    const txt = buildShipExport(withSections, { format: 'txt' })

    expect(txt).toContain('CARGO')
    expect(txt).toContain('Two crates of medical supplies.')
    expect(txt).toContain('LEADS')
  })

  it('keeps the notes field separate from the sections', () => {
    const md = buildShipExport(withSections, { format: 'md' })

    expect(md).toContain('## Notes')
    expect(md).toContain('**Loud** engines')
  })

  it('skips a section that has no body', () => {
    const md = buildShipExport(
      { ...ship, sections: [{ id: 's1', title: 'Empty', body: '' }] },
      { format: 'md' },
    )

    expect(md).not.toContain('## Empty')
  })

  it('exports a ship that has no sections exactly as before', () => {
    expect(buildShipExport(ship, { format: 'md' })).not.toContain('## Cargo')
  })
})
