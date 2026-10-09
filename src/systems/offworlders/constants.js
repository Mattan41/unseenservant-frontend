/**
 * Offworlders system constants and helpers.
 * Pure data/functions — no Vue or store dependencies.
 *
 * Offworlders is a rules-light sci-fi RPG. Attributes range from -1 to +3,
 * Armor from 0 to 3, Health is derived as `max(1, 12 + strength + agility)`.
 */

export const OFFWORLDERS_SYSTEM_TYPE = 'OFFWORLDERS'

/** The four playable classes ("roles"). */
export const OFFWORLDERS_CLASSES = ['Geek', 'Outlaw', 'Psychic', 'Warrior']

/** Attribute keys, in the order they appear on the character sheet. */
export const OFFWORLDERS_ATTRIBUTES = ['strength', 'agility', 'intelligence', 'willpower']

export const OFFWORLDERS_ATTRIBUTE_MIN = -1
export const OFFWORLDERS_ATTRIBUTE_MAX = 3
export const OFFWORLDERS_ARMOR_MAX = 3

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
 * Health is derived from Strength and Agility, with a floor of 1.
 * @param {{strength?: number, agility?: number}|null|undefined} stats
 * @returns {number}
 */
export function deriveHealth(stats) {
  const strength = Number(stats?.strength) || 0
  const agility = Number(stats?.agility) || 0
  return Math.max(1, 12 + strength + agility)
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

/** A fresh gear block: one light weapon by default, no armor or extras. */
export function createEmptyOffworldersGear() {
  return {
    primaryWeapon: '',
    primaryWeaponType: 'Light',
    secondaryWeapon: '',
    secondaryWeaponType: '',
    armorType: '',
    notes: '',
  }
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
    gear: createEmptyOffworldersGear(),
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
  return {
    ...empty,
    ...data,
    // Supply is always capped at 3 (p.11); ignore any stored/derived value.
    supplyMax: OFFWORLDERS_SUPPLY_MAX,
    stats: { ...empty.stats, ...(data.stats || {}) },
    skills: Array.isArray(data.skills) ? [...data.skills] : [],
    abilities: Array.isArray(data.abilities) ? [...data.abilities] : [],
    gear: { ...empty.gear, ...(data.gear || {}) },
  }
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