# Style Guide — unseenservant-frontend

> Draft based on full codebase audit, 2026-09-07.

---

## 1. Color Token Map

> Values below mirror `src/assets/main.css`. **main.css is the source of
> truth** — if they ever disagree, update this table to match main.css,
> not the other way around.

### 1.1 `--color-primary` (theme + mode aware)

Set on `<html data-theme="silver" data-mode="light">`. Source:
`src/assets/main.css`. Values live in the **palette layer**
(`html[data-theme='silver'][data-mode='light']`); the active theme/mode is
applied at runtime by `src/utils/environment.js`. `data-env` **no longer
affects colour** — it only drives the environment banner.

| Token | silver · light (active default) | forest · light (alternative) | Status |
|-------|---------------------------------|------------------------------|--------|
| `--color-primary-50` | #f9f9f9 | #bccac1 | implemented |
| `--color-primary-100` | #f2f2f2 | #a9bdb1 | implemented |
| `--color-primary-200` | #e5e5e5 | #96b0a1 | implemented |
| `--color-primary-300` | #d8d8d8 | #83a391 | implemented |
| `--color-primary-400` | #c5c5c5 | #749584 | implemented |
| `--color-primary-500` | #c0c0c0 | #6b8e7b | implemented |
| `--color-primary-600` | #a0a0a0 | #567263 | implemented |
| `--color-primary-700` | #5c5c5c | #41564a | implemented |
| `--color-primary-800` | #3d3d3d | #2c3a32 | implemented |
| `--color-primary-900` | #2b2b2b | #171e1a | implemented |

`--color-primary` (unscaled) maps to `--primary` which resolves to the
active theme's `--primary-500` value via the `@theme` block.

`--color-surface` is per-theme too: `#ffffff` (silver) / `#d8e7dd` (forest).
forest is retained but **not reachable** from the running app until a theme
switcher lands.

> **Three-axis model.** `<html>` carries `data-env` (dev|prod — banner only),
> `data-theme` (silver|forest — identity palette) and `data-mode`
> (light|dark — surface/neutral palette). The canonical explanation and the
> "where to add things" guide live in the header comment of the palette
> section in `src/assets/main.css`.

### 1.2 `--color-secondary` (yellow/amber — fixed)

50–900 scale defined in `main.css` `@theme` block. Values range from
`#fff8e1` (50) to `#ff6f00` (900). Base: `#ffa500`.

Status: implemented.

### 1.3 `--color-third` (blue-grey — fixed)

50–900 scale defined in `main.css` `@theme` block. Values range from
`#f9fafb` (50) to `#111827` (900). Base: `#374151`.

Status: implemented.

### 1.4 Additional semantic-role variables

Based on patterns observed in the audit. Define role variables in the
`:root` role layer of `src/assets/main.css`; their values may be overridden
per theme/mode in the `html[data-theme][data-mode]` palette blocks.

