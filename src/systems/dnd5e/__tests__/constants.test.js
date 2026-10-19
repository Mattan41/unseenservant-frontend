import { describe, it, expect } from 'vitest'
import {
  createEmptyDnd5eData,
  normalizeDnd5eData,
  DND5E_SYSTEM_TYPE,
  DND5E_ABILITY_SCORES,
} from '@/systems/dnd5e/constants.js'

describe('dnd5e constants', () => {
  it('exposes the DND5E system type identifier', () => {
    expect(DND5E_SYSTEM_TYPE).toBe('DND5E')
  })

  it('creates a valid empty data block with all ability scores at 10', () => {
    const data = createEmptyDnd5eData()
    expect(data.level).toBe(1)
    expect(data.armorClass).toBe(10)
    expect(Object.keys(data.stats)).toEqual(DND5E_ABILITY_SCORES)
    DND5E_ABILITY_SCORES.forEach((stat) => expect(data.stats[stat]).toBe(10))
  })

  it('returns a fresh object every time (no shared references)', () => {
    const a = createEmptyDnd5eData()
    const b = createEmptyDnd5eData()
    a.stats.strength = 20
    expect(b.stats.strength).toBe(10)
  })

  it('normalizeDnd5eData fills missing nested properties with defaults', () => {
    const normalized = normalizeDnd5eData({ level: 7, race: 'Elf' })
    expect(normalized.level).toBe(7)
    expect(normalized.race).toBe('Elf')
    expect(normalized.armorClass).toBe(10)
    expect(normalized.stats.charisma).toBe(10)
  })

  it('normalizeDnd5eData preserves provided stat values while filling the rest', () => {
    const normalized = normalizeDnd5eData({ stats: { strength: 18 } })
    expect(normalized.stats.strength).toBe(18)
    expect(normalized.stats.dexterity).toBe(10)
  })

  it('normalizeDnd5eData handles null/undefined input', () => {
    expect(normalizeDnd5eData(null).level).toBe(1)
    expect(normalizeDnd5eData(undefined).stats.wisdom).toBe(10)
  })
})
