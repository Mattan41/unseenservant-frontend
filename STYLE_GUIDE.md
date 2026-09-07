# Style Guide — unseenservant-frontend

> Draft based on full codebase audit, 2026-09-07.

---

## 1. Color Token Map

> Values below mirror `src/assets/main.css`. **main.css is the source of
> truth** — if they ever disagree, update this table to match main.css,
> not the other way around.

### 1.1 `--color-primary` (environment-aware)

Set on `<html data-env="dev|prod">`. Source: `src/assets/main.css`.

| Token | dev value | prod value | Status |
|-------|-----------|------------|--------|
| `--color-primary-50` | #bccac1 | #f9f9f9 | implemented |
| `--color-primary-100` | #a9bdb1 | #f2f2f2 | implemented |
| `--color-primary-200` | #96b0a1 | #e5e5e5 | implemented |
| `--color-primary-300` | #83a391 | #d8d8d8 | implemented |
| `--color-primary-400` | #749584 | #c5c5c5 | implemented |
| `--color-primary-500` | #6b8e7b | #c0c0c0 | implemented |
| `--color-primary-600` | #567263 | #a0a0a0 | implemented |
| `--color-primary-700` | #41564a | #5c5c5c | implemented |
| `--color-primary-800` | #2c3a32 | #3d3d3d | implemented |
| `--color-primary-900` | #171e1a | #2b2b2b | implemented |

`--color-primary` (unscaled) maps to `--primary` which resolves to the
environment's `--primary-500` value via the `@theme` block.

### 1.2 `--color-secondary` (yellow/amber — fixed)

50–900 scale defined in `main.css` `@theme` block. Values range from
`#fff8e1` (50) to `#ff6f00` (900). Base: `#ffa500`.

Status: implemented.

### 1.3 `--color-third` (blue-grey — fixed)

50–900 scale defined in `main.css` `@theme` block. Values range from
`#f9fafb` (50) to `#111827` (900). Base: `#374151`.

Status: implemented.

### 1.4 Additional semantic-role variables

Based on patterns observed in the audit. Define in `src/assets/main.css`
under the `:root` / `html[data-env]` blocks when approved.

| Variable | Proposed value | Rationale | Status |
|----------|---------------|-----------|--------|
| `--color-surface` | `#ffffff` | Card/modals/form backgrounds — used in 10+ components. Defined as a true neutral (not derived from primary) so it supports a future dark mode without being tied to the accent hue. A dark-mode value is TBD in Phase 5. | implemented |
| `--color-border-default` | `var(--color-third-200)` | Form input borders — used in 17+ locations | proposed |
| `--color-text-muted` | `var(--color-third-500)` | "Loading...", empty states — used in 20+ locations | proposed |
---

## 2. Semantic Classes

### 2.1 Buttons

#### Legacy `.button-*` → `src/assets/main.css` (in progress)

| Class | Role | Tailwind used | Status |
|-------|------|--------------|--------|
| `.button` | Base | ml-1 mt-1 px-2 py-1 text-xs font-semibold rounded cursor-pointer transition focus:outline-none focus:ring-2 | in progress |
| `.button-primary` | Primary action | `bg-primary-700 text-primary-100 hover:bg-primary-800 focus:ring-primary-700` | in progress |
| `.button-secondary` | Ghost/secondary | `bg-gray-300 text-black hover:bg-gray-400 focus:ring-gray-300` | in progress |
| `.button-add` | Save/create | `bg-green-800 text-gray-100 hover:bg-green-900 focus:ring-green-900` | in progress |
| `.button-update` | Update/edit | `bg-yellow-600 text-gray-200 hover:bg-yellow-700 focus:ring-yellow-500` | in progress |
| `.button-remove` | Delete | `bg-red-900 text-gray-200 hover:bg-red-950 focus:ring-red-500` | in progress |
| `.button-retry` | Retry | `bg-orange-500 text-gray-200 hover:bg-orange-600 focus:ring-orange-500` | in progress |
| `.button-icon` | Icon/close | `text-third-400 hover:text-third-600 cursor-pointer leading-none transition` | in progress |

Target: 0 `.button-*` usages in components (migrate to `<BaseButton>`).

#### `.base-btn*` → `src/assets/base-button.css` (target)

Identical styles as `.button-*` above. Mapped in `BaseButton.vue` via
`variant` prop:

| `variant` value | CSS class | Status |
|----------------|-----------|--------|
| `"default"` | `base-btn base-btn-default` | implemented |
| `"ghost"` | `base-btn base-btn-ghost` | implemented |
| `"add"` | `base-btn base-btn-add` | implemented |
| `"update"` | `base-btn base-btn-update` | implemented |
| `"remove"` | `base-btn base-btn-remove` | implemented |
| `"retry"` | `base-btn base-btn-retry` | implemented |
| `"icon"` | `base-btn base-btn-icon` | implemented |
| `"demo"` | `base-btn base-btn-demo` | implemented |
| `"form"` | `base-btn base-btn-form` | implemented |

