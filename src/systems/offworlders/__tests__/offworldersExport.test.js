import { describe, it, expect } from 'vitest'
import { offworldersExportSections } from '@/systems/offworlders/offworldersExport.js'

const character = {
  offworlders: {
    characterClass: 'Outlaw',
    species: 'Human',
    supply: 3,
    credits: 3,
    xp: 0,
    armor: 1,
    stats: { strength: -1, agility: 0, intelligence: 1, willpower: 2 },
    skills: [{ name: 'Manipulation' }, { name: 'Culture' }],
    abilities: [{ name: 'Lucky' }, { name: 'Smuggle' }],
    weapons: [{ type: 'Light', description: 'Pistol' }],
    items: [{ name: 'Medkit', description: 'field medicine' }],
  },
}

const byHeading = (sections, heading) => sections.find((section) => section.heading === heading)

describe('offworldersExportSections', () => {
  const sections = offworldersExportSections(character)

  it('derives HP and armor from their sources', () => {
    const fields = byHeading(sections, 'Vitals').fields
    // Max health = 12 + strength(-1) + agility(0) = 11.
    expect(fields).toContainEqual({ label: 'HP', value: '11 / 11' })
    expect(fields).toContainEqual({ label: 'Armor', value: '1 (Light)' })
  })

  it('formats attributes with explicit signs', () => {
    const fields = byHeading(sections, 'Attributes').fields
    expect(fields).toContainEqual({ label: 'Strength', value: '-1' })
    expect(fields).toContainEqual({ label: 'Agility', value: '0' })
    expect(fields).toContainEqual({ label: 'Willpower', value: '+2' })
  })

  it('lists weapons with derived damage and items with descriptions', () => {
    expect(byHeading(sections, 'Weapons').items).toEqual(['Pistol — Light (damage 1D6)'])
    expect(byHeading(sections, 'Items').items).toEqual(['Medkit — field medicine'])
  })

  it('lists skill and ability names only', () => {
    expect(byHeading(sections, 'Skills').items).toEqual(['Manipulation', 'Culture'])
    expect(byHeading(sections, 'Abilities').items).toEqual(['Lucky', 'Smuggle'])
  })

  it('applies passive ability bonuses to the vitals', () => {
    const withBonuses = offworldersExportSections({
      offworlders: { stats: {}, abilities: [{ name: 'Hardy' }, { name: 'Unstoppable' }] },
    })
    const fields = byHeading(withBonuses, 'Vitals').fields
    expect(fields).toContainEqual({ label: 'HP', value: '16 / 16' }) // 12 + Hardy(+4)
    expect(fields).toContainEqual({ label: 'Armor', value: '1 (None)' }) // Unstoppable(+1)
  })

  it('copes with a character that has no system data', () => {
    expect(() => offworldersExportSections({})).not.toThrow()
    expect(offworldersExportSections({})[0].heading).toBe('Vitals')
  })
})
