# Architecture — unseenservant-frontend

## Tech stack
- Vue 3 (Composition API, `<script setup>`)
- Vite
- Pinia (state management)
- Vue Router
- Axios + custom API layer
- Tailwind CSS
- Vitest

## Folder structure

```
src/
├── api/
│   ├── lib/
│   │    ├── axios.js              # Axios instance with interceptors (JWT, 401-handling)
│   │    ├── open5e-axios.js       # External API wrapper for Open5e (clean Axios instance)
│   │    └── guest-axios.js        # Mock Axios instance using localStorage to handle standalone guest mode requests
│   └── apiClient.js          # Unified API client wrapper. Dynamically switches between axios.js and guest-axios.js based on authStore.isGuest
├── components/               # Shared UI components
│   ├── base/                 # Generic building blocks (button, modal, input etc.)
│   ├── HeaderComponent.vue
│   ├── FooterComponent.vue
│   └── NotificationComponent.vue
├── data/
│   └── demoData.js           # Static mock seed data used to populate localStorage when initializing guest mode   
├── stores/
│   └── notificationStore.js  # Global notification state (Pinia)
├── router/
│   └── index.js              # Routes + auth guard
├── views/                    # Top-level views not belonging to a feature
│   ├── HomeView.vue
│   ├── AboutView.vue
│   ├── PrivacyPolicyView.vue # /privacy — how personal data is handled
│   ├── TermsView.vue         # /terms — the terms for using the service
│   ├── NotFoundView.vue
│   └── UnderConstructionView.vue
├── features/
│   ├── auth/
│   │   ├── AuthService.js
│   │   ├── authStore.js
│   │   ├── LoginComponent.vue
│   │   ├── LogoutView.vue
│   │   └── OAuthRedirect.vue
│   ├── campaign/
│   │   ├── CampaignService.js
│   │   ├── campaignStore.js
│   │   ├── campaignSystems.js   # Campaign primary-system options/labels + isOffworlders/isDnd5e
│   │   ├── campaignUtils.js
│   │   ├── components/
│   │   ├── dispatchers/        # CampaignSystemRouter.vue (Ship / spell search per primary system)
│   │   └── views/
│   ├── message/
│   │   ├── MessageService.js
│   │   ├── messageStore.js
│   │   └── components/       # MessageBoard.vue (no views/ — rendered within CampaignView)
│   ├── ship/
│   │   ├── ShipService.js
│   │   ├── shipStore.js
│   │   └── components/       # ShipSection.vue + ShipSheet.vue (rendered within CampaignView)
│   ├── character/
│   │   ├── CharacterService.js
│   │   ├── characterStore.js
│   │   ├── components/
│   │   └── views/
│   └── user/
│       ├── UserService.js
│       ├── userStore.js          # The single owner of the signed-in profile
│       └── userUtils.js          # Role labels + badge classes (isAdminRole, getRoleLabel)
│   ├── settings/
│   │   ├── components/          # GeneralSettingsSection.vue (theme, mode, environment), UserSettingsSection.vue
│   │   └── views/
│   │       └── SettingsView.vue # /settings — the contextual shell (general | user | admin)
│   └── admin/
│       ├── AdminService.js
│       ├── adminStore.js
│       └── components/          # AdminUsersSection.vue, AdminWhitelistSection.vue
├── utils/
│   ├── errorUtils.js         # Extracts a human-readable error message from an Axios error.
│   ├── imageUpload.js        # Frontend mirror of the backend's 5MB upload limit (validateImageSize).
│   ├── useImagePicker.js     # Composable: pick → reposition → preview, shared by the campaign/character image editors.
│   ├── sortUtils.js          # Pure list ordering: sortByLastViewed (most recently viewed first).
│   ├── viewHistory.js        # Per-user "last viewed" timestamps in localStorage (view_history key).
│   ├── useViewRecency.js     # Composable: records that the user viewed a campaign/character.
│   ├── bodyScrollLock.js     # Counted body scroll lock shared by the modal and drawer overlays.
│   └── interactiveEvent.js   # Event guards for an interactive container that nests controls (cards, rows).
├── systems/                  # System-specific (tabletop RPG ruleset) code
│   ├── offworlders/          # Offworlders (rules-light sci-fi)
│   │   ├── components/       # OffworldersStatsPanel, OffworldersCharacterForm, OffworldersGearForm
│   │   ├── constants.js      # Classes, attributes, skill/ability catalogs + descriptions, weapons/armor/items, empty-data factory
│   │   ├── shipConstants.js  # Ship defaults + upgrade catalog + upgrade helpers (pp.13/26)
│   │   └── OffworldersSheet.vue  # The Offworlders character sheet (vitals + gear + attributes + skills/abilities)
│   └── dnd5e/                # Dungeons & Dragons 5e
│       ├── api/
│       │   └── open5e-axios.js        # Open5e API client (public, no auth)
│       ├── components/       # SpellSearch, SpellCard, SpellDetailModal, Dnd5eSpellSearchPanel, Dnd5eStatsPanel, Dnd5eCharacterForm
│       ├── views/            # SpellSearchView
│       ├── constants.js      # Races, classes, ability scores, empty-data factory
│       ├── Dnd5eSheet.vue    # The D&D 5e character sheet (stats + spells + Open5e search)
│       ├── dnd5eSpellService.js
│       ├── dnd5eSpellStore.js
│       └── spellUtils.js
├── App.vue
└── main.js
```

