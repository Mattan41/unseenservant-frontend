/**
 * demoData.js
 * Static seed data for Guest Mode with dynamic timestamps.
 * guest_demo is the current user in Guest Mode, guest_player_1-4 are demo users
 */

export const guestUser = {
  id: 'guest_demo',
  username: 'guest@demo.local',
  displayName: 'Guest Demo',
  email: 'guest@demo.local',
  role: 'USER'
}

export const guestUsers = [
  { id: 'guest_player_1', displayName: 'User1', username: 'User1', email: 'user1@demo.local' },
  { id: 'guest_player_2', displayName: 'User2', username: 'User2', email: 'user2@demo.local' },
  { id: 'guest_player_3', displayName: 'User3', username: 'User3', email: 'user3@demo.local' },
  { id: 'guest_player_4', displayName: 'User4', username: 'User4', email: 'user4@demo.local' },
  { id: 'guest_player_5', displayName: 'User5', username: 'User5', email: 'user5@demo.local' }
]

export const guestCharacters = [
  {
    id: 'guest_char_1',
    ownerId: 'guest_player_1',
    campaignId: 'guest_campaign_1',
    name: 'Gandalf',
    level: 10,
    characterClass: 'Wizard',
    race: 'Human',
    imageUrl: '/defaultCharacter.svg',
    playerCharacterData: { strength: 11, dexterity: 11, constitution: 11, intelligence: 19, wisdom: 15, charisma: 13 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'guest_char_2',
    ownerId: 'guest_player_2',
    campaignId: 'guest_campaign_1',
    name: 'Frodo',
    level: 8,
    characterClass: 'Rogue',
    race: 'Halfling',
    imageUrl: '/defaultCharacter.svg',
    playerCharacterData: { strength: 10, dexterity: 18, constitution: 12, intelligence: 12, wisdom: 13, charisma: 10 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'guest_char_3',
    ownerId: 'guest_player_3',
    campaignId: 'guest_campaign_1',
    name: 'Bilbo',
    level: 3,
    characterClass: 'Rogue',
    race: 'Halfling',
    imageUrl: '/defaultCharacter.svg',
    playerCharacterData: { strength: 9, dexterity: 16, constitution: 11, intelligence: 12, wisdom: 12, charisma: 14 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'guest_char_4',
    ownerId: 'guest_demo',
    campaignId: 'guest_campaign_2',
    name: 'Rincewind',
    level: 1,
    characterClass: 'Wizard',
    race: 'Human',
    imageUrl: '/defaultCharacter.svg',
    playerCharacterData: { strength: 9, dexterity: 9, constitution: 9, intelligence: 14, wisdom: 9, charisma: 9 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'guest_char_5',
    ownerId: 'guest_demo',
    campaignId: 'guest_campaign_3',
    name: 'Gimli',
    level: 5,
    characterClass: 'Fighter',
    race: 'Dwarf',
    imageUrl: '/defaultCharacter.svg',
    playerCharacterData: { strength: 18, dexterity: 10, constitution: 16, intelligence: 8, wisdom: 10, charisma: 8 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'guest_char_6',
    ownerId: 'guest_demo',
    campaignId: null,
    name: 'Aragorn',
    level: 5,
    characterClass: 'Ranger',
    race: 'Human',
    imageUrl: '/defaultCharacter.svg',
    playerCharacterData: { strength: 14, dexterity: 16, constitution: 13, intelligence: 12, wisdom: 13, charisma: 11 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export const guestCampaigns = [
  {
  id: 'guest_campaign_1',
  name: 'Curse of Strahd',
  description: `Under the light of the full moon, the small town of Barovia is plagued by the evil forces of Count Strahd von Zarovich. Shadows twist through cobblestone streets and forgotten forests, as villagers lock their doors and whisper prayers against the night. Ancient secrets stir beneath the mist, hungry for the return of past glories. The cries of the oppressed echo through the valleys, while Strahd’s undead minions roam freely, enforcing the will of their lord. Hope is a rare commodity in Barovia, and the line between friend and foe is often blurred. Only the bravest souls dare to stand against the darkness and confront the mysteries it conceals.

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
Game Etiquette: Pay attention when it’s not your turn, avoid distracting side conversations, and minimize phone use during sessions.
Have Fun: Remember, the goal is collective storytelling and enjoyment. Support your fellow players and embrace the horror-adventure together!`,
  imageUrl: 'https://www.dndbeyond.com/attachments/8/220/cos-cover-4k.jpg',
  ownerId: 'guest_demo',
  participants: [
    { id: 'guest_demo', nickname: 'You - Guest', role: 'GM' },
    { id: 'guest_player_1', nickname: 'User1', role: 'PLAYER' },
    { id: 'guest_player_2', nickname: 'User2', role: 'PLAYER' },
    { id: 'guest_player_3', nickname: 'User3', role: 'PLAYER' }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
},
  {
    id: 'guest_campaign_2',
    name: 'Neptunus',
    description: `The University of Lundenwic has been robbed of its prized artifact, the Amulet of Taharka. The players are hired to track down the thief and retrieve the amulet.

                 Mystery & Investigation: Dive deep into a campaign filled with deception, riddles, and puzzles. Finding the thief will require sharp minds and keen eyes for detail.
                 Urban Adventure: Explore a vibrant city teeming with intrigue, hidden societies, eccentric professors, and shifting alliances.
                 Roleplay & Social Encounters: Forge alliances, interrogate suspects, and navigate the political landscape of scholars, nobles, and underground factions.
                 Skill-Based Challenges: Success will depend not just on combat prowess, but also on investigation, stealth, persuasion, and strategy.
                 Dynamic Consequences: Choices matter—a trusting word or a misstep could change the course of your investigation, and the fate of Lundenwic itself.`,
    imageUrl: 'https://c4.wallpaperflare.com/wallpaper/925/634/481/league-of-legends-bilgewater-fantasy-art-pirates-wallpaper-preview.jpg',
    ownerId: 'guest_demo',
    participants: [
      { id: 'guest_player_1', nickname: 'User1', role: 'PLAYER' },
      { id: 'guest_demo', nickname: 'You - Guest', role: 'GM' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
   {
    id: 'guest_campaign_3',
    name: 'Gears of War',
    description: `In the age of steam and gears, the Iron Colossus cuts through rugged mountain passes and
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
    ownerId: 'guest_demo',
    participants: [
      { id: 'guest_player_1', nickname: 'User1', role: 'GM' },
      { id: 'guest_demo', nickname: 'You - Guest', role: 'PLAYER' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
]

/**
 * Helper function to inject data into localStorage
 */
export function seedLocalStorage() {
  if (!localStorage.getItem('guest_user')) {
    localStorage.setItem('guest_user', JSON.stringify(guestUser))
    localStorage.setItem('guest_users', JSON.stringify(guestUsers))
    localStorage.setItem('guest_characters', JSON.stringify(guestCharacters))
    localStorage.setItem('guest_campaigns', JSON.stringify(guestCampaigns))
    console.log('[Seed] Guest data successfully initialized in localStorage!')
  }
}
