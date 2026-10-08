import { describe, it, expect } from 'vitest'
import {
  normalizeSpell,
  formatSpellLevel,
  formatSchoolName,
  formatComponents,
  getSchoolBadgeClass,
} from '@/systems/dnd5e/spellUtils.js'

describe('normalizeSpell', () => {
  it('normalizes a canonical Open5e v2 spell object', () => {
    const raw = {
      key: 'srd_fireball',
      name: 'Fireball',
      level: 3,
      school: { name: 'Evocation', key: 'evocation' },
      document: { key: 'srd-2014', name: 'System Reference Document 5.1' },
      classes: [{ name: 'Wizard' }],
      desc: 'Boom',
      casting_time: '1 action',
      range_text: '150 feet',
      duration: 'Instantaneous',
      verbal: true,
      somatic: true,
      material: false,
    }

    const spell = normalizeSpell(raw)

    expect(spell.key).toBe('srd_fireball')
    expect(spell.name).toBe('Fireball')
    expect(spell.level).toBe(3)
    expect(spell.levelLabel).toBe('3rd level')
    expect(spell.school).toBe('Evocation')
    expect(spell.sourceLabel).toBe('SRD 5.1')
    expect(spell.classes).toEqual(['Wizard'])
    expect(spell.components).toEqual(['V', 'S'])
  })

  it('treats level 0 as a cantrip and maps numeric range 0 to Touch', () => {
    const spell = normalizeSpell({ key: 'k', name: 'Shillelagh', level: 0, range: 0 })
    expect(spell.levelLabel).toBe('Cantrip')
    expect(spell.range).toBe('Touch')
  })

  it('falls back to a safe name when the raw spell has none', () => {
    expect(normalizeSpell({}).name).toBe('Unknown Spell')
  })
})

describe('formatSpellLevel', () => {
  it('formats cantrips and level suffixes', () => {
    expect(formatSpellLevel(0)).toBe('Cantrip')
    expect(formatSpellLevel(1)).toBe('1st level')
    expect(formatSpellLevel(2)).toBe('2nd level')
    expect(formatSpellLevel(3)).toBe('3rd level')
    expect(formatSpellLevel(5)).toBe('5th level')
  })
})

describe('formatSchoolName / formatComponents', () => {
  it('resolves school names from strings or objects', () => {
    expect(formatSchoolName('Evocation')).toBe('Evocation')
    expect(formatSchoolName({ name: 'Abjuration' })).toBe('Abjuration')
    expect(formatSchoolName(null)).toBe('')
  })

  it('joins component arrays', () => {
    expect(formatComponents(['V', 'S', 'M'])).toBe('V, S, M')
    expect(formatComponents('V, S')).toBe('V, S')
    expect(formatComponents(null)).toBe('')
  })
})

describe('getSchoolBadgeClass', () => {
  it('maps known schools and falls back for unknown ones', () => {
    expect(getSchoolBadgeClass('Evocation')).toBe('badge-danger')
    expect(getSchoolBadgeClass('evocation')).toBe('badge-danger')
    expect(getSchoolBadgeClass('Unknown')).toBe('badge-muted')
  })
})
