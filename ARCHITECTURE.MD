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
│   ├── axios.js              # Axios instance with interceptors (JWT, 401-handling)
│   ├── apiClient.js          # Unified API client wrapper. Dynamically switches between axios.js and guest-axios.js based on authStore.isGuest
│   ├── guest-axios.js        # Mock Axios instance using localStorage to handle standalone guest mode requests
│   └── open5eClient.js       # External API wrapper for Open5e (clean Axios instance)
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
│   │   ├── components/
│   │   └── views/
│   ├── character/
│   │   ├── CharacterService.js
│   │   ├── characterStore.js
│   │   ├── components/
│   │   └── views/
│   └── user/
│       ├── UserService.js
│       ├── userStore.js
│       └── UserProfileView.vue
├── App.vue
└── main.js
```

## Feature structure
Each feature follows the same pattern:
- `FeatureService.js` — all API calls for the feature
- `featureStore.js` — Pinia store (state + actions)
- `components/` — UI components used within the feature
- `views/` — routable pages for the feature

## API Architechture & Communication
```
Internal (Live):                axios.js         → apiClient.js     → FeatureService.js → Store
Internal (Guest):               guest-axios.js   → apiClient.js     → FeatureService.js → Store
External: (Open5e - Planned):   open5e-axios.js  → open5eClient.js  → FeatureService.js → Store
```
- `api/axios.js`: Standard Axios instance for authenticated traffic. Automatically attaches JWT headers to requests and intercepts `401 Unauthorized` responses to clear local auth and trigger system notifications.
- `api/apiClient.js`: Dynamic wrapper client. It acts as a gateway that checks `authStore.isGuest` and seamlessly switches all traffic between the live backend client (`axios.js`) and the mock client (`guest-axios.js`). All feature services import from this file.
- `api/guest-axios.js`: Simulates backend behavior inside the browser. It intercepts incoming HTTP requests and redirects full CRUD operations (GET, POST, PUT, PATCH, DELETE) to `localStorage`, enabling full application functionality in standalone mode.
- External APIs (e.g., Open5e) are handled directly from the browser using a dedicated Axios instance (`open5eClient.js`).

## Authentication
- JWT-based authentication with state persisted and managed in `authStore` (Pinia).
- OAuth2 integration via Google and GitHub, with incoming tokens and redirects handled by `OAuthRedirect.vue`.
- Auth state persisted in `authStore` (Pinia)

## Guest Mode
Standalone preview mode populated entirely via mock data from `src/data/demoData.js`. When activated, state changes are written directly to `localStorage`. Image uploads are not supported in guest mode and are gracefully mocked out or bypassed via a disclaimer.

## Component conventions (target pattern)
- **Smart components** (views, containers): handle store calls and logic
- **Dumb/presentational components**: receive props, emit events, no store access
- **Base components**: generic UI building blocks in `src/components/base/`
- Always Composition API with `<script setup>` — no Options API components

### State management
- Pinia stores are the single source of truth
- Components read state via `storeToRefs()` for reactivity
- API calls live in Service files, called from store actions

### Routing & Navigation
- Protected routes are explicitly flagged using `meta: { requiresAuth: true }`.
- A global router navigation guard validates sessions and initializes user context via `authStore.initializeAuth()` on the initial application boot.

## General Practices
- Absolute imports are strictly enforced across the codebase using the `@/` path alias pointing to the `src/` root directory.
