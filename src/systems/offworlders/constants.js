/**
 * Offworlders system constants and helpers.
 * Pure data/functions — no Vue or store dependencies.
 *
 * Offworlders is a rules-light sci-fi RPG. Attributes range from -1 to +3,
 * Armor from 0 to 3, Health is derived as `max(1, 12 + strength + agility)`,
 * and Armor is derived from the worn armor items.
 */

export const OFFWORLDERS_SYSTEM_TYPE = 'OFFWORLDERS'

/** The four playable classes ("roles"). */
export const OFFWORLDERS_CLASSES = ['Geek', 'Outlaw', 'Psychic', 'Warrior']

/** Attribute keys, in the order they appear on the character sheet. */
export const OFFWORLDERS_ATTRIBUTES = ['strength', 'agility', 'intelligence', 'willpower']

export const OFFWORLDERS_ATTRIBUTE_MIN = -1
export const OFFWORLDERS_ATTRIBUTE_MAX = 3
export const OFFWORLDERS_ARMOR_MAX = 3

/** One thin line of rules text per attribute (used by the on-demand info panel). */
export const OFFWORLDERS_ATTRIBUTE_DESCRIPTIONS = {
  strength: 'Raw physical power — lifting, melee, and shrugging off punishment.',
  agility: 'Coordination and reflexes — dodging, aiming, and piloting.',
  intelligence: 'Reasoning and knowledge — science, tech, and deduction.',
  willpower: 'Mental fortitude and psionic potential — focusing and resisting.',
}

/** The four numbers a starting character assigns, one each, in any order (p.6). */
export const OFFWORLDERS_STANDARD_ARRAY = [2, 1, 0, -1]

/** Supply is always capped at 3 in Offworlders (p.11), regardless of advancement. */
export const OFFWORLDERS_SUPPLY_MAX = 3

/** A starting character begins with 3 Supply, 3 Credits and one light weapon (p.6). */
export const OFFWORLDERS_STARTING_SUPPLY = 3
export const OFFWORLDERS_STARTING_CREDITS = 3

/** Chargen choice (p.6): take this many extra Credits instead of Light armor + a 2nd weapon. */
export const OFFWORLDERS_CREDITS_ALTERNATIVE = 7

/**
 * The canonical skill list (p.5). Skills are binary — a PC either has one or
 * doesn't. This is a convenience, not a closed set: players may add custom
 * skills, so any stored value is preserved on load.
 */
export const OFFWORLDERS_SKILLS = [
  'Athletics',
  'Culture',
  'Manipulation',
  'Pilot',
  'Science',
  'Sneak',
  'Survival',
  'Tech',
]

/** One thin line of rules text per skill (used for on-demand info popovers). */
export const OFFWORLDERS_SKILL_DESCRIPTIONS = {
  Athletics: 'Running, climbing, jumping, swimming, and similar feats.',
  Culture: 'Knowledge of people, places, etiquette, and history across many worlds.',
  Manipulation: 'Getting others to do what you want through lying, charm, or coercion.',
  Pilot: 'Controlling vehicles, from starships and speeders to motorboats and bicycles.',
  Science: 'Biology, physics, chemistry, and the like.',
  Sneak: 'Passing unseen, sleight of hand, picking pockets.',
  Survival: 'Finding food, air, shelter, and directions in hostile environments.',
  Tech: 'Computer software and complex engineering.',
}

/**
 * Class abilities (pp.8-9). Offered as suggestions once a class is chosen;
 * custom abilities are also allowed. Six per class.
 */
export const OFFWORLDERS_ABILITIES = {
  Geek: ['Analytical', 'Chemist', 'Drone Controller', 'Hijack', 'Medic', 'Polymath'],
  Outlaw: ['Cheap Shot', 'Ghost', 'Lucky', 'Reckless', 'Shoot First', 'Smuggle'],
  Psychic: ['Blast', 'Force Wall', 'Jump', 'Premonition', 'Scanner', 'Telekinesis'],
  Warrior: ['Brute', 'Dead Eye', 'Hardy', 'Heavy Lifting', 'Unstoppable', "Veteran's Instincts"],
}

