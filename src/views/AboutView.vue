<template>
  <div class="about">
    <div
      class="about-content max-w-4xl mx-auto p-6 rounded-lg shadow-md"
      style="background-color: var(--color-primary-50)"
    >
      <h1 class="font-bold mb-6 text-xs">About Unseen Servant</h1>

      <div class="mb-8">
        <p class="mb-4 text-default">
          Unseen Servant is a web application designed to enhance your tabletop roleplaying
          experience, specifically for the 5th Edition of the world's most popular roleplaying game.
          Like its namesake spell, it works diligently in the background, handling the
          administrative tasks so you can focus on the adventure.
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <div class="feature-card">
          <h3 class="feature-title">Character Management</h3>
          <p class="text-secondary">
            Create, update, and manage your characters. Track stats, inventory, spells, and
            abilities with ease whether your character is part of a campaign or a standalone
            adventurer.
          </p>
        </div>

        <div class="feature-card">
          <h3 class="feature-title">Campaign Organization</h3>
          <p class="text-secondary">
            Game Masters can create and manage campaigns, invite players, track campaign details,
            and keep everything organized in one place. Players can join campaigns and assign their
            characters to adventures.
          </p>
        </div>

        <div class="feature-card">
          <h3 class="feature-title">Collaborative Play</h3>
          <p class="text-secondary">
            Designed for both Game Masters and players, Unseen Servant facilitates collaboration
            between all participants with clear role distinctions and shared campaign information.
          </p>
        </div>
      </div>

      <!-- Legal: third-party attribution. Required by the licences of the
           Offworlders rules, the D&D System Reference Documents, and the
           third-party 5e content served through the Open5e API. -->
      <section class="mb-8">
        <h2 class="feature-title">Credits &amp; Licences</h2>

        <h3 class="credits-heading">Offworlders</h3>
        <p class="text-secondary mb-4">
          <strong>Offworlders</strong> is a game by Chris Wolf. Illustrations and book design by
          Olivia Gulin. It is inspired by <em>World of Dungeons</em> by John Harper, and also owes
          inspiration to <em>Dungeon World</em> by Sage Latorra and Adam Koebel, as well as
          <em>Traveller</em> by Marc Miller and <em>Stars Without Number</em> by Kevin Crawford.
          Offworlders is licensed under a
          <a
            class="element-link"
            href="https://creativecommons.org/licenses/by/3.0/us/legalcode"
            target="_blank"
            rel="noopener noreferrer"
            >Creative Commons Attribution 3.0 US licence</a
          >.
        </p>

        <h3 class="credits-heading">Dungeons &amp; Dragons System Reference Documents</h3>
        <p class="text-secondary mb-2">
          Spell and rules content is drawn from the System Reference Documents published by Wizards
          of the Coast LLC under the Creative Commons Attribution 4.0 International licence.
        </p>
        <blockquote class="credits-quote">
          This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by
          Wizards of the Coast LLC and available at
          https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed
          under the Creative Commons Attribution 4.0 International License available at
          https://creativecommons.org/licenses/by/4.0/legalcode.
        </blockquote>
        <blockquote class="credits-quote">
          This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by
          Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is
          licensed under the Creative Commons Attribution 4.0 International License, available at
          https://creativecommons.org/licenses/by/4.0/legalcode.
        </blockquote>

        <h3 class="credits-heading">Open5e and third-party 5e publishers</h3>
        <p class="text-secondary mb-2">
          Spell data is retrieved from the
          <a
            class="element-link"
            href="https://open5e.com"
            target="_blank"
            rel="noopener noreferrer"
            >Open5e API</a
          >, which aggregates openly licensed 5e material. Besides the SRD, this includes content
          published under the Open Game License 1.0a by:
        </p>
        <ul class="credits-list text-secondary">
          <li>
            <strong>Kobold Press</strong> — <em>Tome of Beasts</em>, <em>Creature Codex</em>,
            <em>Deep Magic</em>, <em>Vault of Magic</em>, <em>Tome of Heroes</em>,
            <em>Wastes of Chaos</em>, <em>Black Flag Roleplaying</em>.
          </li>
          <li><strong>EN Publishing</strong> — <em>Level Up: Advanced 5th Edition</em>.</li>
          <li><strong>Darrington Press</strong> — <em>Tal'Dorei Campaign Setting</em>.</li>
          <li>and other publishers whose work Open5e distributes.</li>
        </ul>
        <p class="text-secondary mt-3">
          Only Open Game Content is reproduced here — no Product Identity (trademarks, character or
          place names, artwork). The full
          <a
            class="element-link"
            href="https://www.opengamingfoundation.org/ogl.html"
            target="_blank"
            rel="noopener noreferrer"
            >Open Game License 1.0a text</a
          >
          and the per-document copyright notices are published on
          <a
            class="element-link"
            href="https://open5e.com/legal"
            target="_blank"
            rel="noopener noreferrer"
            >Open5e's legal page</a
          >. All product names, logos and trademarks remain the property of their respective owners.
        </p>
      </section>

      <div
        class="text-center text-sm text-default mt-6 border-t pt-4"
        style="border-color: var(--color-primary-200)"
      >
        <p class="mt-2">
          Unseen Servant is a fan-created tool and is not affiliated with or endorsed by the
          official game publishers.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup></script>

<style scoped>
.about {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-primary-100) 100%);
}

.feature-card {
  background: var(--color-surface);
  padding: 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-primary-200);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  height: 100%; /* Keeps every card the same height */
}

.feature-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.feature-title {
  font-size: 1.1rem; /* Smaller heading size */
  line-height: 1.3;
  margin-bottom: 0.75rem; /* Consistent margin */
  min-height: 1.75rem; /* Room for two lines when needed */
  display: flex;
  align-items: center;
}

/* Credits & Licences: subhead per third-party work. */
.credits-heading {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: var(--color-primary-700);
}

/* Verbatim licence statements (SRD attribution), kept visually distinct. */
.credits-quote {
  font-size: 0.8rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
  padding-left: 0.75rem;
  border-left: 2px solid var(--color-primary-200);
  color: var(--color-third-600);
}

/* Publisher list in the Open5e / OGL credit. */
.credits-list {
  list-style: disc;
  margin: 0 0 0.75rem 1.25rem;
  font-size: 0.875rem;
  line-height: 1.6;
}

@media (min-width: 768px) {
  .feature-title {
    font-size: 1.15rem; /* Slightly larger on desktop */
    /* Avoid breaking headings in awkward places */
    hyphens: auto;
    word-wrap: break-word;
  }
}

@media (max-width: 768px) {
  .about {
    padding: 1rem;
    align-items: flex-start;
  }

  .about-content {
    margin-top: 2rem;
    margin-bottom: 2rem;
  }
}
</style>
