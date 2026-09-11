<template>
  <div
    class="min-h-screen flex items-center justify-center p-4"
    style="
      background-image: linear-gradient(
        to bottom right,
        var(--color-primary-50),
        var(--color-primary-100)
      );
    "
  >
    <div
      class="w-full max-w-2xl border-4 parchment-border shadow-xl relative p-8"
      style="background-color: var(--color-primary-50)"
    >
      <!-- Parchment texture effect -->
      <div
        class="absolute inset-0 opacity-90"
        style="
          background-image: linear-gradient(
            to bottom,
            var(--color-primary-50),
            var(--color-primary-100)
          );
        "
      ></div>
      <div class="absolute inset-2 border-2 parchment-border-light border-dashed"></div>
      <div class="absolute inset-4 border parchment-border-lighter border-dashed opacity-50"></div>

      <!-- Content -->
      <div class="relative z-10">
        <!-- Header -->
        <div class="text-center border-b-2 parchment-border pb-4 mb-6">
          <div class="text-6xl mb-4" style="color: var(--color-secondary-600)">🎲</div>
          <h1 class="text-3xl parchment-heading mb-2">⚔️ The Tavern is Closed ⚔️</h1>
          <p class="text-lg parchment-subtitle">
            The innkeeper is still preparing the establishment
          </p>
        </div>

        <!-- Quest Log -->
        <div class="parchment-inset border-l-4 parchment-border pl-4 py-3 mb-6">
          <h2
            class="text-xl font-semibold parchment-text border-b parchment-border pb-2 mb-3 flex items-center gap-2"
          >
            <span>📜</span>
            <span>Quest Log</span>
          </h2>
          <p class="parchment-text mb-3">
            The grand opening of this tavern is still in preparation. Our master builders and
            enchanters are working tirelessly to complete the construction.
          </p>
          <p class="parchment-text">
            Currently, only selected adventurers with special invitations may enter. If you're part
            of the testing party, verify your credentials and try again.
          </p>
        </div>

        <!-- Construction Notice -->
        <div class="parchment-inset border-l-4 parchment-border pl-4 py-3 mb-6">
          <h3
            class="text-xl font-semibold parchment-text border-b parchment-border pb-2 mb-3 flex items-center gap-2"
          >
            <span>🏗️</span>
            <span>Construction Notice</span>
          </h3>
          <p class="parchment-text">
            The mages are still weaving the magical infrastructure, and the carpenters are
            reinforcing the beams. We appreciate your patience as we prepare this establishment for
            all adventurers.
          </p>
        </div>

        <!-- Features -->
        <div class="mb-6">
          <p class="parchment-text mb-3">Return when the banners are raised to find:</p>
          <ul class="list-none pl-5 space-y-2">
            <li class="flex items-center gap-2 parchment-text">
              <span style="color: var(--color-secondary-500)">📜</span>
              <span>Create and manage your 5E RPG campaigns</span>
            </li>
            <li class="flex items-center gap-2 parchment-text">
              <span style="color: var(--color-secondary-500)">👥</span>
              <span>Track all your characters in one place</span>
            </li>
            <li class="flex items-center gap-2 parchment-text">
              <span style="color: var(--color-secondary-500)">📊</span>
              <span>Organize campaign notes and sessions</span>
            </li>
            <li class="flex items-center gap-2 parchment-text">
              <span style="color: var(--color-secondary-500)">🔍</span>
              <span>Search and reference all your content</span>
            </li>
          </ul>
        </div>

        <!-- Footer -->
        <div class="pt-4 border-t parchment-border-light text-center">
          <p class="parchment-subtitle">May your dice roll true when we open our doors!</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FantasyUnderConstruction',
}
</script>