| Variable | Proposed value | Rationale | Status |
|----------|---------------|-----------|--------|
| `--color-surface` | `#ffffff` / `#d8e7dd` | Card/modals/form backgrounds — used in 10+ components. **Per-theme role** (set in each `html[data-theme][data-mode]` block, not `:root`): `#ffffff` (silver), `#d8e7dd` (forest). A dark-mode value is TBD in the dark-mode pass. | implemented |
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
| `.campaign-sidebar` | Desktop-only contextual rail (md+); mobile nav is rendered via `SlideOverDrawer` | `hidden md:flex md:h-full md:w-56 md:flex-shrink-0 md:self-stretch md:flex-col md:items-stretch md:justify-start md:gap-4 md:p-4` | implemented |
| `.campaign-gradient` | Vertical theme gradient for the campaign rail and mobile drawer | `bg-linear-to-b from-primary-100 via-primary-300 to-primary-100` | implemented |
| `.campaign-mobile-bar` | Mobile campaign top bar: title + local nav trigger | `flex items-center justify-between gap-2 p-2 md:hidden` | implemented |
| `.campaign-mobile-title` | Campaign title shown in the mobile top bar | `min-w-0 truncate text-lg font-bold text-third-700` | implemented |
| `.campaign-nav-trigger` | "Campaign Views" trigger (a `BaseButton` with base margins/padding reset) | `ml-0 mt-0 inline-flex items-center gap-2 bg-primary-800 px-3 py-2 text-sm font-semibold text-primary-100 hover:bg-primary-900 focus:ring-primary-700` | implemented |
| `.campaign-sidebar-nav` | Section-button list wrapper | `flex flex-col items-stretch justify-start gap-2 flex-1` | implemented |
| `.campaign-sidebar-item` | Section navigation button | `relative inline-flex items-center justify-start gap-2 text-sm font-medium px-3 py-2 rounded-md cursor-pointer transition-colors bg-primary-200 text-primary-900 hover:bg-primary-300 text-left` | implemented |
| `.campaign-sidebar-item--active` | Active/selected section modifier | `bg-primary-700 text-primary-100 hover:bg-primary-700` | implemented |
| `.campaign-sidebar-item-label` | Item label (always visible) | `inline` | implemented |
| `.campaign-sidebar-icon` | Monochrome nav icon sizing | `w-5 h-5 flex-shrink-0` | implemented |
| `.danger-zone` | Owner-only destructive grouping (Campaign Settings section) | `border border-red-300 rounded-lg p-4` | implemented |
| `.danger-zone-title` | Danger Zone heading | `text-lg font-semibold mb-3 text-red-700` | implemented |
| `.add-tile` | Discovery tile for add/import actions (e.g. import a character) | `flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary-400 p-4 text-center cursor-pointer transition-colors text-primary-700 hover:bg-primary-200` | implemented |
| `.empty-cta` | Empty-state call-to-action container | `flex flex-col items-center gap-3 rounded-lg border border-third-200 p-6 text-center` | implemented |
| `.icon-btn` | Base icon-only button (`IconButton.vue`) | `inline-flex items-center justify-center rounded-md p-2 cursor-pointer transition-colors focus:outline-none focus:ring-2` | implemented |
| `.icon-btn-glyph` | Icon sizing inside icon buttons | `w-5 h-5 flex-shrink-0` | implemented |
| `.icon-btn-plain` | Icon button variant: transparent, hover tint | `text-third-700 hover:bg-primary-300/60 focus:ring-primary-600` | implemented |
| `.icon-btn-solid` | Icon button variant: filled | `bg-primary-800 text-primary-100 hover:bg-primary-900 focus:ring-primary-700` | implemented |
| `.icon-btn-on-dark` | Icon button variant: on dark surfaces | `text-primary-100 hover:bg-primary-800 focus:ring-primary-500` | implemented |
| `.icon-btn-chip` | Icon button variant: chip remove (small, no background, colour-only hover) | `p-0 text-third-700 hover:text-primary-800 leading-none focus:ring-0` | implemented |
| `.slide-over-backdrop` | Slide-over dimming layer (`SlideOverDrawer.vue`) | `fixed inset-0 bg-black/50` | implemented |
| `.slide-over-panel` | Slide-over panel base | `fixed inset-y-0 flex flex-col overflow-y-auto` | implemented |
| `.slide-over-panel--left` / `.slide-over-panel--right` | Slide-over anchor edge | `left-0` / `right-0` | implemented |
| `.slide-over-panel--sidebar` | Slide-over width: sidebar panel | `w-72 max-w-[80vw] gap-4 p-4` | implemented |
| `.slide-over-panel--fullscreen` | Slide-over width: full-screen overlay | `w-full gap-4 p-4` | implemented |
| `.slide-over-fade-*` / `.slide-over-left-*` / `.slide-over-right-*` | Slide-over fade + slide transitions | `transition-opacity` / `transition-transform`, `opacity-0`, `translate-x-*` | implemented |
| `.app-menu` | Global nav overlay content wrapper (`HeaderComponent`) | `flex h-full flex-col gap-4` | implemented |
| `.app-menu-header` | Overlay header row (logo + close) | `flex items-center justify-between gap-2` | implemented |
| `.app-menu-links` | Overlay link list | `flex flex-col gap-2` | implemented |
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
| `.chip` | Removable skill/ability chip (name + inline remove button) | `inline-flex items-center gap-1 rounded-full bg-third-200 px-2 py-1 text-xs text-third-700` | implemented |
| `.muted-surface` | Muted inset surface for repeated form rows / panels | `rounded-md bg-third-50` | implemented |
| `.attribute-tile` | Attribute score tile (system stats panels) | `rounded-lg bg-third-200 p-2 text-center` | implemented |
| `.attribute-value` | Attribute score value | `text-lg font-bold text-primary-700` | implemented |
| `.attribute-label` | Attribute score label | `text-xs uppercase tracking-wide text-secondary` | implemented |
| `.info-popover` | Info popover body (`BaseTooltip.vue`) | `rounded-md bg-third-800 p-2 text-left text-xs font-normal normal-case leading-snug text-primary-50 shadow-lg` | implemented |
| `.info-popover--fixed` | Info popover on desktop (md+); teleported + JS-positioned | `fixed z-[60]` | implemented |
| `.info-popover--inline` | Info popover on mobile (<md); expands under the trigger | `mt-1 block` | implemented |
| `.text-warning` | Warning text tone (e.g. attribute array mismatch) | `text-secondary-700` | implemented |
| `.suggested-choice` | Highlight for a suggested skill option | `rounded bg-secondary-50 text-secondary-900 px-1` | implemented |
| `.suggested-choice-group` | Highlight panel for a class's suggested abilities | `rounded-md bg-secondary-50` | implemented |

