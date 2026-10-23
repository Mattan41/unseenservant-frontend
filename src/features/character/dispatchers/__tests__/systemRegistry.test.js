import { describe, it, expect } from 'vitest'
import {
  buildPayload,
  characterSystemLabel,
  createEmptyCharacterBlocks,
  SYSTEM_FORM_OPTIONS,
} from '@/features/character/dispatchers/systemRegistry.js'
import { DND5E_SYSTEM_TYPE } from '@/systems/dnd5e/constants.js'
import { OFFWORLDERS_SYSTEM_TYPE } from '@/systems/offworlders/constants.js'

const CHARACTER = {
  name: 'F.R.E.Droid 27-b',
  systemType: DND5E_SYSTEM_TYPE,
  notes: 'A dutiful droid.',
  appearance: 'Rusty green plating and a worn multiport.',
  backstory: 'Built before the fall.',
  privateBackstory: 'Hides a faulty core.',
  dnd5e: { race: 'Warforged', characterClass: 'Fighter', level: 3 },
  offworlders: { characterClass: 'Pilot' },
}

describe('buildPayload', () => {
  it('sends every core long-text field, including appearance', () => {
    const payload = buildPayload(DND5E_SYSTEM_TYPE, CHARACTER)

    expect(payload).toMatchObject({
      name: CHARACTER.name,
      systemType: DND5E_SYSTEM_TYPE,
      notes: CHARACTER.notes,
      appearance: CHARACTER.appearance,
      backstory: CHARACTER.backstory,
      privateBackstory: CHARACTER.privateBackstory,
    })
  })

  it('never drops a core field (regression: appearance was omitted)', () => {
    const payload = buildPayload(DND5E_SYSTEM_TYPE, CHARACTER)

    expect(Object.keys(payload).sort()).toEqual(
      [
        'appearance',
        'backstory',
        'dnd5e',
        'name',
        'notes',
        'privateBackstory',
        'systemType',
      ].sort(),
    )
  })

  it('attaches only the active system block', () => {
    const dnd5ePayload = buildPayload(DND5E_SYSTEM_TYPE, CHARACTER)
    expect(dnd5ePayload.dnd5e).toEqual(CHARACTER.dnd5e)
    expect(dnd5ePayload.offworlders).toBeUndefined()

    const offworldersPayload = buildPayload(OFFWORLDERS_SYSTEM_TYPE, CHARACTER)
    expect(offworldersPayload.offworlders).toEqual(CHARACTER.offworlders)
    expect(offworldersPayload.dnd5e).toBeUndefined()
  })

  it('creates a system-less character without attaching any system block', () => {
    const payload = buildPayload('', { ...CHARACTER, systemType: '' })

    expect(payload.systemType).toBeNull()
    expect(payload.dnd5e).toBeUndefined()
    expect(payload.offworlders).toBeUndefined()
    // The generic core fields are still sent.
    expect(payload).toMatchObject({
      name: CHARACTER.name,
      notes: CHARACTER.notes,
      appearance: CHARACTER.appearance,
      backstory: CHARACTER.backstory,
      privateBackstory: CHARACTER.privateBackstory,
    })
  })
})

describe('SYSTEM_FORM_OPTIONS', () => {
  it('offers "no system" first and never leaks into the empty data blocks', () => {
    expect(SYSTEM_FORM_OPTIONS[0]).toEqual({ id: '', label: 'No system' })

    // The "no system" choice has no data block, so the form model must not grow
    // a bogus third key for it.
    expect(Object.keys(createEmptyCharacterBlocks()).sort()).toEqual(['dnd5e', 'offworlders'])
  })
})

describe('characterSystemLabel', () => {
  it('labels a known system', () => {
    expect(characterSystemLabel(DND5E_SYSTEM_TYPE)).toBe('5e')
    expect(characterSystemLabel(OFFWORLDERS_SYSTEM_TYPE)).toBe('Offworlders')
  })

  it('labels a character with no system instead of printing null', () => {
    expect(characterSystemLabel(null)).toBe('No system')
    expect(characterSystemLabel(undefined)).toBe('No system')
    expect(characterSystemLabel('')).toBe('No system')
  })

  it('shows an unknown-but-set system id as-is', () => {
    expect(characterSystemLabel('FATE')).toBe('FATE')
  })
})
