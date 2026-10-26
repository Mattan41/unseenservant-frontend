# Frontend API Integration Reference

## API Layer Overview

The frontend uses a three-layer API architecture that transparently switches between live backend calls and local mock data.

### src/api/lib/axios.js — Authenticated Axios Instance

- **Base URL**: Configured via the VITE_API_BASE_URL environment variable.
- **Timeout**: 60 seconds.
- **JWT Attachment**: Request interceptor reads auth_token from localStorage and attaches the Authorization Bearer token header.
- **401 Handling**: Response interceptor detects 401 errors, shows a session expiration notification, and calls authStore.clearAuth to log out the user.
- **429 Handling**: Response interceptor detects 429 — nginx's `limit_req` or the backend's login throttle — and shows a "Too many requests" warning. It deliberately leaves the session alone (a throttle is not a logout) and does not read the response body, because nginx answers 429 with an HTML error page. See docs/DEPLOYMENT.md#rate-limiting.

### src/api/apiClient.js — Dynamic API Wrapper

- Provides get, post, put, patch, and delete methods.
- **Guest Mode Switching**: Checks authStore.isGuest to determine whether to use axios (live) or guestAxios (mock).
- All feature services import from this module and never use axios.js directly.
- Purely generic — no feature-specific routing or translation logic.

### src/api/lib/guest-axios.js — LocalStorage Mock Adapter

