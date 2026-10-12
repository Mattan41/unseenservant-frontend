import { describe, it, expect } from 'vitest'
import { dnd5eExportSections } from '@/systems/dnd5e/dnd5eExport.js'

const character = {
  dnd5e: {
    race: 'Human',
    characterClass: 'Wizard',
    level: 10,
    hitPoints: 42,
    armorClass: 13,
    stats: { strength: 11, dexterity: 11, constitution: 11, intelligence: 19, wisdom: 15, charisma: 13 },
  },
}

describe('dnd5eExportSections', () => {
  it('builds vitals and capitalized ability scores', () => {
    const sections = dnd5eExportSections(character)
    const vitals = sections.find((s) => s.heading === 'Vitals').fields
    expect(vitals).toContainEqual({ label: 'Class', value: 'Wizard' })
    expect(vitals).toContainEqual({ label: 'Level', value: '10' })

    const stats = sections.find((s) => s.heading === 'Ability Scores').fields
    expect(stats).toContainEqual({ label: 'Intelligence', value: '19' })
    expect(stats).toContainEqual({ label: 'Charisma', value: '13' })
  })

  it('omits the Spells section when there are none', () => {
    expect(dnd5eExportSections(character).some((s) => s.heading === 'Spells')).toBe(false)
  })

  it('lists saved spells with their level and school', () => {
    const spells = [{ name: 'Fireball', level: 3, levelLabel: '3rd level', school: 'Evocation' }]
    const spellsSection = dnd5eExportSections(character, spells).find((s) => s.heading === 'Spells')
    expect(spellsSection.items).toEqual(['Fireball (3rd level, Evocation)'])
  })
})