/** One thin line of rules text per ability (used for on-demand info popovers). */
export const OFFWORLDERS_ABILITY_DESCRIPTIONS = {
  Analytical:
    'On a new situation, area, or character you may ask the GM one simple question; they answer honestly if you could perceive it.',
  Chemist:
    'Spend 1 Supply to produce a single dose of a medicine, chemical, poison, or biological agent (agree its effects with the GM).',
  'Drone Controller':
    'You have a small flying drone you control remotely and perceive through; rebuild it in a few days of downtime if lost.',
  Hijack: 'Remotely take over any electronic machine or computer you can see (roll with Intelligence).',
  Medic: 'First aid heals +2 extra Health; allies who rest in your presence roll 1D6 and heal that much extra.',
  Polymath: 'Get a third skill.',

  'Cheap Shot':
    'Attack an unaware or surprised enemy as though skilled (you may reroll one die); on a success, deal maximum weapon damage, ignoring armor.',
  Ghost: 'If you hold still in a hiding spot, no one finds you until you reveal yourself.',
  Lucky:
    'Once per session, turn a miss (6-) into a partial success (7-9), or a partial success into a full success (10+).',
  Reckless: 'Charging into danger without regard for safety grants +1 to your next roll.',
  'Shoot First': 'You cannot be surprised, and you always act first in a fight.',
  Smuggle: 'Anything you hide somewhere plausible cannot be found.',

  Blast: 'Use your psychic powers as a ranged weapon: 1D6+1 damage to a nearby target (roll with Willpower).',
  'Force Wall':
    'While concentrating on nothing else, create a solid psychic barrier up to 10x10 feet; roll Willpower to hold it under sustained stress.',
  Jump: 'Once per scene, teleport instantly to a nearby location you can see.',
  Premonition: 'Once per day, ask the GM the likely outcome of an immediate action; they answer honestly.',
  Scanner: 'Read surface emotions; roll Intelligence to reach deeper thoughts or specific information.',
  Telekinesis: 'Easily move small objects with your mind; larger or very precise movement is difficult (the GM decides).',

  Brute: 'Deal +2 damage with melee weapons.',
  'Dead Eye': 'Deal +2 damage with ranged weapons.',
  Hardy: 'Add 4 to your Health.',
  'Heavy Lifting': 'Move deftly and without penalty while using heavy weapons and armor.',
  Unstoppable: 'You have +1 armor at all times.',
  "Veteran's Instincts": 'Once per battle, reroll a damage die — one you deal or one dealt to you.',
}

/**
 * Passive Vitals bonuses granted by abilities (p.9). Only abilities with a
 * permanent effect on the character sheet are listed; situational ones (extra
 * damage, rerolls, hiding, …) are applied at the table and never stored.
 * Keys must match the names in {@link OFFWORLDERS_ABILITIES}.
 */
export const OFFWORLDERS_ABILITY_EFFECTS = {
  Hardy: { health: 4 },
  Unstoppable: { armor: 1 },
}

/**
 * Presentation-only hints per class: a short blurb and the skills the official
 * example crew used (p.7). These are SUGGESTIONS — the rules let any class take
 * any skills, and experienced players may ignore classes entirely (p.6).
 */
export const OFFWORLDERS_CLASS_INFO = {
  Geek: {
    blurb:
      'Doctors, scientists, and technicians who bend technology, heal allies, and offer insight.',
    suggestedSkills: ['Science', 'Tech'],
  },
  Outlaw: {
    blurb: 'Smugglers, scoundrels, and jacks-of-all-trades — sneaky, lucky, or ruthless.',
    suggestedSkills: ['Sneak', 'Survival'],
  },
  Psychic: {
    blurb: 'Wielders of supernatural mental powers that manipulate the world and read minds.',
    suggestedSkills: ['Manipulation', 'Culture'],
  },
  Warrior: {
    blurb: 'Soldiers and bounty hunters whose abilities all grant an edge in combat.',
    suggestedSkills: ['Athletics', 'Pilot'],
  },
}