- `"demo"` — guest/demo mode button. Yellow palette (`bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-300`). Distinct from `.demo-notice`, which is a banner, not a button.
- `"form"` — larger primary call-to-action button for form submissions. Lighter shade (`bg-primary-500`) than `.base-btn-default` (`primary-700`) — a distinct variant, not an inconsistency. `w-64 h-10` sizing stays as layout utilities in the template.

Disabled state: `base-btn:disabled` → `opacity-50 cursor-not-allowed`.

Props: `variant`, `disabled`, `loading`, `confirmMessage`. Emits: `click`.

### 2.2 Badges → `src/assets/main.css`

| Class | Color pair | School mapping | Status |
|-------|-----------|----------------|--------|
| `.badge` (base) | text-sm font-medium px-3 py-1 rounded-full | — | implemented |
| `.badge-primary` | `text-primary-600 bg-primary-50` | — | implemented |
| `.badge-secondary` | `text-third-700 bg-third-100` | — | implemented |
| `.badge-blue` | `text-blue-800 bg-blue-100` | abjuration | implemented |
| `.badge-purple` | `text-purple-800 bg-purple-100` | conjuration | implemented |
| `.badge-indigo` | `text-indigo-800 bg-indigo-100` | divination | implemented |
| `.badge-pink` | `text-pink-800 bg-pink-100` | enchantment | implemented |
| `.badge-teal` | `text-teal-800 bg-teal-100` | illusion | implemented |
| `.badge-yellow` | `text-yellow-800 bg-yellow-100` | transmutation | implemented |
| `.badge-muted` | `text-third-500 bg-third-100` | necromancy, fallback | implemented |
| `.badge-danger` | `text-red-600 bg-red-50` | evocation | implemented |
| `.badge-info` | `text-blue-600 bg-blue-50` | — | implemented |

School → badge mapping lives in `src/features/spell/spellUtils.js` →
`getSchoolBadgeClass(school)` (returns the class name string). Components
never contain school → color logic. This is the canonical pattern for
all conditional styling in `*Utils.js` files.

### 2.3 Other utility classes → `src/assets/main.css`

| Class | Purpose | Tailwind | Status |
|-------|---------|----------|--------|
| `.section-heading` | Section title | `text-xl font-semibold text-primary-700` | implemented |
| `.element-link` | Navigation link | `text-primary-900 hover:text-primary-700` | implemented |
| `.error-message` | Error alert | `bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded` | implemented |
| `.success-message` | Success alert | `bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded` | implemented |
| `.campaign-selector` | Campaign-switcher link/button in the sidebar | `w-10 h-10 rounded-md flex items-center justify-center text-primary-500 font-medium relative group no-underline border border-primary-400 hover:scale-110 flex-shrink-0` | implemented |
| `.campaign-selector--active` | Active/selected state modifier for `.campaign-selector` | `ring-2 ring-primary-500` | implemented |
| `.campaign-tooltip` | Hover tooltip showing campaign names in the sidebar | `absolute left-full ml-2 px-2 py-1 bg-primary-600 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50 pointer-events-none` | implemented |
| `.campaign-nav-button` | "+" add/navigate-to-campaigns button | `w-10 h-10 bg-primary-200 text-primary-800 rounded-md flex items-center justify-center hover:bg-primary-300 transition-colors no-underline relative group mt-2 hover:scale-110 flex-shrink-0` | implemented |
| `.campaign-nav-tooltip` | Tooltip for the campaign nav button | `absolute top-1/2 left-full transform -translate-y-1/2 ml-2 w-auto p-2 bg-primary-700 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50 whitespace-nowrap pointer-events-none` | implemented |
| `.scroll-hint` | Scroll indicator in the sidebar campaign list | `absolute left-1/2 transform -translate-x-1/2 w-5 h-1 bg-primary-400 rounded-full` | implemented |
| `.read-more-link` | "Read more/less" toggle link | `text-primary-600 hover:text-primary-800` | implemented |
| `.character-tag` | Character attribute tag (race/class) | `inline-block bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded-full` | implemented |
| `.character-tag-level` | Character level tag | `inline-block bg-secondary-100 text-secondary-800 text-xs px-2 py-1 rounded-full` | implemented |
| `.character-name` | Character name (clickable card title) | `text-primary-700 hover:text-primary-800` | implemented |
| `.text-subtle` | Faint labels, e.g. "Sign in" | `text-third-400` | implemented |
| `.text-muted` | Help text, empty states | `text-third-500` | implemented |
| `.text-secondary` | Secondary body text, loading text | `text-third-600` | implemented |
| `.text-default` | Form labels, headings, primary body text | `text-third-700` | implemented |
| `.border-subtle` | Light dividers between grouped items | `border-third-100` | implemented |
| `.border-section` | Section dividers between major content areas | `border-third-200` | implemented |
| `.border-input` | Input and button borders | `border-third-300` | implemented |

### 2.4 Proposed new classes (not yet implemented)

