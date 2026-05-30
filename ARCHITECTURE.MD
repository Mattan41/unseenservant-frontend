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
│   └── apiClient.js          # API wrapper — all services use this towards backend
│   └── open5eClient.js       # External API wrapper for Open5e (clean Axios instance)
├── components/               # Shared UI components
│   ├── base/                 # Generic building blocks (button, modal, input etc.)
│   ├── HeaderComponent.vue
│   ├── FooterComponent.vue
│   └── NotificationComponent.vue
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
Internal:  axios.js             → apiClient.js    → FeatureService.js → store
External:  open5e-axios.js      → open5eClient.js → FeatureService.js → store
```
- `api/lib/axios.js`: Axios instance. Adds JWT header to requests, handles 401 (clears auth, shows notification).
- `api/apiClient.js`: Wrapper around axios. Blocks write operations (POST/PUT/PATCH/DELETE) if user is in guest mode. All services import from here — never directly from axios. Base URL configured in here.
- External APIs (e.g. Open5e) will be called directly from the browser using a separate Axios instance or fetch — not proxied through the backend

## Authentication
- JWT-based auth with refresh handled in `authStore`
- OAuth2 via Google/GitHub — redirect handled by `OAuthRedirect.vue`
- Auth state persisted in `authStore` (Pinia)

## Guest mode
`apiClient.js` has pre-built logic for guest mode via `authStore.isGuest`. GET requests pass through, write operations return `null` silently. Guest mode is not fully implemented yet — stores and components need to handle `null` responses.

## Component conventions (target pattern)
- **Smart components** (views, containers): handle store calls and logic
- **Dumb/presentational components**: receive props, emit events, no store access
- **Base components**: generic UI building blocks in `src/components/base/`
- Always Composition API with `<script setup>` — no Options API components

### State management
- Pinia stores are the single source of truth
- Components read state via `storeToRefs()` for reactivity
- API calls live in Service files, called from store actions

### Routing
- Routes requiring login use `meta: { requiresAuth: true }`
- Auth guard in `router/index.js` handles redirect to `/login`
- `authStore.initializeAuth()` is called once on first navigation

## Other
- Always import with `@/` alias, never relative `../` paths