/** Weapon categories (p.12). Damage/cost are reference only; automation is Step 1.5. */
export const OFFWORLDERS_WEAPON_TYPES = [
  { name: 'Unarmed', damage: 'Lower of 2D6', cost: 0, notes: 'Kicks, punches.' },
  { name: 'Light', damage: '1D6', cost: 1, notes: 'Pistols, knives. Easily hidden.' },
  { name: 'Medium', damage: '1D6+1', cost: 2, notes: 'Rifles, shotguns, swords.' },
  { name: 'Heavy', damage: '1D6+2', cost: 5, notes: 'Plasma cannons, sniper rifles, huge swords. Heavy.' },
]

/** Armor categories (p.12). Rating is the damage subtracted from incoming hits. */
export const OFFWORLDERS_ARMOR_TYPES = [
  { name: 'Light', rating: 1, cost: 3, notes: '' },
  { name: 'Heavy', rating: 2, cost: 6, notes: 'Heavy.' },
  {
    name: 'Assault',
    rating: 3,
    cost: 40,
    notes: 'Heavy. Includes several hours of air supply and a built-in heavy weapon.',
  },
]

/** Armor rating for a type name (unknown / '' → 0). */
export function armorRatingForType(type) {
  return OFFWORLDERS_ARMOR_TYPES.find((armor) => armor.name === type)?.rating ?? 0
}

/**
 * Suggested skills for a class, in display order.
 * @param {string} characterClass
 * @returns {string[]}
 */
export function suggestedSkillsForClass(characterClass) {
  return OFFWORLDERS_CLASS_INFO[characterClass]?.suggestedSkills ?? []
}

/**
 * Maximum Health is derived from Strength and Agility, plus the passive bonuses
 * granted by abilities and any manual ± (the Health Misc field), with a floor of 1.
 * @param {{strength?: number, agility?: number}|null|undefined} stats
 * @param {number} [modifier=0] passive ability bonuses + manual ± adjustment
 * @returns {number}
 */
export function deriveHealth(stats, modifier = 0) {
  const strength = Number(stats?.strength) || 0
  const agility = Number(stats?.agility) || 0
  const bonus = Number(modifier) || 0
  return Math.max(1, 12 + strength + agility + bonus)
}

/**
 * Sum the passive Vitals bonuses from a list of ability entries, together with
 * the names of the abilities that granted them (so the UI can explain the total).
 * Custom/unknown abilities contribute nothing.
 * @param {{name?: string}[]|null|undefined} abilities
 * @returns {{health: number, armor: number, healthSources: string[], armorSources: string[]}}
 */
export function abilityVitalsBonus(abilities) {
  const bonus = { health: 0, armor: 0, healthSources: [], armorSources: [] }
  for (const entry of abilities || []) {
    const effect = OFFWORLDERS_ABILITY_EFFECTS[entry?.name]
    if (!effect) continue
    if (effect.health) {
      bonus.health += effect.health
      bonus.healthSources.push(entry.name)
    }
    if (effect.armor) {
      bonus.armor += effect.armor
      bonus.armorSources.push(entry.name)
    }
  }
  return bonus
}

/**
 * Effective Armor rating: the highest `armorRating` among the worn `kind: 'armor'`
 * items (p.12) plus any passive bonus from abilities, clamped to
 * 0..OFFWORLDERS_ARMOR_MAX.
 * @param {{kind?: string, armorRating?: number}[]|null|undefined} items
 * @param {number} [bonus=0] passive bonus summed from the selected abilities
 *   (not user-entered) — e.g. Unstoppable's +1 armor
 * @returns {number}
 */