- Provides an axios-like interface that reads and writes to localStorage.
- **Storage Keys**: guest_user, guest_users, guest_characters, guest_campaigns, guest_ships, guest_messages, guest_journals, guest_journal_pages, guest_planner_plans, guest_planner_dates, guest_planner_attendances, guest_planner_exclusions.
- **Auto-Normalization**: Handles fallback between snake_case and camelCase key naming.
- **Routing**: one ordered table (`ROUTES`: method + URL pattern → handler, first match wins). The entries that must precede others are ordered deliberately — the character gallery before the character avatar, the ship's profile image before its gallery, and the planner's own paths before the looser campaign patterns — and a new endpoint is one new entry, not another branch in a method.
- **Errors are values until the boundary**: a handler returns either the response body (`ok({ … })`) or the `Error` it refuses with (`notFound` / `forbidden` / `badRequest` / `conflict`, all built by `guestError`). `dispatch` is the single place that settles those into a promise, rejecting when the value is an `Error` — so no handler builds a promise, and no refusal is ever tested as a boolean (a promise is always truthy: `if (frozen)` would read as "always decided" the day a handler returned one).
- **Mock Endpoints**:
  - User profile: /api/users/me, /api/users/search
  - Characters: CRUD operations, campaign assignment
  - Campaigns: CRUD operations, participant management
  - Planner: plans, dates and answers (/api/planner/**), with the backend's rules — the campaign's `planner` add-on gates the endpoints, the roster is the participants minus the plan's exclusions, and a decided plan freezes until it is reopened
  - **Campaign add-ons: not served.** `/api/campaigns/{id}/addons` has no guest route; an unrouted request resolves to the generic fallback (`{ data: null }`), not an error — so the Add-ons block in Campaign Settings is read-only for a guest session and a demo campaign carries its `addons` in the seed data (see ARCHITECTURE.MD → Guest Mode Limitations)
  - Image uploads: Returns placeholder URLs
  - Admin: **not served** — Guest Demo has no admin surface (see ARCHITECTURE.MD → Guest Mode Limitations)

### src/api/lib/open5e-axios.js — External API Client

- **Base URL**: `https://api.open5e.com/v2/`
- **Timeout**: 10 seconds.
- **Auth**: Public API client. No authentication headers or interceptors are attached.
- **Headers**: Fixed `Content-Type: application/json`.
- **Purpose**: Provides a dedicated Axios instance specifically for fetching standardized SRD and open-licensed game mechanics (e.g., spells, monsters) from the Open5e database.
- **Error handling**: Response interceptor classifies transport errors (timeout/unreachable), rate limiting (429), and server errors (5xx) into user-facing notifications, matching the pattern established by `api/lib/axios.js`.
- **Usage**: Imported and called directly by `SpellService.js` for guest-mode spell operations (search and single-spell fetch).

---

## View history — client-only, no endpoint

The campaign and character lists are ordered by "what the user looked at last",
which the backend does not track and has no field for. `src/utils/viewHistory.js`
keeps it per user in a single localStorage key:

- **Key**: `view_history` — `{ [userId]: { campaign: { [id]: epochMs }, character: { [id]: epochMs } } }`.
- **Written by**: the smart views through `src/utils/useViewRecency.js` (`CampaignView`, `CharacterView`), never by a store fetch — `campaignStore.fetchCampaign` also runs for side reads (resolving the campaign of a character being viewed) and such a read must not count as a view of that campaign.
- **Read by**: `campaignStore.sortedCampaigns` and `characterStore.sortedCharacters` (both getters, so a new view re-sorts without a refetch) via the pure `src/utils/sortUtils.js:sortByLastViewed`, plus the campaign party order in `campaignUtils.js:sortPartyCharacters`.
- **Ids are stored as strings**, so a backend id (`4`) and a guest-mode id (`guest_campaign_1`) can live in the same map; entries are capped at 100 per user and kind (oldest dropped). A missing id or user id records nothing — the profile loads asynchronously, so the view is recorded once it arrives.
- **Never-viewed items keep the backend order** and follow the viewed ones.
- **Guest Demo** needs no adapter: `guest_demo` is just another user key, and `authStore.exitGuestMode` clears that user's history so the demo session leaves nothing behind.

---

## Feature: Auth

### authStore — State Shape

```js
{
  token: string | null,           // JWT from localStorage
  authStatus: 'idle' | 'authenticated' | 'unauthenticated',
  isInitializing: boolean,
  isAuthChecked: boolean,          // Prevents duplicate auth checks
  isGuest: boolean,                // Guest mode flag
  isAuthenticated: computed        // true if authenticated && !isGuest
}

```

---

### POST /api/auth/login

- **Service**: AuthService.loginWithUsernamePassword(username, password)
- **Store Action**: authStore.login(username, password)
- **Guest Mode**: Not applicable (authentication endpoint)
- **Request**: `{ username: string, password: string }`
- **Response Body**: AuthDTO `{ id, username, email, role }`
- **JWT Location**: Authorization response header (Bearer token)
- **Status Codes**: 200, 400, 401
- **Notes**: Token is extracted from response headers, not the body. Stored in localStorage and auth_token state.

---

### GET /api/auth/me

- **Service**: AuthService.getCurrentUser()
- **Store Action**: authStore.initializeAuth() (called during route navigation guard)
- **Guest Mode**: Not applicable (authentication endpoint)
- **Response**: AuthDTO `{ id, username, email, role }`
- **Status Codes**: 200, 401
- **Notes**: Used to verify existing session on app startup.

---

### GET /api/auth/oauth-init

- **Service**: AuthService.loginWithGoogle(), AuthService.loginWithGithub()
- **Store Action**: authStore.loginWithGoogle(), authStore.loginWithGithub()
- **Guest Mode**: Not applicable (authentication endpoint)
- **Query Params**: provider (google or github), origin
- **Behavior**: Redirects browser to OAuth provider. Backend sets oauth_redirect_origin cookie.
- **Account Linking**: A login is matched by provider identity, then by email (case-insensitive) — an existing account with the same email is reused, no duplicate user is created.
- **Verified Email**: Google requires a verified email (email_verified = true); a rejected login (unverified or non-whitelisted email) redirects to /under-construction instead of /oauth-redirect.
- **Status Codes**: 302, 400
- **Notes**: OAuth redirect handling via /oauth-redirect route which extracts token from URL and calls authStore.handleOAuthRedirect(token). The URL is replaced immediately afterwards, so the token is not left in the address bar or in the browser's history (see docs/DEPLOYMENT.md#the-access-log for the server-side half: nginx logs `$uri`, not `$request`).

---

## Feature: User

The user-facing side of this feature is the **Settings** view (`/settings`), a
public route whose sections are filtered by identity: **General** for everyone
(the colour theme is a browser preference, so it is settable before logging in
and in Guest Demo), **User Settings** for any visitor with a profile, and
**Admin** for administrators.

### userStore — State Shape

```js
{
  currentUser: UserDTO | null,
  isLoading: boolean,
  error: string | null,
  displayName: computed,    // currentUser.displayName || username || 'Traveler'
  userRole: computed,       // currentUser.role ('USER' | 'ADMIN') || null — the raw backend role
  userRoleLabel: computed,  // 'Administrator' | 'Standard user' (see features/user/userUtils.js)
  isAdmin: computed,        // true for ADMIN; gates the Settings → Admin section (never in Guest Demo)
  userId: computed,         // currentUser.id || null
  isUserLoaded: computed    // currentUser !== null
}

```

This store is the single owner of the signed-in profile: `GET /api/auth/me` is only
used as a session probe (its body is discarded), and the profile itself comes from
`GET /api/users/me`. Admin surfaces read `isAdmin` from here rather than
re-deriving a role check.

---

### GET /api/users/me

- **Service**: UserService.fetchCurrentUserInfo()
- **Store Action**: userStore.fetchCurrentUser()
- **Guest Mode**: Mocked — returns guest_user from localStorage
- **Response**: UserDTO `{ id, username, email, displayName, role }`
- **Status Codes**: 200, 401, 404
- **Notes**: Called on app startup and when entering or exiting guest mode.

---

### GET /api/users/search

- **Service**: CampaignService.searchUsers(query)
- **Store Action**: campaignStore.searchUsers(query)
- **Guest Mode**: Mocked — filters guest_users by query string (matches displayName, username, email)
- **Query Params**: query (search string)
- **Response**: Array of UserDTO (excludes self per contract)
- **Status Codes**: 200, 401
- **Notes**: Used in campaign participant management to find users to add.

---

### GET /api/users/{id}

- **Service**: UserService.fetchUser(userId)
- **Store Action**: none — deliberately not exposed as a store action, since it would overwrite the signed-in profile (`userStore.currentUser`) with somebody else's data
- **Guest Mode**: Not mocked (admin-only endpoint)
- **Response**: UserDTO `{ id, username, email, displayName, role }`
- **Status Codes**: 200, 401, 403, 404
- **Notes**: Requires ROLE_ADMIN per contract. The admin user list uses `/api/admin/users` instead; this single-user endpoint is currently unused by the UI.

---

### PUT /api/users/{id}

- **Service**: UserService.updateProfile(userId, data)
- **Store Action**: Not directly called by store (store uses PATCH instead)
- **Guest Mode**: Not mocked
- **Request**: Full UserDTO object
- **Response**: UserDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Frontend currently only uses PATCH for updates.

---

### PATCH /api/users/{id}

- **Service**: UserService.updateProfileField(userId, field, value)
- **Store Action**: userStore.updateDisplayName(value)
- **Guest Mode**: Mocked — updates `guest_user`'s display name; a change to another account is rejected with 403, and `email`/`userName` with 400 (the mock mirrors the live contract)
- **Request**: `UserProfileUpdateDTO { displayName }` — the display name only (trimmed, max 50 chars)
- **Response**: UserDTO
- **Status Codes**: 200, 400, 401, 403, 404, 409 (display name already in use)
- **Notes**: The email is the OAuth account-linking and whitelist key and the username is the login identity, so neither is self-service — a request carrying either is refused with 400 and changes nothing. Reached from Settings → User Settings.

---

## Feature: Spell

### spellStore — State Shape

```js
{
  searchResults: Array<object>,           // Current search results (array of normalized spell objects)
  spellCache: Map<string, object>,        // Spell cache keyed by Open5e key
  currentQuery: string,                   // Current search query
  currentPage: number,                    // Current page number (default 1)
  totalResults: number | null,            // Total number of results
  isLoading: boolean,                     // Loading state
  error: string | null,                   // Error message
  searchHistory: Array<{query: string, timestamp: number}>, // Search history (max 10 entries)
  hasNextPage: computed,                  // Whether there are more pages (50 results per page)
  hasPreviousPage: computed,             // Whether there is a previous page
  totalPages: computed                    // Total number of pages based on 50 results per page
}
```

### Normalized Spell Object Shape

```js
{
  key: string,                            // Open5e spell key (e.g., 'srd_fireball')
  name: string,                           // Spell name
  level: number,                          // Spell level (0-9)
  school: string,                         // School of magic name
  schoolKey: string,                      // School of magic key
  documentKey: string,                    // Source document key (e.g., 'srd-2014')
  documentName: string,                   // Source document name
  sourceLabel: string,                    // Human-readable source label (e.g., 'SRD 5.1')
  classes: Array<string>,                 // Class names that can use this spell
  desc: string,                           // Spell description
  range: string,                          // Spell range
  duration: string,                       // Spell duration
  casting_time: string,                   // Casting time
  components: Array<string>,              // Components (V, S, M)
  material: string,                       // Material component description
  ritual: boolean,                        // Is ritual spell
  concentration: boolean,                 // Requires concentration
  higher_level: string,                   // Higher level description
  isHomebrew: boolean                     // Homebrew flag (future feature)
}
```

---
### GET /api/spells (or Open5e /v2/spells/)

- **Service**: SpellService.searchSpells(query, page)[cite: 3]
- **Store Action**: spellStore.searchSpells(query, page) or spellStore.debouncedSearch(query, page)[cite: 3]
- **Routing Policy**:
  - **Authenticated** (OAuth & Demo backend login): calls backend `GET /api/spells` (returns `{ count, results }`)[cite: 1, 3]
  - **Unauthenticated & Guest mode**: calls Open5e API v2 directly via `open5eAxios` (public SRD data)[cite: 3]
  - *(Note: Character spell assignments /api/characters/{id}/spells are mocked in localStorage during Guest mode, but spell discovery queries Open5e directly)*[cite: 3]
- **Query Params (Backend)**:
  - `query`: Search string matched case-insensitively against spell name[cite: 1]
  - `page`: Page number (0-indexed, default 0; frontend passes `page - 1`)[cite: 1, 3]
  - `size`: Results per page (default 20, max 100; frontend passes 50)[cite: 1, 3]
- **Query Params (Open5e Direct)**:
  - `name__contains`: Search term for spell name[cite: 3]
  - `page`: Page number (1-indexed, default 1)[cite: 3]
  - `limit`: Results per page (fixed at 50)[cite: 3]
  - `ordering`: Sort order (fixed at 'name')[cite: 3]
- **Response Body**: `{ count: number, next: string|null, previous: string|null, results: Array<Spell> }`[cite: 3]
- **Status Codes**: 200, 401[cite: 1, 3]
- **Notes**: Debounced by 300ms in store to reduce API load[cite: 3]. Results are automatically normalized and cached[cite: 3]. Blank query returns `{ count: 0, results: [] }` on backend[cite: 1].

---

### GET /api/spells/{slug} (or Open5e /v2/spells/{key}/)

- **Service**: SpellService.fetchSpellByKey(key)[cite: 3]
- **Store Action**: spellStore.fetchSpellByKey(key)[cite: 3]
- **Routing Policy**:
  - **Authenticated**: calls backend `GET /api/spells/{slug}`[cite: 3, 4]
  - **Unauthenticated & Guest mode**: calls Open5e API v2 directly via `open5eAxios` (public SRD data)[cite: 3]
- **Response**: Single normalized Spell object (or full raw Open5e object mapped from backend raw JSON)[cite: 1, 3]
- **Status Codes**: 200, 401, 404[cite: 3]
- **Notes**: Checks local `spellCache` first before making API call[cite: 3]. Spell is normalized and cached on fetch[cite: 3].
---

### POST /api/characters/{characterId}/spells

- **Service**: SpellService.saveSpellToCharacter(characterId, normalizedSpell)
- **Store Action**: spellStore.saveSpellToCharacter(characterId, spell)
- **Guest Mode**: Mocked — saves spell to character.spells array in guest_characters
- **Request Body**:
  ```js
  {
    slug: string,              // Spell key (from normalizedSpell.key)
    name: string,              // Spell name (from normalizedSpell.name)
    isHomebrew: boolean,       // Homebrew flag (default false) — currently ignored by backend
    spellDetails: object       // Full normalized spell object for guest mode and future homebrew features — currently ignored by backend
  }
  ```
- **Response**: Saved spell response
- **Status Codes**: 200, 400, 401, 404
- **Notes**: Unified payload structure ensures Spring Boot can find 'slug' and 'name' at root level while preserving full spell data for guest mode and future homebrew features.

---

### GET /api/characters/{characterId}/spells

- **Service**: SpellService.fetchCharacterSpells(characterId)
- **Store Action**: spellStore.fetchCharacterSpells(characterId)
- **Guest Mode**: Mocked — returns character.spells array from guest_characters
- **Response**: Array of spell objects (with spellData wrapper in backend response)
- **Status Codes**: 200, 401, 404
- **Notes**: Response items are expected to have spellData property containing the normalized spell object. Spells are automatically normalized and cached.

---

### DELETE /api/characters/{characterId}/spells/{spellKey}

- **Service**: SpellService.removeSpellFromCharacter(characterId, spellKey)
- **Store Action**: spellStore.removeSpellFromCharacter(characterId, spellKey)
- **Guest Mode**: Mocked — removes spell from character.spells array in guest_characters
- **Status Codes**: 200, 401, 404
- **Notes**: spellKey is the Open5e key/slug of the spell to remove.

---

## Feature: Character

### characterStore — State Shape

```js
{
  characters: Array<CharacterOutputDTO>,
  currentCharacter: CharacterOutputDTO | null,
  isLoading: boolean,
  sortedCharacters: computed       // getter: most recently viewed first (see
                                   // "View history" below)
}

```

---

### POST /api/characters

- **Service**: CharacterService.createCharacter(data)
- **Store Action**: characterStore.createCharacter(data)
- **Guest Mode**: Mocked — adds character to guest_characters with generated ID
- **Request**: CharacterInputDTO `{ ownerId?, campaignId?, name, systemType, notes?, avatarUrl?, appearance?, backstory?, privateBackstory?, dnd5e?, offworlders? }`
  - `backstory` / `privateBackstory` are free-text core-character fields (any system). `backstory` is public to the campaign; `privateBackstory` is returned only to the owner or the campaign GM. Writes are owner-only.
  - `systemType` is optional: `null` (which is what the form sends for "No system") creates a **system-less character** — only the generic core fields exist and neither nested block is stored. The server no longer defaults it to `DND5E`.
  - `dnd5e = { level, characterClass, race, hitPoints, armorClass, stats }` (used when `systemType === 'DND5E'`)
  - `offworlders = { characterClass, species, xp, health, currentHealth, healthModifier, armor, supply, supplyMax, credits, stats, skills, abilities, weapons, items }` (used when `systemType === 'OFFWORLDERS'`)
    - `supplyMax` is fixed at `3` per the rules (not player-editable).
    - `armor` is a single value 0–3 (0 None / 1 Light / 2 Heavy / 3 Assault) — there are no armor items.
    - `weapons = [ { type: 'Light' | 'Medium' | 'Heavy', description } ]`; damage and `heavy` are derived from `type`, never stored.
    - `items = [ { name, description } ]` (free-form — custom weapons and everything else).
- **Response**: CharacterOutputDTO
- **Status Codes**: 201, 400, 401
- **Notes**: ownerId defaults to logged-in user if null.

---

### GET /api/characters/me

- **Service**: CharacterService.fetchAllCharactersForCurrentUser()
- **Store Action**: characterStore.fetchAllCharactersForCurrentUser()
- **Guest Mode**: Mocked — returns characters where ownerId equals guest_demo
- **Response**: Array of CharacterOutputDTO
- **Status Codes**: 200, 401
- **Notes**: Returns all characters owned by the logged-in user.

---

### GET /api/characters/without-campaign

- **Service**: CharacterService.fetchCharactersWithoutCampaign()
- **Store Action**: characterStore.fetchCharactersWithoutCampaign()
- **Guest Mode**: Mocked — returns characters with campaignId equal to null
- **Response**: Array of CharacterOutputDTO
- **Status Codes**: 200, 401
- **Notes**: Used when importing characters into campaigns.

---

### GET /api/characters/{id}

- **Service**: CharacterService.fetchCharacter(characterId)
- **Store Action**: characterStore.fetchCharacter(characterId)
- **Guest Mode**: Mocked — finds character by ID in guest_characters
- **Response**: CharacterOutputDTO
- **Status Codes**: 200, 401, 404
- **Notes**: Checks local cache first before making API call.

---

### PATCH /api/characters/{id}

- **Service**: CharacterService.updateCharacter(characterId, data)
- **Store Action**: characterStore.updateCharacter(characterId, data)
- **Guest Mode**: Mocked — merges data into character in guest_characters
- **Request**: Full CharacterInputDTO (validated)
- **Response**: CharacterOutputDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Also supports updateCharacterField for single-field updates. The Offworlders sheet's owner-only inline +/- steppers (Health → `currentHealth`, Supply, Credits, XP) use it, sending the full `offworlders` block so guest mode's shallow merge cannot drop the other fields.

---

### POST /api/characters/{id}/image

- **Service**: CharacterService.uploadCharacterImage(characterId, imageFile)
- **Store Action**: characterStore.uploadCharacterImage(characterId, imageFile)
- **Guest Mode**: Mocked — returns a default SVG path
- **Request**: multipart/form-data with field name file
- **Max File Size**: 5MB per file (configurable via the backend's `app.upload.max-file-size`; multipart limits are 8MB)
- **Response**: CharacterOutputDTO (with updated imageUrl)
- **Status Codes**: 200, 400, 401, 403
- **Notes**: Extracts error message from response for user notification.

---

### POST /api/characters/{id}/images

- **Service**: CharacterService.addCharacterImage(characterId, imageFile)
- **Store Action**: characterStore.addCharacterImage(characterId, imageFile)
- **Guest Mode**: Mocked — appends a stock placeholder URL to the character's `imageUrls`
- **Request**: multipart/form-data with field name file
- **Max File Size**: 5MB per file (configurable via the backend's `app.upload.max-file-size`; multipart limits are 8MB)
- **Response**: CharacterOutputDTO (with the image appended to `imageUrls`)
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Appends to the character's gallery, which sits beside the single `avatarUrl` portrait. Edited from Edit character (pick → reposition → upload, immediately). In an Offworlders campaign the gallery and the character's notes are what the ship's crew card shows — the crew **is** the campaign's characters. A card's images open in the ship's lightbox under the character's name, stepping through that character's own pictures; they are deliberately **not** part of the ship's gallery.

---

### DELETE /api/characters/{id}/images?url={url}

- **Service**: CharacterService.removeCharacterImage(characterId, url)
- **Store Action**: characterStore.removeCharacterImage(characterId, url)
- **Guest Mode**: Mocked — removes the matching URL from the character's `imageUrls`
- **Query Params**: url (the stored image URL)
- **Response**: CharacterOutputDTO (with the image removed)
- **Status Codes**: 200, 401, 403, 404
- **Notes**: The stored file itself is left on the backend, exactly as the ship gallery behaves.

---

### DELETE /api/characters/{id}

- **Service**: CharacterService.deleteCharacter(characterId)
- **Store Action**: characterStore.deleteCharacter(characterId)
- **Guest Mode**: Mocked — removes character from guest_characters
- **Response**: Explicit object or No Content depending on backend sync status
- **Status Codes**: 204, 401, 403, 404
- **Mismatch Note**: Contract specifies 204 No Content, but frontend mock returns an object. Frontend code does not use the response data, making this non-critical.

---

### PATCH /api/characters/{id}/campaign

- **Service**: CampaignService.addCharacterToCampaign(characterId, campaignId)
- **Store Action**: campaignStore.importCharacterToCampaign(characterId, campaignId)
- **Guest Mode**: Mocked — updates character campaignId in guest_characters
- **Request**: `{ campaignId: Long }`
- **Response**: CharacterOutputDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Located in CampaignService due to cross-feature API architecture.

---

### DELETE /api/characters/{id}/campaign

- **Service**: CampaignService.removeCharacterFromCampaign(characterId)
- **Store Action**: campaignStore.removeCharacterFromCampaign(characterId)
- **Guest Mode**: Mocked — sets character campaignId to null
- **Response**: CharacterOutputDTO per contract
- **Status Codes**: 200, 401, 403, 404
- **Notes**: Removes character from campaign without deleting the character asset.

---

## Feature: Campaign

### campaignStore — State Shape

```js
{
  campaigns: Array<CampaignResponseDTO>,
  currentCampaign: CampaignResponseDTO | null,
  campaignCharacters: { [campaignId]: Array<CharacterOutputDTO> },
  isLoading: boolean,
  loadingCharacters: boolean,
  error: string | null,
  sortedCampaigns: computed        // getter: most recently viewed first (see
                                   // "View history" below)
}

```

`sortedCampaigns` is what the campaign list renders; `campaigns` keeps the
backend order so lookups (`getCampaignById`, `getCampaignTitle`, …) are
unaffected. `getCharactersByCampaignId(campaignId)` returns a campaign's
characters in the **fixed party order** — the viewer's own characters first,
then a GM's, then the rest alphabetically
(`campaignUtils.js:sortPartyCharacters`); both the Characters section and the
Overview party preview read it, so the two cannot disagree.

---

### POST /api/campaigns

- **Service**: CampaignService.createCampaign({ name, description, worldLore?, privateDescription?, primarySystem? })
- **Store Action**: campaignStore.createCampaign({ name, description, worldLore?, privateDescription?, primarySystem? })
- **Guest Mode**: Mocked — creates campaign in guest_campaigns with generated ID
- **Request**: `{ name, description, worldLore?, privateDescription?, primarySystem? }` where `primarySystem` is `DND5E` | `OFFWORLDERS` | null, `worldLore` is the public setting material and `privateDescription` is the GM-only notes (labelled "GM notes" in the UI)
- **Response**: CampaignResponseDTO
- **Status Codes**: 201, 400, 401
- **Notes**: Automatically fetches updated campaign list after successful creation. If `primarySystem` is `OFFWORLDERS`, the backend also creates the campaign's default ship.

---

### GET /api/campaigns

- **Service**: CampaignService.fetchAllCampaigns()
- **Store Action**: campaignStore.fetchAllCampaigns()
- **Guest Mode**: Mocked — returns all campaigns from guest_campaigns
- **Response**: Array of CampaignResponseDTO
- **Status Codes**: 200, 401
- **Notes**: Returns all campaigns with no filtering. Contract specifies no filtering, but frontend utilizes the specific endpoint for user-filtered views.

---

### GET /api/campaigns/me

- **Service**: CampaignService.fetchAllCampaignsForCurrentUser()
- **Store Action**: campaignStore.fetchAllCampaignsForCurrentUser()
- **Guest Mode**: Mocked — returns all campaigns (guest mode bypasses user filtering)
- **Response**: Array of CampaignResponseDTO (campaigns where user is a participant)
- **Status Codes**: 200, 401
- **Notes**: Primary method for loading user campaigns.

---

### GET /api/campaigns/{id}

- **Service**: CampaignService.fetchCampaign(id)
- **Store Action**: campaignStore.fetchCampaign(id)
- **Guest Mode**: Mocked — finds campaign by ID in guest_campaigns
- **Response**: CampaignResponseDTO `{ id, name, description, worldLore, privateDescription, imageUrl, primarySystem, ownerId, participants }`
- **Notes**: `privateDescription` is `null` unless the requester is the campaign owner or a campaign GM; `worldLore` is always included.
- **Status Codes**: 200, 401, 403, 404
- **Notes**: Requires authorized participant per contract definition.

---

### PUT /api/campaigns/{id}

- **Service**: CampaignService.updateCampaignInfo(campaignId, { name, description, worldLore, privateDescription, primarySystem })
- **Store Action**: campaignStore.updateCampaignInfo(campaignId, campaignData)
- **Guest Mode**: Mocked — updates campaign in guest_campaigns
- **Request**: `{ name, description, worldLore, privateDescription, primarySystem }` where `primarySystem` is `DND5E` | `OFFWORLDERS` | null, `worldLore` is the public setting material and `privateDescription` is the GM-only notes (labelled "GM notes" in the UI)
- **Response**: CampaignResponseDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Updates local state immediately after successful API callback. Setting `primarySystem` to `OFFWORLDERS` creates the campaign's default ship the first time (idempotent); changing away from `OFFWORLDERS` keeps the ship.

---

### POST /api/campaigns/{id}/image

- **Service**: CampaignService.uploadCampaignImage(campaignId, imageFile)
- **Store Action**: campaignStore.uploadCampaignImage(campaignId, imageFile)
- **Guest Mode**: Mocked — returns a fallback stock image URL
- **Request**: multipart/form-data with field name file
- **Max File Size**: 5MB per file (configurable via the backend's `app.upload.max-file-size`; multipart limits are 8MB)
- **Response**: CampaignResponseDTO (with updated imageUrl)
- **Status Codes**: 200, 400, 401, 403
- **Notes**: Extracts error message from string response for UI notification layer.

---

### DELETE /api/campaigns/{id}

- **Service**: CampaignService.deleteCampaign(campaignId)
- **Store Action**: campaignStore.deleteCampaign(campaignId)
- **Guest Mode**: Mocked — removes campaign from guest_campaigns and clears character campaignIds
- **Response**: Explicit object or No Content depending on backend sync status
- **Status Codes**: 204, 401, 403, 404
- **Mismatch Note**: Contract specifies 204 No Content, but frontend mock returns an object. Frontend code does not use the response data, making this non-critical.

---

### PATCH /api/campaigns/{id}/owner

- **Service**: CampaignService.transferCampaignOwnership(campaignId, newOwnerId)
- **Store Action**: campaignStore.transferCampaignOwnership(campaignId, newOwnerId)
- **Guest Mode**: Mocked — updates campaign ownerId in guest_campaigns
- **Request**: `{ newOwnerId: Long }`
- **Response**: CampaignResponseDTO
- **Status Codes**: 200, 401, 403, 404
- **Notes**: Requires current owner privileges. Refreshes the campaign list after execution.

---

### PATCH /api/campaigns/{id}/participants

- **Service**: CampaignService.addParticipants(campaignId, participantsToAdd)
- **Store Action**: campaignStore.addParticipantsToCampaign(campaignId, participantsToAdd)
- **Guest Mode**: Mocked — appends participants to campaign participant list
- **Request**: `{ participantsToAdd: [ ParticipantResponseDTO ], participantIdsToRemove: [] }`
- **Response**: CampaignResponseDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Also handles player removal flows via removeParticipants.

---

### PATCH /api/campaigns/{id}/participants/{participantId}/nickname

- **Service**: CampaignService.updateParticipantNickname(campaignId, participantId, nickname)
- **Store Action**: campaignStore.updateParticipantNickname(campaignId, participantId, nickname)
- **Guest Mode**: Mocked — updates participant nickname inside the campaign scope
- **Request**: Plain string (Content-Type: text/plain)
- **Response**: CampaignResponseDTO
- **Status Codes**: 200, 401, 403, 404
- **Notes**: Sends plain text payload instead of a JSON object.

---

### PATCH /api/campaigns/{id}/participants/{participantId}/role

- **Service**: CampaignService.updateParticipantRole(campaignId, participantId, role)
- **Store Action**: campaignStore.updateParticipantRole(campaignId, participantId, role)
- **Guest Mode**: Mocked — updates participant role inside the campaign scope
- **Request**: Plain string (either GM or PLAYER with Content-Type: text/plain)
- **Response**: CampaignResponseDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Sends plain text payload. Validates role structure against allowable schema.

---

### GET /api/characters?campaignId={campaignId}

- **Service**: CampaignService.fetchCharactersForCampaign(campaignId)
- **Store Action**: campaignStore.fetchCharactersForCampaign(campaignId)
- **Guest Mode**: Mocked — filters character assets by campaignId
- **Response**: Array of CharacterOutputDTO
- **Status Codes**: 200, 401
- **Notes**: Fetches characters linked to a specific campaign. Stores data in the campaignCharacters map keyed by campaignId. Read back through `campaignStore.getCharactersByCampaignId`, which applies the fixed party order (own characters → GM characters → alphabetical).

---

## Feature: Ship

### shipStore — State Shape

```js
{
  ship: ShipDTO | null,     // The campaign's Offworlders ship
  isLoading: boolean,
  isSaving: boolean,
  error: string | null,
  hasConflict: boolean      // last save was rejected with 409 (optimistic concurrency)
}
```

---

### GET /api/campaigns/{id}/ship

- **Service**: ShipService.fetchShip(campaignId)
- **Store Action**: shipStore.fetchShip(campaignId)
- **Guest Mode**: Mocked — reads `guest_ships` by campaignId (404 when none)
- **Response**: ShipDTO `{ id, campaignId, name, hull, hullMax, armor, damage, driveFuel, maxDriveFuel, credits, upgrades, notes, imageUrl, imageUrls, version }`
- **Status Codes**: 200, 401, 403, 404
- **Notes**: Requires a campaign participant. A 404 means no ship exists yet; the store falls back to the rulebook defaults (Hull 15, Armor 0, Damage 1D6, Max Drive Fuel 4). Only shown in the UI when the campaign's `primarySystem` is `OFFWORLDERS`.

---

### PUT /api/campaigns/{id}/ship

- **Service**: ShipService.saveShip(campaignId, ship)
- **Store Action**: shipStore.saveShip(campaignId, ship)
- **Guest Mode**: Mocked — upserts `guest_ships` and rejects a stale `version` with 409
- **Request**: ShipDTO fields (including the `version` read from the previous fetch)
- **Response**: ShipDTO
- **Status Codes**: 200, 400, 401, 403, 409
- **Notes**: Upsert — creates the ship with defaults if the campaign has none, otherwise updates in place. Every campaign participant may view and edit; there is no DELETE. Optimistic concurrency: sending a stale `version` returns 409 and the UI prompts a reload. The sheet's inline +/- steppers (Hull, Drive fuel, Credits) save through `shipStore.adjustShipField`, which sends the same payload but suppresses the success toast.

---

### POST /api/campaigns/{id}/ship/image

- **Service**: ShipService.uploadShipImage(campaignId, imageFile)
- **Store Action**: shipStore.uploadShipImage(campaignId, imageFile)
- **Guest Mode**: Mocked — returns a stock placeholder image URL
- **Request**: multipart/form-data with field name file
- **Max File Size**: 5MB per file (configurable via the backend's `app.upload.max-file-size`; multipart limits are 8MB)
- **Response**: ShipDTO (with the updated `imageUrl`)
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Replaces the ship's profile image, which is shown in the ship view instead of the campaign image. Falls back to `/defaultShip.svg` when unset.

---

### POST /api/campaigns/{id}/ship/images

- **Service**: ShipService.addShipGalleryImage(campaignId, imageFile)
- **Store Action**: shipStore.addGalleryImage(campaignId, imageFile)
- **Guest Mode**: Mocked — appends a stock placeholder image URL
- **Request**: multipart/form-data with field name file
- **Max File Size**: 5MB per file (configurable via the backend's `app.upload.max-file-size`; multipart limits are 8MB)
- **Response**: ShipDTO (with the image appended to `imageUrls`)
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Gallery images (drawings, maps, handouts). The UI shows them in a grid with a lightbox overlay.

---

### DELETE /api/campaigns/{id}/ship/images?url=

- **Service**: ShipService.removeShipGalleryImage(campaignId, url)
- **Store Action**: shipStore.removeGalleryImage(campaignId, url)
- **Guest Mode**: Mocked — removes the matching URL from `imageUrls`
- **Query Params**: url (the stored image URL)
- **Response**: ShipDTO (with the image removed)
- **Status Codes**: 200, 401, 403, 404

---

### The crew (no endpoint)

The ship view also shows a crew manifest, but there is nothing to fetch or save
for it: **the crew is the campaign's characters.** `ShipSection.vue` reads them
through `campaignStore.fetchCharactersForCampaign(campaignId)` /
`getCharactersByCampaignId(campaignId)` (see `GET /api/characters?campaignId=`)
and renders `ShipCharactersSection.vue`, one card per character — its portrait,
its name, the player who brings it (`ownerId` matched against the campaign's
participants), its `notes` and its `imageUrls`.

Nothing is edited there. The notes come from `PATCH /api/characters/{id}`, the
images from `POST`/`DELETE /api/characters/{id}/images`, both owner-only and both
reached from Edit character — which also says so in the UI ("shown under the ship
… on this character's crew card").

A card's images open in the ship's lightbox, captioned with the character's name
and stepping through **that character's** pictures; the ship's gallery holds only
the ship's own images. The two sets are kept apart on purpose: the ship gallery is
the ship's art and every image in it is the ship's to remove, while a character's
art belongs to its owner and is removed in Edit character.

---

## Protected Routes

| Route                | Requires Auth | Requires session | Notes                                 |
| -------------------- | ------------- | ---------------- | ------------------------------------- |
| /                    | No            | No               | Public; a session also gets its campaigns/characters as carousels |
| /about               | No            | No               | Public                                |
| /spells              | No            | No               | Public                                |
| /login               | No            | No               | Redirects authenticated users to home |
| /logout              | No            | No               | Clears auth state                     |
| /oauth-redirect      | No            | No               | Handles OAuth callback                |
| /user-profile        | Yes           | Yes              | Requires authentication               |
| /campaign/:id        | No            | Yes              | Guest accessible                      |
| /campaigns           | No            | Yes              | Guest accessible                      |
| /characters/create   | No            | Yes              | Guest accessible                      |
| /characters/:id/edit | No            | Yes              | Guest accessible                      |
| /characters/:id      | No            | Yes              | Guest accessible                      |
| /characters          | No            | Yes              | Guest accessible                      |
| /under-construction  | No            | No               | Public                                |
| /:catchAll           | No            | No               | 404 page                              |

---

## Feature: Messages

### messageStore — State Shape

```js
{
  messages: Array,              // Array of MessageDTO for the current campaign
  isLoading: boolean,           // Loading indicator
  error: string | null,         // Error message string
}
```

---

### GET /api/messages/campaign/{campaignId}

- **Service**: MessageService.fetchCampaignMessages(campaignId)
- **Store Action**: messageStore.fetchMessagesForCampaign(campaignId)
- **Guest Mode**: Mocked — filters guest_messages localStorage list by campaignId
- **Response**: Array of MessageDTO `{ id, campaignId, userId, messageBody, createdAt, updatedAt }`
- **Status Codes**: 200, 401, 403, 404
- **Notes**: Messages are visible only to campaign participants. Fetched on mount in the MessageBoard component.

---

### GET /api/messages/{id}

- **Service**: MessageService.fetchMessage(id)
- **Store Action**: Not directly exposed via store action (used internally)
- **Guest Mode**: Mocked — finds message by ID in localStorage
- **Response**: MessageDTO
- **Status Codes**: 200, 401, 403, 404

---

### POST /api/messages

- **Service**: MessageService.createMessage(campaignId, messageBody)
- **Store Action**: messageStore.createMessage(campaignId, messageBody)
- **Guest Mode**: Mocked — generates message with guest_demo as sender, stores in localStorage
- **Request**: `{ campaignId: Long, messageBody: string (max 10000 chars) }`
- **Response**: MessageDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: userId is set automatically from JWT/auth principal. Not included in request payload.

---

### DELETE /api/messages/{id}

- **Service**: MessageService.deleteMessage(id)
- **Store Action**: messageStore.deleteMessage(messageId)
- **Guest Mode**: Mocked — only allows delete if the current guest user is the message sender; otherwise rejects with 403
- **Status Codes**: 204, 401, 403, 404
- **Notes**: Only the message's original sender can delete it. Campaign GMs cannot delete others' messages. UI only shows delete button for own messages to prevent unnecessary 403s.

---

### MessageDTO

```json
{
  "id": 1,
  "campaignId": 1,
  "userId": 3,
  "messageBody": "Hello!",
  "createdAt": "2026-05-29T10:00:00",
  "updatedAt": "2026-05-29T10:00:00"
}
```

---

---

## Feature: Journal

Each campaign participant has one private journal per campaign: a book of
numbered markdown pages. **Only its owner can read or write it** — another
participant, the campaign owner and a GM are all refused (403), and a page that
belongs to somebody else answers 404 with the same body as an unknown id. That is
enforced by the backend; hiding the section is only convenience.

The campaign view shows it as **My journal** between Messages and the
system-specific sections. It is the one campaign section gated on being a
participant (the `SECTIONS` entry is flagged `participantOnly`), so a campaign
owner without a seat never sees it.

The page after the last stored one is a blank **virtual** page
(`lastPageNumber = pageCount + 1`): nothing is stored for it, so opening a journal
creates no rows. Writing on it creates a page; clearing a stored last page removes
it again, and blank pages at the end collapse into the single virtual one — a
journal never accumulates empty rows. Inserting a page after page 3 makes the old
page 4 the new page 5, because a page number is a position and not an identity
(every page keeps its own stable id).

Saving is autosaved with an 800 ms debounce (`AUTOSAVE_DELAY_MS`) and every
navigation point flushes what is pending. The text is additionally mirrored in
localStorage on each keystroke (`journalDraft.js`), which is what makes a closed
tab lose nothing: the mirror is restored on the next visit.

### journalStore — State Shape

```js
{
  journal: { id, campaignId, userId, pageCount, pages: JournalPageDTO[] } | null,
  currentPageNumber: number,   // 1..lastPageNumber
  draft: string,               // the editor's text for the page on screen
  isLoading: boolean,
  isSaving: boolean,
  saveState: 'idle' | 'dirty' | 'saving' | 'saved' | 'error',
  hasConflict: boolean,        // the last save was refused with 409
  error: string | null,
  // computed: pages, pageCount, lastPageNumber,
  //           currentPage (null on the virtual page), charCount, atPageLimit
}
```

---

### GET /api/journals/campaign/{campaignId}

- **Service**: JournalService.fetchJournal(campaignId)
- **Store Action**: journalStore.fetchJournal(campaignId)
- **Guest Mode**: Mocked — reads `guest_journals` / `guest_journal_pages`, participant-only
- **Response**: `JournalDTO { id, campaignId, userId, pageCount, pages }`. A read creates nothing, so a participant who has not written yet gets `{ id: null, pageCount: 0, pages: [] }`
- **Status Codes**: 200, 401, 403, 404

---

### POST /api/journals/campaign/{campaignId}/pages

- **Service**: JournalService.createPage(campaignId, { afterPageId, content })
- **Store Action**: journalStore.saveNow() (the first write on the virtual page) and journalStore.insertPageAfterCurrent()
- **Guest Mode**: Mocked — participant-only; appending a blank page writes nothing
- **Request**: `{ afterPageId: number|null, content: string }` — `afterPageId` null appends at the end; the pages after it renumber
- **Response**: `JournalDTO` — the whole journal after the change
- **Status Codes**: 201, 400, 401, 403, 404 — 400 past `app.journal.max-page-length` or `app.journal.max-pages`

---

### PATCH /api/journals/pages/{pageId}

- **Service**: JournalService.updatePage(pageId, { content, version })
- **Store Action**: journalStore.setContent() (debounced autosave) and journalStore.flush()
- **Guest Mode**: Mocked — a foreign page answers 404, a stale token 409, a missing token 400
- **Request**: `{ content: string, version: number }` — `version` is **required**; it is the token from the page as it was loaded
- **Response**: `{ page: JournalPageDTO | null, pageCount: number }` — `page` is null when clearing the last page removed it
- **Status Codes**: 200, 400, 401, 403, 404, 409

---

### DELETE /api/journals/pages/{pageId}

- **Service**: JournalService.deletePage(pageId)
- **Store Action**: journalStore.deleteCurrentPage()
- **Guest Mode**: Mocked — a foreign page answers 404
- **Response**: `JournalDTO` — the whole journal after the change
- **Status Codes**: 200, 401, 403, 404

---

### JournalPageDTO

```json
{
  "id": 31,
  "pageNumber": 1,
  "content": "# Session 1\n\nWe met **Old Man Winters** at the docks.",
  "version": 0,
  "createdAt": "2026-05-29T10:00:00",
  "updatedAt": "2026-05-29T10:00:00"
}
```

`pageNumber` is the page's place in the book (1-based) and is derived from the
order, so inserting or deleting a page renumbers the display without changing any
page's identity.

### Limits

- `journalLimits.js` mirrors the backend's `app.journal.max-page-length` (10 000
  characters) and `app.journal.max-pages` (500). An over-limit value is refused
  **whole**, with a message, and the previous text stays in the field: nothing is
  ever truncated. The counter appears from 90 % of the limit (`COUNTER_THRESHOLD`)
  and turns into the warning style at the limit.

---

## Feature: Planner

The planner is the campaign's first **add-on**: the owner switches it on in
Campaign Settings → Add-ons, and its section then appears in the campaign menu for
everybody in the campaign. The endpoints are the backend's
(`/api/planner/**`) — what a client needs to know is here.

A **plan** is a question the group is answering ("Session 12 — when do we play
next?"), with **candidate dates** and one **answer per member and date**. Any
participant may start a plan, offer dates, answer, decide and reopen; the campaign
owner may take somebody else out of a plan and put them back — their answers survive
either way — and a plan's creator or the owner may delete it.

**The colour marker** is the element itself, computed on the client and never stored:
a date row (and a plan card's best-day line) takes the background of its level. There
is no badge for it — the day is tinted instead of carrying a chip. The four
`.availability-surface-*` classes read the mode-aware `--availability-*-surface` /
`-border` roles, so the hue is the same in light and dark while the lightness
follows the mode.

| Level | Class | When |
|---|---|---|
| full | `.availability-surface-full` (green) | every member still in the plan answered **yes** |
| high | `.availability-surface-high` (orange) | ≥ 70 % |
| medium | `.availability-surface-medium` (yellow) | ≥ 40 % |
| low | `.availability-surface-low` (red) | below that |

The percentage is `yes ÷ roster size`, where the roster is the campaign's
participants minus those who left the plan — so **a member who has not answered
counts against a date**, and green really does mean "everybody still in can come".
`MAYBE` is shown in the roll-call and never counted as a yes. `plannerUtils.js`
holds both the maths and the class names (`availabilitySurfaceClass`,
`answerBadgeClass`, `answerVariant`), so no component decides a colour.

`DECIDED` versus `OPEN`: a decided plan carries the date it settled on, refuses new
dates, answers and roster changes, and is editable again the moment somebody
reopens it. Reopening clears the chosen date.

**One date is edited at a time**, and the editor opens inside that date's own row
(`PlannerDateRow`'s `editor` slot, the form itself in `PlannerDateForm.vue`), which is
what makes it plain which day is being changed — every other date stays exactly as it
looks when nothing is being edited. Starting on another date — or cancelling one that
has been changed — opens `PlannerUnsavedChangesDialog` first, offering **Discard
changes**, **Save changes** and **Continue editing**; `plannerUtils.js:isDateFormDirty`
is what decides whether there is anything to lose. The "offer another date" form below
the list keeps its own draft, so adding a date never disturbs the editor that is open.

### plannerStore — State Shape

```javascript
{
  campaignId: number|string|null,  // the campaign whose plans are loaded
  plans: Array,                    // PlannerPlanDTO[], adopted whole from every answer
  currentPlanId: number|string|null, // the plan on screen (mirrors `?plan=`)
  isLoading: boolean,
  isSaving: boolean,
  hasConflict: boolean,            // a 409 was answered: somebody else got there first
  error: string|null,
}
```

Derived: `openPlans`, `decidedPlans`, `currentPlan`.

### GET /api/planner/campaign/{campaignId}/plans

- **Service**: `PlannerService.fetchPlans(campaignId)`
- **Store Action**: `plannerStore.fetchPlans(campaignId)`
- **Guest Mode**: Mocked — reads `guest_planner_*`, participant-only, and only for a campaign whose `planner` add-on is on
- **Response**: `[ PlannerPlanDTO ]` — open plans first, then the decided ones
- **Status Codes**: 200, 400 (add-on off), 401, 403, 404

### The rest of the surface

Every mutation answers with the **whole plan**, which the store adopts — one
response always describes the new state:

| Call | Store action | Notes |
|---|---|---|
| POST `/api/planner/campaign/{id}/plans` | `createPlan({ title, description })` | 201; opens the new plan |
| PATCH `/api/planner/plans/{planId}` | `updatePlan(plan, { title, description })` | carries `version` (409 when stale) |
| PATCH `/api/planner/plans/{planId}/status` | `decidePlan(plan, dateId)` / `reopenPlan(plan)` | deciding needs one of the plan's own dates; both refetch the list, because the status decides its order |
| DELETE `/api/planner/plans/{planId}` | `deletePlan(plan)` | 204; the store drops it and closes it |
| POST `/api/planner/plans/{planId}/dates` | `addDate(plan, date)` | 201; the same day twice in one plan is 409 |
| PATCH `/api/planner/dates/{dateId}` | `updateDate(date, change)` | carries the date's `version` |
| DELETE `/api/planner/dates/{dateId}` | `deleteDate(date)` | |
| PUT `/api/planner/dates/{dateId}/attendance` | `setAttendance(date, state)` | `YES`/`NO`/`MAYBE`, one row per member and date |
| DELETE `/api/planner/dates/{dateId}/attendance` | `clearAttendance(date)` | back to "not answered" |
| PUT `/api/planner/plans/{planId}/members/me` | `rejoinPlan(plan)` | refused when the owner removed them |
| DELETE `/api/planner/plans/{planId}/members/me` | `leavePlan(plan)` | one exclusion row; answers are kept |
| DELETE `/api/planner/plans/{planId}/members/{memberId}` | `removeMember(plan, memberId)` | campaign owner only |
| PUT `/api/planner/plans/{planId}/members/{memberId}` | `addMember(plan, memberId)` | campaign owner only; the way back for a member the owner removed, and a no-op when they are not out |

A 409 from any of them sets `hasConflict` and shows the conflict sentence instead of
retrying: the caller's copy is simply old.

### URL state

The section is not a route: `?section=planner` shows the planner and `?plan=<id>`
opens one plan, so a refresh or a shared link reopens the same plan. Switching
campaigns (or switching the add-on off) drops the `plan` parameter, because a plan
belongs to exactly one campaign.

### Guest Demo

The planner is mocked per browser (`guest_planner_plans`, `guest_planner_dates`,
`guest_planner_attendances`, `guest_planner_exclusions`) with the backend's rules.
The Strahd campaign ships with the add-on on, four candidate dates that show all
four markers, and one decided plan with a member who left. Managing the add-on
itself is **not** mocked — see ARCHITECTURE.MD → Guest Mode Limitations.

---

## Feature: Admin

The administrator surface lives under `/api/admin/**` and is reached through
**Settings → Admin**. The Settings sidebar only lists that section when
`userStore.isAdmin` is true **and** `authStore.isGuest` is false, but the UI gate
is convenience, not the boundary: the backend protects the prefix twice over (the
`/api/admin/**` request matcher and a class-level
`@PreAuthorize("hasRole('ROLE_ADMIN')")`), and guest mode serves no
`/api/admin/**` route at all.

### adminStore — State Shape

```js
{
  users: UserDTO[],                // every account, with its role
  whitelist: WhitelistEntryDTO[],  // every row, active and revoked
  isLoadingUsers: boolean,
  isLoadingWhitelist: boolean,
  savingId: number | string | null, // the row whose controls are busy
  adminCount: computed,             // accounts holding ADMIN
  currentUserId: computed,          // from userStore — that row cannot be edited
  isSelf(user), canChangeRole(user) // the backend's two guards, mirrored for the UI
}

```

Loaded on demand when the section is opened (`adminStore.fetchAll()`), never at
app start. `canChangeRole` mirrors the backend: you cannot change your own role,
and the last administrator cannot be demoted.

---

### GET /api/admin/users

- **Service**: AdminService.fetchUsers()
- **Store Action**: adminStore.fetchUsers() (also via adminStore.fetchAll())
- **Guest Mode**: Not served — the admin surface is absent from guest mode
- **Response**: Array of UserDTO
- **Status Codes**: 200, 401, 403
- **Notes**: Requires ROLE_ADMIN. Guest Demo answers the generic fallback instead (see ARCHITECTURE.MD → Guest Mode Limitations): the demo user is an ordinary `USER`, the section is unreachable, and a request to the endpoint changes nothing.

---

### PATCH /api/admin/users/{id}/role

- **Service**: AdminService.updateUserRole(userId, role)
- **Store Action**: adminStore.changeUserRole(userId, role)
- **Guest Mode**: Not served — the admin surface is absent from guest mode
- **Request**: `{ role: 'USER' | 'ADMIN' }`
- **Response**: UserDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Authorities are rebuilt from the database on every request, so a role change takes effect immediately — the account does not have to log in again. Refused with 400 when the caller targets themselves or when demoting the last administrator. The change also mirrors an *active* whitelist row for the same address, so a rebuilt database does not silently demote the account at its next login.

---

### GET /api/admin/whitelist

- **Service**: AdminService.fetchWhitelist()
- **Store Action**: adminStore.fetchWhitelist()
- **Guest Mode**: Not served — the admin surface is absent from guest mode
- **Response**: Array of WhitelistEntryDTO
- **Status Codes**: 200, 401, 403
- **Notes**: Includes revoked rows (`active: false`), so a decision can be revisited.

---

### POST /api/admin/whitelist

- **Service**: AdminService.addWhitelistEntry(email, role)
- **Store Action**: adminStore.addWhitelistEntry(email, role)
- **Guest Mode**: Not served — the admin surface is absent from guest mode
- **Request**: `{ email, role }` — the address is stored lower-cased
- **Response**: WhitelistEntryDTO (201)
- **Status Codes**: 201, 400, 401, 403
- **Notes**: `email` is unique and removal is a soft delete, so re-adding a revoked address re-activates that row instead of inserting a second one.

---

### PATCH /api/admin/whitelist/{id}

- **Service**: AdminService.updateWhitelistEntry(id, patch)
- **Store Action**: adminStore.updateWhitelistEntry(id, patch)
- **Guest Mode**: Not served — the admin surface is absent from guest mode
- **Request**: `{ role?, active? }` — a null field is left unchanged
- **Response**: WhitelistEntryDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: `active: true` re-admits a revoked address. A body that changes nothing is refused with 400.

---

### DELETE /api/admin/whitelist/{id}

- **Service**: AdminService.removeWhitelistEntry(id)
- **Store Action**: adminStore.revokeWhitelistEntry(id)
- **Guest Mode**: Not served — the admin surface is absent from guest mode
- **Status Codes**: 204, 401, 403, 404
- **Notes**: Soft delete. The row stays in the table (and in the response of GET) with `active: false`; the frontend therefore keeps rendering it, marked "Revoked".

---

### WhitelistEntryDTO

```json
{
  "id": 1,
  "email": "someone@example.com",
  "role": "USER",
  "active": true
}
```

---

### How the whitelist and an account's role differ

They are **not** the same switch, and the Admin section says so in its copy:

- The whitelist is the **login gate**. `CustomOAuth2SuccessHandler` refuses an
  OAuth login whose email has no active row, and reads the row's `role` to decide
  what a *newly created* account is granted.
- An account that already exists keeps its own role — `UserService.findOrCreateOAuthUser`
  returns an email match untouched, so editing a whitelist role changes nothing for
  a user that has already logged in. Changing an existing account is done under
  **Users** (`PATCH /api/admin/users/{id}/role`).
- Addresses are matched case-insensitively on the login path, and stored
  lower-cased on write.

---

## Known Gaps and Todo Items

### Not Yet Implemented (Backend Ready)

- _(none — all backend-ready endpoints have been integrated)_

### Not Yet Implemented (Planned)

- **Character Homebrew Spells**: While the Open5e integration is complete, the homebrew spell creation feature is not yet implemented. The data structure supports it (isHomebrew flag, spellDetails payload), but UI and backend endpoints for creating custom spells are pending. Note: The backend currently ignores these fields in spell save requests.

### Minor Mismatches

- **DELETE Response Handling**: Contract specifies 204 No Content for DELETE operations, but the guest-axios mock returns a custom response object. Frontend functionality is independent of this payload, making it non-critical.
- **User Update**: Backend schema supports PUT /api/users/{id}, whereas the client application relies entirely on PATCH for handling profile mutations.

### Guest Mode Limitations

- User search functionality within Guest Mode references a static guest_users list loaded from demo datasets.
- Campaign participant management inside Guest Mode simulates execution without mutating shared global user records.
- Image upload steps within Guest Mode default to returning structural fallback placeholder graphics.
- The admin surface is **not served at all**: Guest Demo answers the generic
  fallback, the Settings → Admin section is hidden for the whole guest session,
  and the demo user is an ordinary `USER`. `guest_whitelist` no longer exists on
  the client, so the live backend's 400/404 differences for an unknown row or
  account have no guest counterpart.
- **Campaign add-ons are pre-set, and cannot be managed.** `/api/campaigns/{id}/addons`
  is not served and nothing mocks it — an unrouted request resolves to the generic
  fallback (`{ data: null }`), not an error — so the Add-ons block in Campaign
  Settings renders read-only for a guest session (behind the same `.guest-notice` the
  image uploads use). A demo campaign's `addons` come from `demoData.js`, passed
  through by the adapter untouched. Managing add-ons is what Demo Mode
  (`npm run demo` + the backend's `demo` profile) is for.
- **The planner is mocked, per browser.** `/api/planner/**` is served from
  `guest_planner_*` with the backend's rules, and the Strahd campaign ships with the
  planner switched on. See `## Feature: Planner` → Guest Demo.
