# Frontend API Integration Reference

## API Layer Overview

The frontend uses a three-layer API architecture that transparently switches between live backend calls and local mock data.

### src/api/lib/axios.js — Authenticated Axios Instance

- **Base URL**: Configured via the VITE_API_BASE_URL environment variable.
- **Timeout**: 60 seconds.
- **JWT Attachment**: Request interceptor reads auth_token from localStorage and attaches the Authorization Bearer token header.
- **401 Handling**: Response interceptor detects 401 errors, shows a session expiration notification, and calls authStore.clearAuth to log out the user.

### src/api/apiClient.js — Dynamic API Wrapper

- Provides get, post, put, patch, and delete methods.
- **Guest Mode Switching**: Checks authStore.isGuest to determine whether to use axios (live) or guestAxios (mock).
- All feature services import from this module and never use axios.js directly.

### src/api/lib/guest-axios.js — LocalStorage Mock Adapter

- Provides an axios-like interface that reads and writes to localStorage.
- **Storage Keys**: guest_user, guest_users, guest_characters, guest_campaigns.
- **Auto-Normalization**: Handles fallback between snake_case and camelCase key naming.
- **Mock Endpoints**:
  - User profile: /api/users/me, /api/users/search
  - Characters: CRUD operations, campaign assignment
  - Campaigns: CRUD operations, participant management
  - Image uploads: Returns placeholder URLs

### src/api/lib/open5e-axios.js — External API Client

- Placeholder file for Open5e external API integration.
- Currently empty (0 bytes) - implementation pending.
- Intended to provide a clean Axios instance for external Open5e API calls.

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
- **Status Codes**: 302, 400
- **Notes**: OAuth redirect handling via /oauth-redirect route which extracts token from URL and calls authStore.handleOAuthRedirect(token).

---

## Feature: User

### userStore — State Shape

```js
{
  currentUser: UserDTO | null,
  isLoading: boolean,
  error: string | null,
  displayName: computed,   // currentUser.displayName || username || 'Traveler'
  userRole: computed,       // currentUser.role || 'Standard user'
  userId: computed,         // currentUser.id || null
  isUserLoaded: computed    // currentUser !== null
}

```

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
- **Store Action**: userStore.fetchUserById(userId)
- **Guest Mode**: Not mocked (admin-only endpoint)
- **Response**: UserDTO `{ id, username, email, displayName, role }`
- **Status Codes**: 200, 401, 403, 404
- **Notes**: Requires ROLE_ADMIN per contract.

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
- **Store Action**: userStore.updateUserField(field, value)
- **Guest Mode**: Not mocked
- **Request**: `{ [field]: value }` (for example, `{ displayName: "New Name" }`)
- **Response**: UserDTO
- **Status Codes**: 200, 400, 401, 403, 404, 409 (conflict on unique constraint)
- **Notes**: Handles 409 conflict errors with user-friendly messages.

---

## Feature: Character

### characterStore — State Shape

```js
{
  characters: Array<PlayerCharacterOutputDTO>,
  currentCharacter: PlayerCharacterOutputDTO | null,
  isLoading: boolean
}

```

---

### POST /api/characters

- **Service**: CharacterService.createCharacter(data)
- **Store Action**: characterStore.createCharacter(data)
- **Guest Mode**: Mocked — adds character to guest_characters with generated ID
- **Request**: PlayerCharacterInputDTO `{ ownerId, campaignId, name, level, characterClass, imageUrl, race, playerCharacterData }`
- **Response**: PlayerCharacterOutputDTO
- **Status Codes**: 201, 400, 401
- **Notes**: ownerId defaults to logged-in user if null.

---

### GET /api/characters/me

- **Service**: CharacterService.fetchAllCharactersForCurrentUser()
- **Store Action**: characterStore.fetchAllCharactersForCurrentUser()
- **Guest Mode**: Mocked — returns characters where ownerId equals guest_demo
- **Response**: Array of PlayerCharacterOutputDTO
- **Status Codes**: 200, 401
- **Notes**: Returns all characters owned by the logged-in user.

---

### GET /api/characters/without-campaign

- **Service**: CharacterService.fetchCharactersWithoutCampaign()
- **Store Action**: characterStore.fetchCharactersWithoutCampaign()
- **Guest Mode**: Mocked — returns characters with campaignId equal to null
- **Response**: Array of PlayerCharacterOutputDTO
- **Status Codes**: 200, 401
- **Notes**: Used when importing characters into campaigns.

---

### GET /api/characters/{id}

- **Service**: CharacterService.fetchCharacter(characterId)
- **Store Action**: characterStore.fetchCharacter(characterId)
- **Guest Mode**: Mocked — finds character by ID in guest_characters
- **Response**: PlayerCharacterOutputDTO
- **Status Codes**: 200, 401, 404
- **Notes**: Checks local cache first before making API call.

---

### PATCH /api/characters/{id}

- **Service**: CharacterService.updateCharacter(characterId, data)
- **Store Action**: characterStore.updateCharacter(characterId, data)
- **Guest Mode**: Mocked — merges data into character in guest_characters
- **Request**: Full PlayerCharacterInputDTO (validated)
- **Response**: PlayerCharacterOutputDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Also supports updateCharacterField for single-field updates.

---

### POST /api/characters/{id}/image