export function deriveArmor(items, bonus = 0) {
  const ratings = (items || [])
    .filter((item) => item?.kind === 'armor')
    .map((item) => Number(item?.armorRating) || 0)
  const worn = ratings.length === 0 ? 0 : Math.max(0, ...ratings)
  return Math.max(0, Math.min(OFFWORLDERS_ARMOR_MAX, worn + (Number(bonus) || 0)))
}

/**
 * Count how many of the standard array values (+2, +1, 0, -1) the given stats
 * use. Each array entry can only be matched once, so this is the number of
 * attributes that still line up with a valid starting spread.
 * @param {{strength?: number, agility?: number, intelligence?: number, willpower?: number}|null|undefined} stats
 * @returns {{used: number, total: number}}
 */
export function standardArrayUsage(stats) {
  const pool = [...OFFWORLDERS_STANDARD_ARRAY]
  const values = OFFWORLDERS_ATTRIBUTES.map((attr) => Number(stats?.[attr]) || 0)
  let used = 0
  for (const value of values) {
    const index = pool.indexOf(value)
    if (index !== -1) {
      used += 1
      pool.splice(index, 1)
    }
  }
  return { used, total: OFFWORLDERS_STANDARD_ARRAY.length }
}

/** Item categories. Purely for grouping on the sheet. */
export const OFFWORLDERS_ITEM_KINDS = ['weapon', 'armor', 'item']

/** Display labels for the item categories. */
export const OFFWORLDERS_ITEM_KIND_LABELS = {
  weapon: 'Weapon',
  armor: 'Armor',
  item: 'Item',
}

/** A fresh, empty skill/ability entry (name + optional description). */
export function createEmptyOffworldersEntry() {
  return { name: '', description: '' }
}

/** Normalize a skill/ability entry, upgrading a legacy plain string to an entry. */
export function normalizeOffworldersEntry(entry) {
  const empty = createEmptyOffworldersEntry()
  if (typeof entry === 'string') return { ...empty, name: entry }
  if (!entry || typeof entry !== 'object') return empty
  return { ...empty, ...entry }
}

/**
 * Resolve the description for an entry: the custom description if present,
 * otherwise the canonical catalog text keyed by name.
 */
export function resolveEntryDescription(entry, descriptions) {
  return entry?.description || descriptions?.[entry?.name] || ''
}

/** Toggle a catalog entry (by name) in a skill/ability entry list. */
export function toggleEntry(list, name) {
  return list.some((entry) => entry.name === name)
    ? list.filter((entry) => entry.name !== name)
    : [...list, { name, description: '' }]
}

/** Add a custom entry (name + description), ignoring blanks and duplicates. */
export function addEntry(list, name, description = '') {
  const trimmed = (name ?? '').trim()
  if (!trimmed || list.some((entry) => entry.name === trimmed)) return [...list]
  return [...list, { name: trimmed, description: (description ?? '').trim() }]
}

/** Remove an entry by name. */
export function removeEntry(list, name) {
  return list.filter((entry) => entry.name !== name)
}

/** A fresh, empty free-form inventory entry. */
export function createEmptyOffworldersItem() {
  return {
    name: '',
    kind: 'item',
    damage: '',
    armorRating: 0,
    heavy: false,
    notes: '',
  }
}

/** Normalize a single item coming from the API, filling in defaults. */
export function normalizeOffworldersItem(item) {
  const empty = createEmptyOffworldersItem()
  if (!item || typeof item !== 'object') return empty
  return { ...empty, ...item }
}

/** Default damage die for a legacy weapon type (Light / Medium / Heavy). */
export function damageForWeaponType(type) {
  return OFFWORLDERS_WEAPON_TYPES.find((weapon) => weapon.name === type)?.damage ?? ''
}

