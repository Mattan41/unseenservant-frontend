# Unseen Servant Frontend — Project Guidelines

## Documentation Discovery
- `docs/STYLE_GUIDE.md` is authoritative for anything visual: tokens, semantic classes, and where a new class belongs.
- `docs/API_REFERENCE.md` describes the three-layer API (`axios.js` / `apiClient.js` / `guest-axios.js` / `open5e-axios.js`) and each feature's store shape — read it before touching `src/api` or a store.
- The campaign role/permission matrix lives in `README.md`.
- Update the describing document in the same change when behavior, structure or an API changes.

## Styling (docs/STYLE_GUIDE.md §3–§4)
- No color utilities and no hex or inline color styles in component templates — not even our own palette ones. `bg-primary-100`, `text-third-500`, `border-secondary-200`, `bg-yellow-100`, `bg-white`, `text-gray-500` are all banned.
- Use semantic role classes (`.badge-*`, `.section-heading`, `.element-link`, `.base-btn*`, `.error-message`) or a CSS variable reference (`style="color: var(--color-primary-700)"`). Non-color inline styles (`background-image`, `backgroundSize`) are fine.
- Direct palette utilities are allowed only inside `src/assets/main.css` and `src/assets/base-button.css`.
- Buttons: `<BaseButton>` / `<BaseLinkButton>` / `<IconButton>`. A new variant is a `.base-btn-{name}` rule in `base-button.css` plus a `BaseButton.vue` variant-map entry — never an inline class chain.
- Icons come from `src/components/base/BaseIcon.vue`; add new icons there, not in feature folders.
- Modals use `<BaseModal>` (centring, Escape and body-scroll lock are already handled). A dialog whose content can grow caps its own panel (`max-h-[90vh] overflow-y-auto`), and a dialog opened from inside a heading needs `<Teleport to="body">`.
- New shared class/variable goes where §4's table says: semantic classes with `@apply` in `main.css`, palette variables in the `@theme { }` block, role variables in `:root { }`. Direct palette variables in `main.css` mirror reality — `main.css` wins if the style guide disagrees.

## Component Architecture
- Components in `src/components/base/` and `src/features/*/components/` are dumb/presentational: props in, events out, no direct store access. Views (routable pages) and layout components (Header, Footer) are the exemption.
- No color-decision logic in templates — conditional classes come from a `*Utils.js` helper; `spellUtils.js:getSchoolBadgeClass` is the canonical example.
- `<style scoped>` may hold layout/sizing/animation only; colors must go through a semantic class or CSS variable.
- `v-html` is allowed only in `src/components/base/MarkdownText.vue`, and only with the output of `renderMarkdown()`.

## API & State
- Feature services call `apiClient.js`; never import `axios.js` directly.
- New endpoints must work in guest/demo mode too: extend `src/api/lib/guest-axios.js` (localStorage keys `guest_user`, `guest_users`, `guest_characters`, `guest_campaigns`) rather than branching in components.
- Campaign rights are derived once from `src/features/campaign/campaignPermissions.js` (`isOwner` = administration axis, `isGm` = world-building axis) — reuse it in the UI and keep guest mode in step; never re-derive owner/GM checks per component.
- Auth: the JWT is read from `auth_token` in localStorage and a 401 is handled centrally (session notice + `authStore.clearAuth`) — do not add per-call logout logic.

## Build, Modes & Tests
- `npm run dev` is full-stack and expects the backend on `VITE_API_BASE_URL` (default `http://localhost:8080`); `npm run demo` pairs with the backend's `demo` profile (form login, User1–User5/admin, password `password`); Guest Demo needs no backend at all — do not break it.
- Unit tests: Vitest + `@vue/test-utils` via `npm run test:unit`. Lint/format: `npm run lint` (fixes), `npm run lint:ci` (non-mutating check), `npm run format`.
- Tests live in a `__tests__/` folder next to the code they test (one per directory that has tests, including `src/utils/`), named `<subject>.test.js`; tests that wire several real modules without service mocks use `<subject>.integration.test.js`. Import code under test via the `@/` alias, put helpers shared across features in `src/test-utils/`, and never place test files beside source files.
- `.env`, `.env.local` and `*.code-workspace` are gitignored and hold local values only; never commit secrets.
