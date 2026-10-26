/**
 * demoData.js
 * Static seed data for Guest Mode with dynamic timestamps.
 * guest_demo is the current user in Guest Mode, guest_player_1-5 are demo users.
 *
 * The demo user is an ordinary account: guest mode serves no `/api/admin/**`
 * endpoints, and Settings → Admin is unreachable during a guest session.
 */

export const guestUser = {
  id: 'guest_demo',
  username: 'guest@demo.local',
  displayName: 'Guest Demo',
  email: 'guest@demo.local',
  role: 'USER',
}

export const guestUsers = [
  {
    id: 'guest_player_1',
    displayName: 'User1',
    username: 'User1',
    email: 'user1@demo.local',
    role: 'USER',
  },
  {
    id: 'guest_player_2',
    displayName: 'User2',
    username: 'User2',
    email: 'user2@demo.local',
    role: 'USER',
  },
  {
    id: 'guest_player_3',
    displayName: 'User3',
    username: 'User3',
    email: 'user3@demo.local',
    role: 'USER',
  },
  {
    id: 'guest_player_4',
    displayName: 'User4',
    username: 'User4',
    email: 'user4@demo.local',
    role: 'USER',
  },
  {
    id: 'guest_player_5',
    displayName: 'User5',
    username: 'User5',
    email: 'user5@demo.local',
    role: 'USER',
  },
]