### 2.4 Proposed new classes (not yet implemented)

| Class | Purpose | Replaces | Status |
|-------|---------|----------|--------|
| `.spinner` | Loading spinner | `inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent` (11 sites) | implemented |
| `.demo-notice` | Guest mode warning banner | `bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-2 rounded` (4 sites) | proposed |
| `.env-banner` | Environment banner (dev/demo) shown above the header | `bg-secondary-100 border-b border-secondary-400 text-secondary-900 text-xs font-medium text-center px-3 py-2` (`EnvBanner.vue`) | implemented |
| `.input-field` | Form input focus ring | The `focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent` chain (17 sites — may be done as a global `input:focus` rule instead) | implemented |
| `.section-primary` | Primary section wrapper | `bg-primary-500 p-4 rounded-lg` (5 sites) | proposed |
| `.notification-base` | Notification popup base | Replace 9 hex values in `NotificationComponent.vue` scoped style | proposed |
| `<BaseModal>` component | Modal overlay + centering wrapper | The `fixed inset-0 flex items-center justify-center bg-black/50` overlay pattern. Extracted into `src/components/base/BaseModal.vue` (props: `zIndex`; emits `close` on backdrop click). In use in `SpellDetailModal.vue`, `CreateCampaign.vue`, and `ImportCharacterModal.vue`. Any new modal introduced in later phases should use it rather than re-implementing the overlay. | implemented |
| `<BaseIcon>` component | Shared monochrome line-icon library | Single source of truth for icon SVGs (`menu`, `close`, `plus`, `overview`, `lore`, `characters`, `participants`, `messages`, `settings`, `edit`) in `src/components/base/BaseIcon.vue`. `CampaignNavIcon` delegates to it. Add new icons here, not in feature folders. | implemented |
| `<IconButton>` component | Accessible icon-only button | `src/components/base/IconButton.vue` (props: `label` (required, → `aria-label`/`title`), `variant` (`plain`/`solid`/`on-dark`), `icon`; emits `click`). Use for compact controls with no visible text. | implemented |
| `<SlideOverDrawer>` component | Edge-anchored slide-over overlay (edge sibling of `BaseModal`) | `src/components/base/SlideOverDrawer.vue` (props: `modelValue`, `side` (`left`/`right`), `full`, `label`, `panelClass`, `zIndex`; emits `update:modelValue`/`close`). Teleports to body, closes on backdrop click/Escape, locks body scroll. Used by `HeaderComponent` (full-screen menu) and `CampaignSidebar` (campaign drawer). | implemented |
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