- **Service**: CharacterService.uploadCharacterImage(characterId, imageFile)
- **Store Action**: characterStore.uploadCharacterImage(characterId, imageFile)
- **Guest Mode**: Mocked — returns a default SVG path
- **Request**: multipart/form-data with field name file
- **Response**: PlayerCharacterOutputDTO (with updated imageUrl)
- **Status Codes**: 200, 400, 401, 403
- **Notes**: Extracts error message from response for user notification.

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
- **Response**: PlayerCharacterOutputDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Located in CampaignService due to cross-feature API architecture.

---

### DELETE /api/characters/{id}/campaign

- **Service**: CampaignService.removeCharacterFromCampaign(characterId)
- **Store Action**: campaignStore.removeCharacterFromCampaign(characterId)
- **Guest Mode**: Mocked — sets character campaignId to null
- **Response**: PlayerCharacterOutputDTO per contract
- **Status Codes**: 200, 401, 403, 404
- **Notes**: Removes character from campaign without deleting the character asset.

---

## Feature: Campaign

### campaignStore — State Shape

```js
{
  campaigns: Array<CampaignResponseDTO>,
  currentCampaign: CampaignResponseDTO | null,
  campaignCharacters: { [campaignId]: Array<PlayerCharacterOutputDTO> },
  isLoading: boolean,
  loadingCharacters: boolean,
  error: string | null
}

```

---

### POST /api/campaigns

- **Service**: CampaignService.createCampaign(name, description)
- **Store Action**: campaignStore.createCampaign(name, description)
- **Guest Mode**: Mocked — creates campaign in guest_campaigns with generated ID
- **Request**: `{ name, description }`
- **Response**: CampaignResponseDTO
- **Status Codes**: 201, 400, 401
- **Notes**: Automatically fetches updated campaign list after successful creation.

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
- **Response**: CampaignResponseDTO `{ id, name, description, imageUrl, ownerId, participants }`
- **Status Codes**: 200, 401, 403, 404
- **Notes**: Requires authorized participant per contract definition.

---

### PUT /api/campaigns/{id}

- **Service**: CampaignService.updateCampaignInfo(campaignId, { name, description })
- **Store Action**: campaignStore.updateCampaignInfo(campaignId, campaignData)
- **Guest Mode**: Mocked — updates campaign in guest_campaigns
- **Request**: `{ name, description }`
- **Response**: CampaignResponseDTO
- **Status Codes**: 200, 400, 401, 403, 404
- **Notes**: Updates local state immediately after successful API callback.

---

### POST /api/campaigns/{id}/image

- **Service**: CampaignService.uploadCampaignImage(campaignId, imageFile)
- **Store Action**: campaignStore.uploadCampaignImage(campaignId, imageFile)
- **Guest Mode**: Mocked — returns a fallback stock image URL
- **Request**: multipart/form-data with field name file
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
- **Response**: Array of PlayerCharacterOutputDTO
- **Status Codes**: 200, 401
- **Notes**: Fetches characters linked to a specific campaign. Stores data in the campaignCharacters map keyed by campaignId.

---

## Protected Routes

| Route                | Requires Auth | Allow Guest | Notes                                 |
| -------------------- | ------------- | ----------- | ------------------------------------- |
| /                    | No            | Yes         | Public                                |
| /about               | No            | Yes         | Public                                |
| /login               | No            | No          | Redirects authenticated users to home |
| /logout              | No            | No          | Clears auth state                     |
| /oauth-redirect      | No            | No          | Handles OAuth callback                |
| /user-profile        | Yes           | No          | Requires authentication               |
| /campaign/:id        | No            | Yes         | Guest accessible                      |
| /campaigns           | No            | Yes         | Guest accessible                      |
| /characters/create   | No            | Yes         | Guest accessible                      |
| /characters/:id/edit | No            | Yes         | Guest accessible                      |
| /characters/:id      | No            | Yes         | Guest accessible                      |
| /characters          | No            | Yes         | Guest accessible                      |
| /under-construction  | No            | Yes         | Public                                |
| /:catchAll           | No            | No          | 404 page                              |

---

## Known Gaps and Todo Items

### Not Yet Implemented (Backend Ready)

- **Messages API**: Backend endpoints exist (GET, POST, DELETE under /api/messages) but frontend integration is pending. Designed for campaign-specific message boards.
- GET /api/messages — Get all messages
- GET /api/messages/campaign/{campaignId} — Get campaign messages
- GET /api/messages/{id} — Get single message
- POST /api/messages — Create message
- DELETE /api/messages/{id} — Delete message

### Not Yet Implemented (Planned)

- **Spells (Open5e Integration)**: Core integration architecture pending on both layers.
- POST /api/characters/{characterId}/spells — Add spell to character
- GET /api/characters/{characterId}/spells — Get character spells

### Minor Mismatches

- **DELETE Response Handling**: Contract specifies 204 No Content for DELETE operations, but the guest-axios mock returns a custom response object. Frontend functionality is independent of this payload, making it non-critical.
- **User Update**: Backend schema supports PUT /api/users/{id}, whereas the client application relies entirely on PATCH for handling profile mutations.

### Guest Mode Limitations

- User search functionality within Guest Mode references a static guest_users list loaded from demo datasets.
- Campaign participant management inside Guest Mode simulates execution without mutating shared global user records.
- Image upload steps within Guest Mode default to returning structural fallback placeholder graphics.