/**
 * Convert a legacy Step 1 `gear` block into the free-form `items` list.
 * Mirrors the backend V5 migration so cached / guest data upgrades too.
 * @param {object|null|undefined} gear
 * @returns {object[]}
 */
export function migrateGearToItems(gear) {
  const items = []
  if (!gear) return items
  if (gear.primaryWeapon) {
    items.push({
      ...createEmptyOffworldersItem(),
      name: gear.primaryWeapon,
      kind: 'weapon',
      damage: damageForWeaponType(gear.primaryWeaponType),
    })
  }
  if (gear.secondaryWeapon) {
    items.push({
      ...createEmptyOffworldersItem(),
      name: gear.secondaryWeapon,
      kind: 'weapon',
      damage: damageForWeaponType(gear.secondaryWeaponType),
    })
  }
  if (gear.armorType) {
    items.push({
      ...createEmptyOffworldersItem(),
      name: `${gear.armorType} armor`,
      kind: 'armor',
      armorRating: armorRatingForType(gear.armorType),
      heavy: gear.armorType === 'Heavy' || gear.armorType === 'Assault',
    })
  }
  if (gear.notes) {
    items.push({ ...createEmptyOffworldersItem(), name: 'Gear notes', kind: 'item', notes: gear.notes })
  }
  return items
}

/**
 * Build a fresh, valid Offworlders data block for a new character.
 * @returns {object}
 */
export function createEmptyOffworldersData() {
  return {
    characterClass: '',
    species: '',
    look: '',
    xp: 0,
    health: 12,
    currentHealth: 12,
    healthModifier: 0,
    armor: 0,
    supply: OFFWORLDERS_STARTING_SUPPLY,
    supplyMax: OFFWORLDERS_SUPPLY_MAX,
    credits: OFFWORLDERS_STARTING_CREDITS,
    stats: {
      strength: 0,
      agility: 0,
      intelligence: 0,
      willpower: 0,
    },
    skills: [],
    abilities: [],
    items: [],
  }
}

/**
 * Normalize an Offworlders data block coming from the API, filling in defaults
 * so the UI never has to deal with missing nested properties.
 * @param {object|null|undefined} data
 * @returns {object}
 */
export function normalizeOffworldersData(data) {
  const empty = createEmptyOffworldersData()
  if (!data) return empty
  // Prefer explicit items; otherwise migrate a legacy `gear` block from Step 1.
  let items = Array.isArray(data.items) ? data.items.map(normalizeOffworldersItem) : []
  if (items.length === 0 && data.gear) {
    items = migrateGearToItems(data.gear)
  }

  const normalized = {
    ...empty,
    ...data,
    // Supply is always capped at 3 (p.11); ignore any stored/derived value.
    supplyMax: OFFWORLDERS_SUPPLY_MAX,
    stats: { ...empty.stats, ...(data.stats || {}) },
    skills: Array.isArray(data.skills) ? data.skills.map(normalizeOffworldersEntry) : [],
    abilities: Array.isArray(data.abilities) ? data.abilities.map(normalizeOffworldersEntry) : [],
    items,
  }
  delete normalized.gear
  return normalized
}

/**
 * Add a trimmed value to a string list, ignoring blanks and duplicates.
 * @param {string[]} list
 * @param {string} value
 * @returns {string[]} a new list
 */
export function addListValue(list, value) {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return [...list]
  if (list.includes(trimmed)) return [...list]
  return [...list, trimmed]
}

/**
 * Remove the first occurrence of a value from a string list.
 * @param {string[]} list
 * @param {string} value
 * @returns {string[]} a new list
 */
export function removeListValue(list, value) {
  return list.filter((entry) => entry !== value)
}

/**
 * Toggle a value's membership in a string list.
 * @param {string[]} list
 * @param {string} value
 * @returns {string[]} a new list
 */
export function toggleListValue(list, value) {
  return list.includes(value) ? removeListValue(list, value) : addListValue(list, value)
}