> The core `character` feature is system-agnostic. It only knows the generic
> `Character` shape (`systemType`, `notes`, `avatarUrl`) and delegates all
> ruleset-specific rendering to `systems/<system>/`. `SystemSheetRouter.vue`
> selects the correct sheet component based on `character.systemType`.
>
> A character may also have **no game system at all**. `systemType` is the empty
> string in the form model (like the campaign's `primarySystem`) and `null` on
> the wire; `systemRegistry.buildPayload` sends it as such, and both routers
> render nothing then — only the generic core fields (name, notes, appearance,
> backstory) exist. `SYSTEM_FORM_OPTIONS` adds that "No system" choice to the
> forms, and `characterSystemLabel()` labels it for badges.

## Feature structure
Each feature follows the same pattern:
- `FeatureService.js` — all API calls for the feature
- `featureStore.js` — Pinia store (state + actions)
- `components/` — UI components used within the feature
- `views/` — routable pages for the feature

## API Architecture & Communication
```
Internal (Live):      axios.js         → apiClient.js     → FeatureService.js → Store
Internal (Demo):     guest-axios.js   → apiClient.js     → FeatureService.js → Store
External (Open5e):    open5e-axios.js  → SpellService.js → Store
```
- `api/axios.js`: Standard Axios instance for authenticated traffic. Automatically attaches JWT headers to requests and intercepts `401 Unauthorized` responses to clear local auth and trigger system notifications.
- `api/apiClient.js`: Dynamic wrapper client. It acts as a gateway that checks `authStore.isGuest` and seamlessly switches all traffic between the live backend client (`axios.js`) and the mock client (`guest-axios.js`). Provides only generic `get`, `post`, `put`, `patch`, `delete` methods — no feature-specific routing or translation logic. All feature services import from this file.
- `api/guest-axios.js`: Simulates backend behavior inside the browser: it answers the requests the app makes in standalone mode by reading and writing `localStorage`. Its endpoints live in one ordered **route table** (`ROUTES`: method + URL pattern → handler, first match wins), so the entries that have to precede others — ship crew before ship images — are ordered deliberately, and the five public methods are only a thin dispatcher on top. Adding an endpoint means adding one entry. The admin prefix is deliberately not served (see Guest Mode below).
- `api/open5e-axios.js`: Dedicated Axios instance for Open5e API v2 calls. Public API with no authentication headers. Includes a response interceptor that classifies transport errors (timeout/unreachable), rate limiting (429), and server errors (5xx) into user-facing notifications. Used directly by `SpellService.js` for guest-mode spell operations.

## Authentication
- JWT-based authentication with state persisted and managed in `authStore` (Pinia).
- OAuth2 integration via Google and GitHub, with incoming tokens and redirects handled by `OAuthRedirect.vue`. The backend links logins to an existing account by email (case-insensitive) and requires a verified Google email; a rejected login lands on `/under-construction`.
- Auth state persisted in `authStore` (Pinia)

## Guest Mode

Standalone preview mode populated entirely via mock data from `src/data/demoData.js`. When activated, state changes are written directly to `localStorage`. Image uploads are not supported in guest mode and are gracefully mocked out or bypassed via a disclaimer. Character spell operations (save, fetch, remove from character) are mocked in guest-axios.js, while spell search and single-spell fetch go directly to the Open5e API via `open5e-axios.js`.

### Guest Mode Limitations

- **No user administration.** `/api/admin/**` is not served at all, so the
  Settings → Admin section is unreachable for the whole session: `SettingsView`
  filters it out when `authStore.isGuest` is true (and a `?section=admin` deep
  link falls back to General), the demo user is an ordinary `USER`, and
  `guest_whitelist` is gone, so nothing can be written to one.
- **The journal is per-browser and private.** `/api/journals/**` is served from
  `guest_journals` / `guest_journal_pages`, seeded empty: a journal row and its
  pages appear with the first write, and the same ownership rules apply as on the
  backend (a page in another participant's journal answers 404). Unsaved page text
  is mirrored per user/campaign/page in `journal_draft:*` keys.
- **No image uploads.** Campaign, character, ship and crew uploads answer stock
  placeholder URLs instead of storing a file; the UI says so where it matters.
- **Spell data comes from Open5e.** Guest mode has no spell table of its own —
  `dnd5eSpellService` calls the public Open5e API directly (`open5e-axios.js`)
  for search and single-spell fetches.
- **Everything lives in this browser.** A guest session keeps its data in
  `localStorage` under the `guest_*` keys, and `authStore.exitGuestMode` clears
  every key it owns.

## Campaign permissions

Campaign rights are modelled as **two independent axes**, not a single role:

- **Ownership** (`isOwner`) — administration: transfer ownership, delete the
  campaign, add/remove participants, change participant roles, and edit other
  participants' nicknames.
- **Table role** (`isGm`) — world-building: campaign details (name,
  description, system, image), world lore, GM notes.

`src/features/campaign/campaignPermissions.js` is the single source of truth
(pure functions plus `getCampaignPermissions(campaign, userId)`); components
read capability flags from it and never re-derive the rules inline. Guest mode
(`src/api/lib/guest-axios.js`) reuses the same module so the localStorage demo
enforces identical rules. The in-campaign "Campaign Settings" section renders
role-dependent blocks — the personal nickname for everyone, campaign details
for the GM, and participant management plus the owner-only "Danger Zone" for
the campaign owner.

## Component conventions (target pattern)
- **Smart components** (views, containers): handle store calls and logic
- **Dumb/presentational components**: receive props, emit events, no store access
- **Base components**: generic UI building blocks in `src/components/base/`
- Always Composition API with `<script setup>` — no Options API components

### Contextual shells (campaign, settings)
`ContextSidebar.vue` + `ContextNavList.vue` + `ContextMobileBar.vue` are the
shared layout for any view that presents sub-views through a rail: a mobile top
bar opening a `SlideOverDrawer`, a desktop rail at md+, and a content column.
`CampaignSidebar.vue` and `SettingsView.vue` both build on it, and the active
section is mirrored into the URL (`?section=…`) so a refresh or a shared link
reopens the same subview. Adding a third contextual area means composing these
three components, not copying their markup. The journal is one more campaign
section rather than a new area: `CampaignView.SECTIONS` carries it (flagged
`participantOnly`, since a journal belongs to a participant) and it renders
`JournalBoard`, the same way Messages renders `MessageBoard`.

### State management
- Pinia stores are the single source of truth
- Components read state via `storeToRefs()` for reactivity
- API calls live in Service files, called from store actions
- List order is **derived** state, never stored: the stores expose
  `sortedCampaigns` / `sortedCharacters` (most recently viewed first, from the
  client-only `view_history` — see `utils/viewHistory.js`), and
  `campaignStore.getCharactersByCampaignId` returns a campaign's party in the
  fixed order (own characters → GM characters → alphabetical, see
  `campaignUtils.js:sortPartyCharacters`). Views record a view through
  `utils/useViewRecency.js`; a store fetch deliberately never does, because
  fetches also run for side reads.

### Routing & Navigation
- Protected routes are explicitly flagged using `meta: { requiresAuth: true }`.
- A global router navigation guard validates sessions and initializes user context via `authStore.initializeAuth()` on the initial application boot.
- The legal pages (`/privacy`, `/terms`) are deliberately public — no `meta` — so they can be read before signing in, and the footer links to both.

## General Practices
- Absolute imports are strictly enforced across the codebase using the `@/` path alias pointing to the `src/` root directory.
- Tests live in a `__tests__/` folder next to the code they test (one per directory that has tests, including `src/utils/`), named `<subject>.test.js` — or `<subject>.integration.test.js` when a test wires several real modules without service mocks. Code under test is imported via `@/`, helpers shared across features belong in `src/test-utils/`, and no test file sits beside its source.

## Long-text fields are markdown

Every long free-text field (character notes / appearance / backstory / private
backstory, campaign short description / world lore / private description, ship
notes, message bodies, spell descriptions) is stored as markdown **source** and
rendered on the client:

- `src/utils/markdown.js` — the single `markdown-it` instance (`html: false`,
  `linkify`, `breaks`, images disabled) plus `renderMarkdown()` / `toPlainText()`.
- `src/components/base/MarkdownText.vue` — the only component that binds
  `v-html`; safe because raw HTML is escaped and link targets are validated.
- `src/components/base/BaseMarkdownField.vue` — textarea + Write/Preview toggle
  (preview never mutates the value, so dirty tracking is unaffected).
- `src/utils/htmlEntities.js` — decodes pre-escaped third-party text (Open5e
  spells) during normalisation, not at render time.
- `src/components/base/MarkdownHelp.vue` — the collapsed "Formatting help"
  cheat sheet (source snippet + live rendering), rendered beneath every
  `<BaseMarkdownField>` so the syntax reference exists in exactly one place.

The API, DTOs and database columns are unchanged: markdown travels as plain text,
so anything that does not render it still shows readable source.