export const guestCharacters = [
  {
    id: 'guest_char_1',
    ownerId: 'guest_player_1',
    campaignId: 'guest_campaign_1',
    name: 'Gandalf',
    systemType: 'DND5E',
    notes: '',
    backstory: 'A wandering wizard who arrives *exactly* when he means to.',
    privateBackstory: 'Secretly searching for the missing pages of a forbidden tome.',
    avatarUrl: '/defaultCharacter.svg',
    imageUrls: [],
    dnd5e: {
      level: 10,
      characterClass: 'Wizard',
      race: 'Human',
      hitPoints: 0,
      armorClass: 10,
      stats: {
        strength: 11,
        dexterity: 11,
        constitution: 11,
        intelligence: 19,
        wisdom: 15,
        charisma: 13,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'guest_char_2',
    ownerId: 'guest_player_2',
    campaignId: 'guest_campaign_1',
    name: 'Frodo',
    systemType: 'DND5E',
    notes: '',
    avatarUrl: '/defaultCharacter.svg',
    imageUrls: [],
    dnd5e: {
      level: 8,
      characterClass: 'Rogue',
      race: 'Halfling',
      hitPoints: 0,
      armorClass: 10,
      stats: {
        strength: 10,
        dexterity: 18,
        constitution: 12,
        intelligence: 12,
        wisdom: 13,
        charisma: 10,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'guest_char_3',
    ownerId: 'guest_player_3',
    campaignId: 'guest_campaign_1',
    name: 'Bilbo',
    systemType: 'DND5E',
    notes: '',
    avatarUrl: '/defaultCharacter.svg',
    imageUrls: [],
    dnd5e: {
      level: 3,
      characterClass: 'Rogue',
      race: 'Halfling',
      hitPoints: 0,
      armorClass: 10,
      stats: {
        strength: 9,
        dexterity: 16,
        constitution: 11,
        intelligence: 12,
        wisdom: 12,
        charisma: 14,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'guest_char_4',
    ownerId: 'guest_demo',
    campaignId: 'guest_campaign_2',
    name: 'Rincewind',
    systemType: 'DND5E',
    notes: '',
    avatarUrl: '/defaultCharacter.svg',
    imageUrls: [],
    dnd5e: {
      level: 1,
      characterClass: 'Wizard',
      race: 'Human',
      hitPoints: 0,
      armorClass: 10,
      stats: {
        strength: 9,
        dexterity: 9,
        constitution: 9,
        intelligence: 14,
        wisdom: 9,
        charisma: 9,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    spells: [
      {
        key: 'deepm_unseen-strangler',
        name: 'Unseen Strangler',
        level: 3,
        levelLabel: '3rd level',
        school: 'Conjuration',
        schoolKey: 'conjuration',
        casting_time: 'action',
        range: '30 feet',
        duration: '8 hours',
        components: ['V', 'S', 'M'],
        materialText: 'a pinch of sulfur and a live rodent',
        verbal: true,
        somatic: true,
        material: true,
        concentration: false,
        ritual: true,
        higher_level: '',
        desc: "You conjure an immaterial, tentacled aberration in an unoccupied space you can see within range, and you specify a password that the phantom recognizes. The entity remains where you conjured it until the spell ends, until you dismiss it as an action, or until you move more than 80 feet from it.\n\nThe strangler is invisible to all creatures except you, and it can't be harmed. When a Small or larger creature approaches within 30 feet of it without speaking the password that you specified, the strangler starts whispering your name. This whispering is always audible to you, regardless of other sounds in the area, as long as you're conscious. The strangler sees invisible creatures and can see into the Ethereal Plane. It ignores illusions.\n\nIf any creatures hostile to you are within 5 feet of the strangler at the start of your turn, the strangler attacks one of them with a tentacle. It makes a melee weapon attack with a bonus equal to your spellcasting ability modifier + your proficiency bonus. On a hit, it deals 3d6 bludgeoning damage, and a Large or smaller creature is grappled (escape DC = your spellcasting ability modifier + your proficiency bonus). Until this grapple ends, the target is restrained, and the strangler can't attack another target. If the strangler scores a critical hit, the target begins to suffocate and can't speak until the grapple ends.",
        classes: [],
        documentKey: 'deepm',
        documentName: 'Deep Magic for 5th Edition',
        sourceLabel: 'Deep Magic',
        isHomebrew: false,
      },
    ],
  },
  {
    id: 'guest_char_5',
    ownerId: 'guest_demo',
    campaignId: 'guest_campaign_3',
    name: 'Gimli',
    systemType: 'DND5E',
    notes: '',
    avatarUrl: '/defaultCharacter.svg',
    imageUrls: [],
    dnd5e: {
      level: 5,
      characterClass: 'Fighter',
      race: 'Dwarf',
      hitPoints: 0,
      armorClass: 10,
      stats: {
        strength: 18,
        dexterity: 10,
        constitution: 16,
        intelligence: 8,
        wisdom: 10,
        charisma: 8,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    spells: [
      {
        key: 'srd_unseen-servant',
        name: 'Unseen Servant',
        level: 1,
        levelLabel: '1st level',
        school: 'Conjuration',
        schoolKey: 'conjuration',
        casting_time: 'action',
        range: '60 feet',
        duration: '1 hour',
        components: ['V', 'S', 'M'],
        materialText: 'A piece of string and a bit of wood.',
        verbal: true,
        somatic: true,
        material: true,
        concentration: false,
        ritual: true,
        higher_level: '',
        desc: "This spell creates an invisible, mindless, shapeless force that performs simple tasks at your command until the spell ends. The servant springs into existence in an unoccupied space on the ground within range. It has AC 10, 1 hit point, and a Strength of 2, and it can't attack. If it drops to 0 hit points, the spell ends. Once on each of your turns as a bonus action, you can mentally command the servant to move up to 15 feet and interact with an object. The servant can perform simple tasks that a human servant could do, such as fetching things, cleaning, mending, folding clothes, lighting fires, serving food, and pouring wind. Once you give the command, the servant performs the task to the best of its ability until it completes the task, then waits for your next command. If you command the servant to perform a task that would move it more than 60 feet away from you, the spell ends.",
        classes: ['Bard', 'Warlock', 'Wizard'],
        documentKey: 'srd-2014',
        documentName: 'System Reference Document 5.1',
        sourceLabel: 'SRD 5.1',
        isHomebrew: false,
      },
    ],
  },
  {
    id: 'guest_char_6',
    ownerId: 'guest_demo',
    campaignId: null,
    name: 'Aragorn',
    systemType: 'DND5E',
    notes: '',
    avatarUrl: '/defaultCharacter.svg',
    imageUrls: [],
    dnd5e: {
      level: 5,
      characterClass: 'Ranger',
      race: 'Human',
      hitPoints: 0,
      armorClass: 10,
      stats: {
        strength: 14,
        dexterity: 16,
        constitution: 13,
        intelligence: 12,
        wisdom: 13,
        charisma: 11,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    spells: [
      {
        key: 'srd_unseen-servant',
        name: 'Unseen Servant',
        level: 1,
        levelLabel: '1st level',
        school: 'Conjuration',
        schoolKey: 'conjuration',
        casting_time: 'action',
        range: '60 feet',
        duration: '1 hour',
        components: ['V', 'S', 'M'],
        materialText: 'A piece of string and a bit of wood.',
        verbal: true,
        somatic: true,
        material: true,
        concentration: false,
        ritual: true,
        higher_level: '',
        desc: "This spell creates an invisible, mindless, shapeless force that performs simple tasks at your command until the spell ends. The servant springs into existence in an unoccupied space on the ground within range. It has AC 10, 1 hit point, and a Strength of 2, and it can't attack. If it drops to 0 hit points, the spell ends. Once on each of your turns as a bonus action, you can mentally command the servant to move up to 15 feet and interact with an object. The servant can perform simple tasks that a human servant could do, such as fetching things, cleaning, mending, folding clothes, lighting fires, serving food, and pouring wind. Once you give the command, the servant performs the task to the best of its ability until it completes the task, then waits for your next command. If you command the servant to perform a task that would move it more than 60 feet away from you, the spell ends.",
        classes: ['Bard', 'Warlock', 'Wizard'],
        documentKey: 'srd-2014',
        documentName: 'System Reference Document 5.1',
        sourceLabel: 'SRD 5.1',
        isHomebrew: false,
      },
    ],
  },
  {
    id: 'guest_char_7',
    ownerId: 'guest_demo',
    campaignId: 'guest_campaign_4',
    name: 'Vex',
    systemType: 'OFFWORLDERS',
    notes: `**The *Last Word*** — a stolen courier ship.

- Cargo: whatever pays, no questions asked
- Debt: the Syndicate still wants her
- Rule: never file a flight plan`,
    appearance: 'Sharp-eyed, patched flight jacket. *Always* carries a spare power cell.',
    backstory:
      'Vex learned to fly before she could drive, running cargo through the Fringe for anyone who paid.',
    privateBackstory:
      'She is being hunted by a syndicate she double-crossed, and never files a flight plan.',
    avatarUrl: '/default-scifi-Character.svg',
    imageUrls: [],
    offworlders: {
      characterClass: 'Outlaw',
      species: 'Human',
      xp: 3,
      health: 16,
      currentHealth: 16,
      healthModifier: 0,
      armor: 1,
      supply: 2,
      supplyMax: 3,
      credits: 10,
      stats: {
        strength: 1,
        agility: 3,
        intelligence: 1,
        willpower: 0,
      },
      skills: [
        { name: 'Pilot', description: '' },
        { name: 'Sneak', description: '' },
        { name: 'Tech', description: '' },
      ],
      abilities: [
        { name: 'Lucky', description: '' },
        { name: 'Smuggle', description: '' },
        { name: 'Shoot First', description: '' },
      ],
      weapons: [
        { type: 'Light', description: 'Snubnosed revolver' },
        { type: 'Light', description: 'Butterfly knife' },
      ],
      items: [{ name: 'Band t-shirts', description: 'Rotating collection of band t-shirts.' }],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'guest_char_8',
    ownerId: 'guest_player_1',
    campaignId: 'guest_campaign_4',
    name: 'Kestrel',
    systemType: 'OFFWORLDERS',
    // The note and the gallery image are what the backend's V4 migration moves
    // onto a participant's character (a crew entry used to be a row of its own),
    // so Guest Demo shows a crew card the way a migrated table looks. The image
    // stands in for an upload: guest mode has nowhere to store a file.
    notes:
      'Ex-military. Talks little, shoots straight.\n\nHandles the dockside hand-offs and keeps the manifest clean.',
    appearance: 'Shaved head, faded unit tattoos.',
    backstory: 'Walked away from the war with a rifle and no plan.',
    avatarUrl: '/default-scifi-Character.svg',
    imageUrls: ['/default-scifi-campaign.svg'],
    offworlders: {
      characterClass: 'Warrior',
      species: 'Human',
      xp: 2,
      health: 16,
      currentHealth: 12,
      healthModifier: 0,
      armor: 2,
      supply: 3,
      supplyMax: 3,
      credits: 4,
      stats: {
        strength: 3,
        agility: 1,
        intelligence: 0,
        willpower: 1,
      },
      skills: [
        { name: 'Athletics', description: '' },
        { name: 'Survival', description: '' },
      ],
      abilities: [
        { name: 'Dead Eye', description: '' },
        { name: 'Heavy Lifting', description: '' },
      ],
      weapons: [{ type: 'Heavy', description: 'Battle rifle' }],
      items: [{ name: 'Combat knife', description: '' }],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'guest_char_9',
    ownerId: 'guest_player_2',
    campaignId: 'guest_campaign_4',
    name: 'Doc',
    systemType: 'OFFWORLDERS',
    notes: 'Patch-you-up medic with a sideline in forged manifests.',
    appearance: 'Wire-rimmed glasses, an ever-present medkit.',
    backstory: 'Bought a medical licence that does not actually exist.',
    avatarUrl: '/default-scifi-Character.svg',
    imageUrls: [],
    offworlders: {
      characterClass: 'Geek',
      species: 'Human',
      xp: 1,
      health: 13,
      currentHealth: 13,
      healthModifier: 0,
      armor: 0,
      supply: 3,
      supplyMax: 3,
      credits: 6,
      stats: {
        strength: 0,
        agility: 1,
        intelligence: 3,
        willpower: 0,
      },
      skills: [
        { name: 'Science', description: '' },
        { name: 'Tech', description: '' },
      ],
      abilities: [
        { name: 'Medic', description: '' },
        { name: 'Chemist', description: '' },
      ],
      weapons: [{ type: 'Light', description: 'Holdout pistol' }],
      items: [{ name: 'Medkit', description: 'Field surgery kit.' }],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const guestCampaigns = [
  {
    id: 'guest_campaign_1',
    name: 'Curse of Strahd',
    description: `Barovia is a gothic-horror sandbox: a cursed valley ruled by Count Strahd von Zarovich, where every village keeps a secret and every road leads deeper into the mist.`,
    worldLore: `Under the light of the full moon, the small town of Barovia is plagued by the evil forces of Count Strahd von Zarovich. Shadows twist through cobblestone streets and forgotten forests, as villagers lock their doors and whisper prayers against the night. Ancient secrets stir beneath the mist, hungry for the return of past glories. The cries of the oppressed echo through the valleys, while Strahd’s undead minions roam freely, enforcing the will of their lord. Hope is a rare commodity in Barovia, and the line between friend and foe is often blurred. Only the bravest souls dare to stand against the darkness and confront the mysteries it conceals.

What Players Can Expect:

Dark Gothic Horror: Prepare for a campaign drenched in atmosphere, fear, and suspense. Expect themes of dread, moral ambiguity, and difficult choices as you navigate a cursed land.
Rich Storytelling: The narrative will focus heavily on character-driven plots, personal backstory integration, and meaningful interactions with both allies and enemies.
Challenging Encounters: Combat will range from desperate skirmishes against undead hordes to high-stakes battles with cunning adversaries. Prepare to use both wit and steel.
Investigation & Problem Solving: Mysteries abound in Barovia, from cryptic prophecies to hidden motives. Players will need to question, explore, and think creatively.
Roleplay Opportunities: Interact with a variety of unique NPCs, each with their own agendas and secrets. Your decisions will shape the fate of Barovia.

Table Guidelines:

Respect & Inclusivity: This campaign is a safe space for everyone. Discrimination, harassment, and exclusion will not be tolerated. Respect each other’s boundaries and perspectives.
Session Pacing: We aim for a balance between action, exploration, and roleplay. Voice any preferences to ensure everyone has fun.
Communication: If you’re ever uncomfortable with a scene, mechanic, or topic, please let the DM know—either in-game or privately. We use the X-card system for safety.
Punctuality: Please arrive on time and notify the group if you’ll be late or absent.
- **Game Etiquette:** Pay attention when it’s not your turn, avoid distracting side conversations, and minimize phone use during sessions.
- **Have Fun:** Remember, the goal is collective storytelling and enjoyment. Support your fellow players and embrace the horror-adventure together!`,
    imageUrl: 'https://www.dndbeyond.com/attachments/8/220/cos-cover-4k.jpg',
    primarySystem: 'DND5E',
    // The one demo campaign that ships with the planner switched on. Guest Demo
    // serves no add-on endpoint, so this is the whole story of "which add-ons a demo
    // campaign has" (see docs/ARCHITECTURE.MD → Guest Mode Limitations).
    addons: ['planner'],
    privateDescription:
      'Strahd is not merely toying with the party: he believes one of them carries the reincarnated soul of **Tatyana**.\n\nThe amber sarcophagi in the catacombs each hold a dark vestige that will bargain for freedom.',
    ownerId: 'guest_demo',
    participants: [
      { id: 'guest_demo', nickname: 'You - Guest', role: 'GM' },
      { id: 'guest_player_1', nickname: 'User1', role: 'PLAYER' },
      { id: 'guest_player_2', nickname: 'User2', role: 'PLAYER' },
      { id: 'guest_player_3', nickname: 'User3', role: 'PLAYER' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'guest_campaign_2',
    name: 'Neptunus',
    description: `A city mystery: recover the stolen Amulet of Taharka from a university town of scholars, thieves, and shifting alliances.`,
    worldLore: `The University of Lundenwic has been robbed of its prized artifact, the Amulet of Taharka. The players are hired to track down the thief and retrieve the amulet.

                 Mystery & Investigation: Dive deep into a campaign filled with deception, riddles, and puzzles. Finding the thief will require sharp minds and keen eyes for detail.
                 Urban Adventure: Explore a vibrant city teeming with intrigue, hidden societies, eccentric professors, and shifting alliances.
                 Roleplay & Social Encounters: Forge alliances, interrogate suspects, and navigate the political landscape of scholars, nobles, and underground factions.
                 Skill-Based Challenges: Success will depend not just on combat prowess, but also on investigation, stealth, persuasion, and strategy.
                 Dynamic Consequences: Choices matter—a trusting word or a misstep could change the course of your investigation, and the fate of Lundenwic itself.`,
    imageUrl:
      'https://c4.wallpaperflare.com/wallpaper/925/634/481/league-of-legends-bilgewater-fantasy-art-pirates-wallpaper-preview.jpg',
    primarySystem: 'DND5E',
    ownerId: 'guest_demo',
    participants: [
      { id: 'guest_player_1', nickname: 'User1', role: 'PLAYER' },
      { id: 'guest_demo', nickname: 'You - Guest', role: 'GM' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'guest_campaign_3',
    name: 'Gears of War',
    description: `A heist aboard the Iron Colossus: seize a mysterious cargo before rivals, lawmen, or deadly automata claim it first.`,
    worldLore: `In the age of steam and gears, the Iron Colossus cuts through rugged mountain passes and
                        sprawling industrial cities—an unstoppable marvel of clockwork engineering. Tonight, its
                        armored compartments carry not just passengers and freight, but a mysterious cargo rumored
                        to change the fate of the Empire. As the city’s skyline vanishes in a cloud of smoke,
                        your crew boards the train with one goal: seize the prize before rivals, lawmen,
                        or deadly automata claim it for themselves.

                        Whistles scream, pistons thunder, and the race is on across perilous trestle bridges and volatile territories.
                        Every car holds secrets— cunning adversaries, exotic machinery, and deadly traps.
                        Will you outsmart the authorities, outfight mercenaries, and outpace the opposition,
                        or will the Iron Colossus become your tomb beneath the relentless steam and steel?
                        `,
    imageUrl: 'https://slyflourish.com/images/eberron_warforged.jpg',
    primarySystem: null,
    ownerId: 'guest_demo',
    participants: [
      { id: 'guest_player_1', nickname: 'User1', role: 'GM' },
      { id: 'guest_demo', nickname: 'You - Guest', role: 'PLAYER' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'guest_campaign_4',
    name: 'The Fringe',
    description: `A ragtag crew, a stolen courier ship, and the jobs no one else will take on the lawless edge of known space.`,
    worldLore: `Beyond the core worlds, the Fringe is a scatter of half-charted systems where the law is whoever is holding the gun. You fly the *Null Gravitas* — a courier ship whose papers remember three previous owners it would rather forget — and take the jobs that pay: a sealed crate here, a passenger who will not give a name there.

What Players Can Expect:

Free Traders: No grand destiny — just a crew, a ship, and a debt or two. Every jump is a gamble on fuel, favours, and whether the port authority has been paid off.
Sandbox Sci-Fi: Stations to dock at, systems to chart, factions to cross or court. The crew picks its own trouble.
Leverage Over Firepower: A fast talk, a forged manifest, or a well-placed bribe usually beats a firefight. When it does not, you have guns too.
Crew First: The ship is home. Keeping it flying, fuelled, and out of the impound lot is a game in itself.`,
    imageUrl: '/default-scifi-campaign.svg',
    primarySystem: 'OFFWORLDERS',
    ownerId: 'guest_demo',
    participants: [
      { id: 'guest_demo', nickname: 'You - Guest', role: 'GM' },
      { id: 'guest_player_1', nickname: 'User1', role: 'PLAYER' },
      { id: 'guest_player_2', nickname: 'User2', role: 'PLAYER' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const guestShips = [
  {
    id: 'guest_ship_1',
    campaignId: 'guest_campaign_4',
    version: 0,
    name: 'The Null Gravitas',
    hull: 15,
    hullMax: 15,
    armor: 1,
    damage: '1D6',
    driveFuel: 4,
    maxDriveFuel: 6,
    credits: 0,
    upgrades: ['Additional Armor', 'Fuel Tanks'],
    notes: `The crew's stolen courier ship.

- port airlock seal is *temporary* — get it welded
- fuel gauge reads low after every jump
- transponder has "three previous owners" it would rather forget`,
    imageUrl: '',
    imageUrls: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const guestMessages = [
  {
    id: 'guest_msg_1',
    campaignId: 'guest_campaign_1',
    userId: 'guest_player_1',
    messageBody:
      "Alright team, the entrance to the Tomb of Horrors lies just ahead. I suggest we move carefully — I've heard tales of traps that can vaporize even the hardiest adventurers.",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'guest_msg_2',
    campaignId: 'guest_campaign_1',
    userId: 'guest_player_2',
    messageBody:
      'Agreed. My rogue can scout ahead and check for pressure plates and tripwires. Give me a moment to don my **goggles of minute seeing**.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'guest_msg_3',
    campaignId: 'guest_campaign_1',
    userId: 'guest_demo',
    messageBody:
      "While Frodo scouts, I'll prepare a few utility spells. Detect Magic and Identify could be invaluable in a place like this. Has anyone packed extra rations? We may be inside for a while.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'guest_msg_4',
    campaignId: 'guest_campaign_1',
    userId: 'guest_player_3',
    messageBody:
      "I've got enough dried meat and waybread for a tenday. Also — did anyone else notice that strange green glow coming from the mouth of the tomb? It pulsed three times when we approached.",
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'guest_msg_5',
    campaignId: 'guest_campaign_4',
    userId: 'guest_player_1',
    messageBody:
      "Docked at Waystation Nine. I've got the hand-off at the docks tonight. Doc — fix the transponder so it reads as a mining survey ship before the customs drones sweep the berth.",
    createdAt: new Date(Date.now() - 21600000).toISOString(),
    updatedAt: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    id: 'guest_msg_6',
    campaignId: 'guest_campaign_4',
    userId: 'guest_demo',
    messageBody:
      'Vex here. Fuel is down to two bars and the Syndicate flagged our last port of call. Whatever this job is, it had better pay for a full tank and a fresh set of papers.',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    updatedAt: new Date(Date.now() - 10800000).toISOString(),
  },
]

/**
 * The campaign planner's demo data: two plans on the Strahd campaign, which is the
 * one that ships with the `planner` add-on switched on.
 *
 * The four candidate dates of the open plan are chosen so all four availability
 * levels appear: everybody can (green), three of four can (orange), half can (yellow — the
 * third member is a *maybe*, which is never counted as a yes), and one of four can
 * (red). The roster is the campaign's participants minus the exclusion rows, so
 * nothing here lists who is in the plan.
 *
 * The decided plan shows the other half of the feature: a settled day, a member who
 * left (their answers were kept), and a chosen date everybody in the roster could
 * make.
 */
const daysAgo = (days) => new Date(Date.now() - 86400000 * days).toISOString()

export const guestPlannerPlans = [
  {
    id: 'guest_plan_1',
    campaignId: 'guest_campaign_1',
    title: 'Session 12 — when do we play next?',
    description:
      'Barovia will wait. We will not: pick a day and I will book the table.\n\nI can host, but only after 18:00 on a weekday.',
    status: 'OPEN',
    decidedDateId: null,
    createdByUserId: 'guest_player_1',
    version: 0,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    id: 'guest_plan_2',
    campaignId: 'guest_campaign_1',
    title: 'Session 11 — recap night',
    description: 'Catching up on what we did before the crypt.',
    status: 'DECIDED',
    decidedDateId: 'guest_plan_2_date_2',
    createdByUserId: 'guest_demo',
    version: 2,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(21),
  },
]

export const guestPlannerDates = [
  {
    id: 'guest_plan_1_date_1',
    planId: 'guest_plan_1',
    date: '2026-11-07',
    startTime: '18:00',
    endTime: '22:00',
    note: 'Saturday evening at my place.',
    createdByUserId: 'guest_player_1',
    version: 0,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: 'guest_plan_1_date_2',
    planId: 'guest_plan_1',
    date: '2026-11-14',
    startTime: '19:00',
    endTime: '23:00',
    note: 'Same table, one week later.',
    createdByUserId: 'guest_player_2',
    version: 0,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: 'guest_plan_1_date_3',
    planId: 'guest_plan_1',
    date: '2026-11-21',
    startTime: null,
    endTime: null,
    note: 'Sunday afternoon, bring dice.',
    createdByUserId: 'guest_player_3',
    version: 0,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: 'guest_plan_1_date_4',
    planId: 'guest_plan_1',
    date: '2026-12-05',
    startTime: '18:30',
    endTime: '22:30',
    note: 'Last chance before the holidays.',
    createdByUserId: 'guest_demo',
    version: 0,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: 'guest_plan_2_date_1',
    planId: 'guest_plan_2',
    date: '2026-10-17',
    startTime: '18:00',
    endTime: '22:00',
    note: null,
    createdByUserId: 'guest_demo',
    version: 0,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },
  {
    id: 'guest_plan_2_date_2',
    planId: 'guest_plan_2',
    date: '2026-10-24',
    startTime: '19:00',
    endTime: '23:00',
    note: 'Everybody could make this one.',
    createdByUserId: 'guest_demo',
    version: 0,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(21),
  },
]

export const guestPlannerAttendances = [
  // 7 November: everybody can — the green marker.
  { id: 'guest_att_1', planDateId: 'guest_plan_1_date_1', userId: 'guest_demo', state: 'YES' },
  { id: 'guest_att_2', planDateId: 'guest_plan_1_date_1', userId: 'guest_player_1', state: 'YES' },
  { id: 'guest_att_3', planDateId: 'guest_plan_1_date_1', userId: 'guest_player_2', state: 'YES' },
  { id: 'guest_att_4', planDateId: 'guest_plan_1_date_1', userId: 'guest_player_3', state: 'YES' },

  // 14 November: three of four — orange.
  { id: 'guest_att_5', planDateId: 'guest_plan_1_date_2', userId: 'guest_demo', state: 'YES' },
  { id: 'guest_att_6', planDateId: 'guest_plan_1_date_2', userId: 'guest_player_1', state: 'YES' },
  { id: 'guest_att_7', planDateId: 'guest_plan_1_date_2', userId: 'guest_player_2', state: 'NO' },
  { id: 'guest_att_8', planDateId: 'guest_plan_1_date_2', userId: 'guest_player_3', state: 'YES' },

  // 21 November: two of four, one of them a maybe — yellow.
  { id: 'guest_att_9', planDateId: 'guest_plan_1_date_3', userId: 'guest_demo', state: 'YES' },
  { id: 'guest_att_10', planDateId: 'guest_plan_1_date_3', userId: 'guest_player_1', state: 'MAYBE' },
  { id: 'guest_att_11', planDateId: 'guest_plan_1_date_3', userId: 'guest_player_2', state: 'NO' },
  { id: 'guest_att_12', planDateId: 'guest_plan_1_date_3', userId: 'guest_player_3', state: 'YES' },

  // 5 December: one of four, and one has not answered at all — red.
  { id: 'guest_att_13', planDateId: 'guest_plan_1_date_4', userId: 'guest_demo', state: 'NO' },
  { id: 'guest_att_14', planDateId: 'guest_plan_1_date_4', userId: 'guest_player_2', state: 'NO' },
  { id: 'guest_att_15', planDateId: 'guest_plan_1_date_4', userId: 'guest_player_3', state: 'YES' },

  // The decided plan: the day it settled on, and the one it did not.
  { id: 'guest_att_16', planDateId: 'guest_plan_2_date_1', userId: 'guest_player_3', state: 'NO' },
  { id: 'guest_att_17', planDateId: 'guest_plan_2_date_2', userId: 'guest_demo', state: 'YES' },
  { id: 'guest_att_18', planDateId: 'guest_plan_2_date_2', userId: 'guest_player_1', state: 'YES' },
  { id: 'guest_att_19', planDateId: 'guest_plan_2_date_2', userId: 'guest_player_2', state: 'YES' },
]

/** A member who left a plan. Their answers stay, so rejoining restores them. */
export const guestPlannerExclusions = [
  {
    id: 'guest_plan_2_exclusion_1',
    planId: 'guest_plan_2',
    userId: 'guest_player_3',
    removedByOwner: false,
    removedBy: 'User3',
    createdAt: daysAgo(25),
  },
]

/**
 * Every localStorage key the guest/demo mode owns. Kept in one place so the
 * seed and clear helpers can never drift (e.g. silently forget `guest_ships`).
 */
const GUEST_STORAGE_KEYS = [
  'guest_user',
  'guest_users',
  'guest_characters',
  'guest_campaigns',
  'guest_ships',
  'guest_messages',
  'guest_journals',
  'guest_journal_pages',
  'guest_planner_plans',
  'guest_planner_dates',
  'guest_planner_attendances',
  'guest_planner_exclusions',
]

/**
 * Write the full demo data set to localStorage (overwrites existing values).
 * Called when entering guest mode so re-entering always yields a fresh, complete
 * dataset — including the ship.
 */
export function seedGuestStorage() {
  localStorage.setItem('guest_user', JSON.stringify(guestUser))
  localStorage.setItem('guest_users', JSON.stringify(guestUsers))
  localStorage.setItem('guest_characters', JSON.stringify(guestCharacters))
  localStorage.setItem('guest_campaigns', JSON.stringify(guestCampaigns))
  localStorage.setItem('guest_ships', JSON.stringify(guestShips))
  localStorage.setItem('guest_messages', JSON.stringify(guestMessages))
  // A journal is created by its owner's first write, so the demo seeds the keys
  // empty: nothing to write means nothing stored, exactly like the backend.
  localStorage.setItem('guest_journals', JSON.stringify([]))
  localStorage.setItem('guest_journal_pages', JSON.stringify([]))
  // The planner's demo data is meant to be looked at: a campaign with the add-on
  // switched on, an open plan showing all four availability levels, and a decided one.
  localStorage.setItem('guest_planner_plans', JSON.stringify(guestPlannerPlans))
  localStorage.setItem('guest_planner_dates', JSON.stringify(guestPlannerDates))
  localStorage.setItem('guest_planner_attendances', JSON.stringify(guestPlannerAttendances))
  localStorage.setItem('guest_planner_exclusions', JSON.stringify(guestPlannerExclusions))
}

/** Remove every guest/demo key (used when leaving guest mode). */
export function clearGuestStorage() {
  GUEST_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
}

/**
 * Seed the demo data once, if no guest session exists yet. Safe to call on app
 * boot; it never overwrites an in-progress guest session.
 */
export function seedLocalStorage() {
  if (!localStorage.getItem('guest_user')) {
    seedGuestStorage()
    console.log('[Seed] Guest data successfully initialized in localStorage!')
  }
}