| Class | Purpose | Replaces | Status |
|-------|---------|----------|--------|
| `.spinner` | Loading spinner | `inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent` (11 sites) | implemented |
| `.demo-notice` | Guest mode warning banner | `bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-2 rounded` (4 sites) | proposed |
| `.input-field` | Form input focus ring | The `focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent` chain (17 sites — may be done as a global `input:focus` rule instead) | implemented |
| `.section-primary` | Primary section wrapper | `bg-primary-500 p-4 rounded-lg` (5 sites) | proposed |
| `.notification-base` | Notification popup base | Replace 9 hex values in `NotificationComponent.vue` scoped style | proposed |
| `<BaseModal>` component | Modal overlay + centering wrapper | The `fixed inset-0 z-* flex items-center justify-center bg-black/50` + content-wrapper pattern duplicated across 5 modals. This is a component extraction task — the overlay structure is duplicated, not just the color. | proposed |
---

## 3. Hard Constraints

### 3.1 NO raw Tailwind color utility classes in components

**Banned in all component templates:** any `bg-{color}-{shade}`,
`text-{color}-{shade}`, `border-{color}-{shade}`, `ring-{color}-{shade}`,
`fill-{color}-{shade}`, `stroke-{color}-{shade}`, or
`from-{color}-*/via-{color}-*/to-{color}-*` gradient stop — regardless of
whether the color name is `primary`, `secondary`, `third`, `red`, `blue`,
`yellow`, `gray`, or any other Tailwind palette.

All colors that affect text, surface, or border contrast must route through
our own semantic classes or variables so contrast stays correct if the user
switches theme. The only exceptions are:

**(a) Third-party brand identity** (already documented):
`LoginComponent.vue` Google sign-in button
(`hover:border-blue-100`, `focus:border-blue-500`, `focus:ring-blue-200`).

**(b) Modal backdrop dimming layer:** `bg-black/50` in `BaseModal.vue`,
which is a fixed scrim, not a themed surface or text color.

> **Important — our own palette utilities are also banned in templates:**
> `text-primary-{shade}`, `bg-third-{shade}`, `border-secondary-{shade}`,
> etc. are not permitted in component templates even though the tokens are
> defined in our `@theme` block. They must go through a named role class
> (`.text-default`, `.text-subtle`, etc.) or a component-specific semantic
> class (`.character-tag`, `.campaign-selector`, etc.) — same as any other
> color utility. The only place direct palette utilities are allowed is
> inside `src/assets/main.css` and `src/assets/base-button.css` where the
> role/component classes are defined.

**How to comply:**
1. Use existing semantic classes (`.badge-primary`, `.section-heading`,
   `.element-link`, `.base-btn*`, `.error-message`, etc.)
2. For one-off cases: `style="color: var(--color-primary-700)"`
3. For repeated patterns (≥2 occurrences): add a new semantic class to
   `main.css` or `base-button.css` (see §4)

Specifically banned examples (now including gray/white/black shades):
- `bg-primary-100`, `text-third-500`, `border-secondary-200`
- `bg-yellow-100`, `text-red-700`, `border-blue-200`
- `text-gray-500`, `bg-white`, `border-gray-300`

### 3.2 NO hex values or inline color styles in components

**Banned:** `#faebd7`, `style="color: #333"`, `style="background: red"`

**Allowed:** `style="background-image: url(...)"`,
`style="color: var(--color-primary-700)"`,
`style="backgroundSize: 'cover'"` (non-color properties)

### 3.3 Components stay dumb/presentational

- Components in `src/components/base/` and
  `src/features/*/components/`: **props in, events out, no direct store
  access**
- **No color-decision logic** in component templates — conditional CSS
  classes must come from a `*Utils.js` function (see
  `spellUtils.js:getSchoolBadgeClass` as canonical example)
- **Views** (routable pages in `views/` folders) and **layout
  components** (Header, Footer) are exempt from this rule — they
  can access stores, handle logic, and use color utilities directly
  per ARCHITECTURE.md's smart/dumb component conventions

### 3.4 Component-local `<style scoped>` must not duplicate central color decisions

- Layout, animation, sizing in scoped styles: allowed
- Colors in scoped styles: must use a semantic class or CSS variable
  reference

---

## 4. Where to Add New Classes / Variables

| What | Where | Pattern to follow |
|------|-------|-------------------|
| New button variant | `src/assets/base-button.css` | Add `.base-btn-{name}` with `@apply` block; update `BaseButton.vue` variant map |
| New badge variant | `src/assets/main.css` | Add `.badge-{name}` with `@apply text-* bg-*` |
| New utility class | `src/assets/main.css` | Add `.class-name { @apply ... }` in the existing flat list |
| New CSS variable (palette) | `src/assets/main.css` → `@theme { }` block | `--color-{name}-{shade}: #value` |
| New CSS variable (role) | `src/assets/main.css` → `:root { }` block | `--{role}: var(--color-{name}-{shade})` |
| Layout/animation-only scoped style | Component's `<style scoped>` block | No color values allowed |

### Process for adding a class/variable candidate

1. Identify the repeated pattern (≥2 occurrences)
2. Verify no existing semantic class covers it
3. Propose in PR/comment with rationale
4. Add to appropriate CSS file
5. Replace all inline occurrences with the new class
