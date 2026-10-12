import { describe, it, expect } from 'vitest'
import {
  buildCharacterExport,
  buildCharacterBackup,
  parseCharacterBackup,
  characterFromBackup,
} from '@/features/character/characterExport.js'

const offworlders = {
  id: 7,
  name: 'Morsan',
  systemType: 'OFFWORLDERS',
  notes: 'some notes',
  appearance: 'weathered',
  backstory: 'A backstory',
  privateBackstory: 'Only for player and GM',
  ownerId: 3,
  campaignId: 1,
  avatarUrl: '/images/x.png',
  createdAt: '2020-01-01T00:00:00Z',
  updatedAt: '2020-01-02T00:00:00Z',
  offworlders: {
    characterClass: 'Outlaw',
    stats: { strength: -1, agility: 0, intelligence: 1, willpower: 2 },
    skills: [{ name: 'Manipulation' }],
    abilities: [{ name: 'Lucky' }],
    weapons: [],
    items: [],
  },
}

const dnd5e = {
  name: 'Gandalf',
  systemType: 'DND5E',
  dnd5e: { race: 'Human', characterClass: 'Wizard', level: 10, hitPoints: 42, armorClass: 13, stats: {} },
}

describe('buildCharacterExport', () => {
  it('orders generic identity, then game-specific, then the long-text footer', () => {
    const txt = buildCharacterExport(offworlders, { format: 'txt' })
    const idxTitle = txt.indexOf('Morsan')
    const idxVitals = txt.indexOf('VITALS')
    const idxAppearance = txt.indexOf('APPEARANCE')
    const idxPrivate = txt.indexOf('PRIVATE BACKSTORY')
    expect(idxTitle).toBeGreaterThanOrEqual(0)
    expect(idxTitle).toBeLessThan(idxVitals)
    expect(idxVitals).toBeLessThan(idxAppearance)
    expect(idxAppearance).toBeLessThan(idxPrivate)
  })

  it('includes the private backstory when present (owner / GM view)', () => {
    expect(buildCharacterExport(offworlders, { format: 'md' })).toContain('## Private backstory')
  })

  it('omits the private backstory when the API did not return it', () => {
    const { privateBackstory, ...publicOnly } = offworlders
    expect(privateBackstory).toBeTruthy()
    expect(buildCharacterExport(publicOnly, { format: 'md' })).not.toContain('Private backstory')
  })

  it('includes D&D 5e spells in the export', () => {
    const spells = [{ name: 'Fireball', level: 3, levelLabel: '3rd level', school: 'Evocation' }]
    const md = buildCharacterExport(dnd5e, { format: 'md', spells })
    expect(md).toContain('## Spells')
    expect(md).toContain('Fireball (3rd level, Evocation)')
  })

  it('flattens long-text markdown in txt but keeps it in md', () => {
    const character = { name: 'X', systemType: 'OFFWORLDERS', backstory: '**bold**', offworlders: { stats: {} } }
    expect(buildCharacterExport(character, { format: 'txt' })).not.toContain('**')
    expect(buildCharacterExport(character, { format: 'md' })).toContain('**bold**')
  })
})

describe('buildCharacterBackup', () => {
  const backup = buildCharacterBackup(offworlders)

  it('wraps the payload in a versioned envelope', () => {
    expect(backup.app).toBe('unseenservant')
    expect(backup.kind).toBe('character')
    expect(backup.schemaVersion).toBe(1)
    expect(backup.exportedAt).toBeTruthy()
  })

  it('keeps only portable fields (drops id/owner/campaign/avatar/timestamps)', () => {
    expect(Object.keys(backup.character).sort()).toEqual(
      ['appearance', 'backstory', 'name', 'notes', 'offworlders', 'privateBackstory', 'systemType'].sort(),
    )
  })
})

describe('parseCharacterBackup', () => {
  it('round-trips a built backup', () => {
    const parsed = parseCharacterBackup(JSON.stringify(buildCharacterBackup(offworlders)))
    expect(parsed.name).toBe('Morsan')
    expect(parsed.offworlders.characterClass).toBe('Outlaw')
  })

  it('rejects invalid JSON', () => {
    expect(() => parseCharacterBackup('not json')).toThrow(/valid JSON/)
  })

  it('rejects a backup for another kind', () => {
    const text = JSON.stringify({ kind: 'ship', character: { name: 'x', systemType: 'Y' } })
    expect(() => parseCharacterBackup(text)).toThrow(/ship/)
  })

  it('rejects a newer schema version', () => {
    const text = JSON.stringify({ schemaVersion: 99, character: { name: 'x', systemType: 'OFFWORLDERS' } })
    expect(() => parseCharacterBackup(text)).toThrow(/newer version/)
  })

  it('rejects a payload missing the name or system', () => {
    expect(() => parseCharacterBackup(JSON.stringify({ character: { name: '' } }))).toThrow(
      /name or game system/,
    )
  })
})

describe('characterFromBackup', () => {
  it('builds the create-form model from a backup payload', () => {
    const backup = parseCharacterBackup(JSON.stringify(buildCharacterBackup(offworlders)))
    const form = characterFromBackup(backup)

    expect(form.name).toBe('Morsan')
    expect(form.systemType).toBe('OFFWORLDERS')
    expect(form.appearance).toBe('weathered')
    expect(form.offworlders.characterClass).toBe('Outlaw')
    // Both system blocks are always present (the form binds them), so the
    // inactive one must be a valid empty block rather than undefined.
    expect(form.dnd5e.stats.intelligence).toBe(10)
  })

  it('falls back to the default system when the backup has none', () => {
    const form = characterFromBackup({ name: 'Nameless' })
    expect(form.systemType).toBeTruthy()
  })
})
