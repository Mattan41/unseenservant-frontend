# Style Guide — unseenservant-frontend

> Draft based on full codebase audit, 2026-09-07.

---

## 1. Color Token Map

> Values below mirror `src/assets/main.css`. **main.css is the source of
> truth** — if they ever disagree, update this table to match main.css,
> not the other way around.

### 1.1 `--color-primary` (theme + mode aware)

Set on `<html data-theme="silver" data-mode="light">`. Source:
`src/assets/main.css`. Values live in the **palette layer** — one block per
theme+mode (`html[data-theme='silver'][data-mode='light']` and its dark
counterpart). Every theme ships a light and a dark block (a pair). The active
theme/mode is applied at runtime by `src/utils/environment.js`: the mode follows
`prefers-color-scheme` unless the user overrides it in Settings → General.
`data-env` does **not** touch these palettes: the only colours it drives are the
environment banner's own `--env-banner-*` roles (§1.4 and §2).

| Token | silver · light (active default) | forest · light (alternative) | silver · dark | forest · dark | Status |
|-------|---------------------------------|------------------------------|---------------|---------------|--------|
| `--color-primary-50` | #f9f9f9 | #bccac1 | #0a0a0a | #0a130d | implemented |
| `--color-primary-100` | #f2f2f2 | #a9bdb1 | #111111 | #101c15 | implemented |
| `--color-primary-200` | #e5e5e5 | #96b0a1 | #171717 | #16271d | implemented |
| `--color-primary-300` | #d8d8d8 | #83a391 | #1f1f1f | #1d3327 | implemented |
| `--color-primary-400` | #c5c5c5 | #749584 | #3f3f3f | #2d4d3b | implemented |
| `--color-primary-500` | #c0c0c0 | #6b8e7b | #7a7a7a | #4f7a5f | implemented |
| `--color-primary-600` | #a0a0a0 | #567263 | #a6a6a6 | #79a487 | implemented |
| `--color-primary-700` | #5c5c5c | #41564a | #cccccc | #a9c9b4 | implemented |
| `--color-primary-800` | #3d3d3d | #2c3a32 | #e0e0e0 | #c7dccd | implemented |
| `--color-primary-900` | #2b2b2b | #171e1a | #f5f5f5 | #e8f1ea | implemented |

> The dark shades **invert** the ramp (50 darkest → 900 lightest) because
> `--primary-900` is used as body text and `--primary-100/300` paints the page
> and header gradient.

`--color-primary` (unscaled) maps to `--primary` which resolves to the
active theme's `--primary-500` value via the `@theme` block.

`--color-surface` and `--surface-section` are per-theme and per-mode:
`#ffffff`/`#c0c0c0` (silver · light), `#d8e7dd`/`#6b8e7b` (forest · light),
`#1a1a1a`/`#0f0f0f` (silver · dark), `#131f18`/`#0b140f` (forest · dark).
`--surface-section` backs `.section-primary` (the Characters/Campaigns panel).
All themes and modes are reachable from the running app: the switchers live in
**Settings → General**
(`src/features/settings/components/GeneralSettingsSection.vue`) and persist the
choices in `localStorage.theme` / `localStorage.mode` via
`src/utils/environment.js`.

> **`main.js` is the bootstrap.** `applyEnvironmentAttributes()` runs before the
> app is mounted and writes all three `data-*` attributes. A matching
> silver · light default also lives on `:root` (see the "Default palette" note
> inside the role layer in `main.css`) so the very first frame is themed even
> before that call —
> there is no inline script in `index.html`.

> **Three-axis model.** `<html>` carries `data-env`
> (local|dev|test|staging|prod|demo — banner text and tone only),
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

The `third` ramp itself is fixed; the mode-aware **roles** in §1.4 point at it in
light mode and at dark values inside `html[data-mode='dark']`, so the neutral
scale flips without changing the palette.

### 1.4 Additional semantic-role variables

Neutral, text, border, surface and callout colours are exposed as semantic
**role** variables in the `:root` role layer of `src/assets/main.css`; the
light values point at the fixed `third`/`secondary` ramps, and one
`html[data-mode='dark']` block re-points every role at its dark counterpart.
The per-theme `--color-surface` is the exception — it lives in the palette
blocks. Components consume roles, never raw shades.

| Variable | Proposed value | Rationale | Status |
|----------|---------------|-----------|--------|
| `--color-surface` | `#ffffff`/`#d8e7dd` (light) · `#1a1a1a`/`#131f18` (dark) | Card/modals/form backgrounds — used in 10+ components. **Per-theme and per-mode** (set in each `html[data-theme][data-mode]` block, not `:root`). | implemented |
| `--color-border-default` | `var(--color-third-200)` | Form input borders — used in 17+ locations | proposed |
| `--color-text-muted` | `var(--color-third-500)` | "Loading...", empty states — used in 20+ locations | proposed |
| `--env-banner-surface` | `var(--color-third-100)` | Environment banner background. The neutral fallback sits in `:root`; each `html[data-env='X']` block next to `.env-banner` overrides it — `local` blue, `dev` green, `test` yellow, `staging` orange, `demo` violet. Production draws no banner, so it has no tone. | implemented |
| `--env-banner-border` | `var(--color-third-400)` | Environment banner bottom border — same per-environment overrides. | implemented |
| `--env-banner-text` | `var(--color-third-900)` | Environment banner text colour — same per-environment overrides. | implemented |

#### Neutral / text / border / surface roles (mode-aware)

Light values map onto `--color-third-*`; `html[data-mode='dark']` re-points them.

| Role | Light | Dark | Used by |
|------|-------|------|---------|
| `--text-subtle` | `third-400` | `#7c8698` | `.text-subtle`, `.base-btn-icon` |
| `--text-muted` | `third-500` | `#97a0b0` | `.text-muted`, `.stat-label` |
| `--text-secondary` | `third-600` | `#b3bbc9` | `.text-secondary`, `.field-tab`, `.edit-bar-label` |
| `--text-default` | `third-700` | `#d2d7df` | `.text-default`, `.chip`, `.stat-value`, `.export-menu-item` |
| `--text-heading` | `third-800` | `#e4e8ee` | `.rich-text h1–h5` |
| `--text-strong` | `third-900` | `#f3f5f8` | `.rich-text strong` |
| `--text-faint` | `third-300` | `#4b5563` | `.stat-separator` |
| `--border-subtle` | `third-100` | `#232a35` | `.border-subtle` |
| `--border-section` | `third-200` | `#2e3642` | `.border-section`, `.empty-cta`, `.export-menu`, `.rich-text hr/table` |
| `--border-input` | `third-300` | `#3d4653` | `.border-input`, `.field-tabs`, `.markdown-preview`, `.edit-bar`, `.number-stepper-btn` |
| `--surface-muted` | `third-50` | `#12181f` | `.muted-surface`, `.profile-section`, `.spell-row-hover` |
| `--surface-inset` | `third-100` | `#18202a` | `.profile-value`, `.field-tabs`, `.edit-bar`, `.rich-text code/pre/th`, `.markdown-help-source` |
| `--surface-raised` | `third-200` | `#222b36` | `.chip`, `.attribute-tile`, `.spell-history-hover` |
| `--neutral-fill` / `--neutral-fill-hover` | `third-300` / `third-400` | `#2e3642` / `#3d4653` | `.base-btn-ghost` (with `--btn-ghost-*`), `.button-secondary` |
| `--neutral-strong` / `--neutral-strong-hover` | `third-400` / `third-500` | `#3d4653` / `#4b5563` | `.header-nav-link-secondary` |
| `--popover-surface` / `--popover-text` | `third-800` / `primary-50` | `#e4e8ee` / `#12181f` | `.info-popover` (inverted surface) |

#### Amber + callout tone roles (mode-aware)

| Role | Light | Dark | Used by |
|------|-------|------|---------|
| `--secondary-surface` / `--secondary-text` | `secondary-100` / `secondary-800` | `#43350f` / `#ffd98a` | `.character-tag-level`, `.notification-warning` |
| `--secondary-surface-soft` | `secondary-50` | `#2b2209` | `.suggested-choice`, `.suggested-choice-group` |
| `--secondary-border` / `--secondary-text-strong` | `secondary-400` / `secondary-900` | `#a97e1f` / `#ffe9b8` | `.info-box--warning` |
| `--secondary-accent` | `secondary-700` | `#ffc44d` | `.text-warning` |
| `--tone-success-*` | `green-100/400/700` | `#10301c`/`#2f7d4a`/`#86e0a2` | `.success-message`, `.info-box--success`, `.notification-success` |
| `--tone-danger-*` | `red-100/400/700` | `#3a1618`/`#b4444a`/`#ff9ea1` | `.error-message`, `.info-box--danger`, `.notification-error`, `.danger-zone`, `.badge-danger` |
| `--tone-notice-*` | `cyan-50/200/800` | `#0f3038`/`#2f7d8c`/`#8fdceb` | `.guest-notice` |

Deliberately **not** mode-aware (fixed on purpose): the hue `.badge-*` variants
(blue/purple/indigo/pink/teal/yellow), the legacy solid `.button-*` variants,
`.slide-over-backdrop` (`bg-black/50` scrim) and the environment banner tones
(meant to be loud).

---

## 2. Semantic Classes

### 2.1 Buttons

#### Legacy `.button-*` → `src/assets/main.css` (in progress)

| Class | Role | Tailwind used | Status |
|-------|------|--------------|--------|
| `.button` | Base | ml-1 mt-1 px-2 py-1 text-xs font-semibold rounded cursor-pointer transition focus:outline-none focus:ring-2 | in progress |
| `.button-primary` | Primary action | `bg-primary-700 text-primary-100 hover:bg-primary-800 focus:ring-primary-700` | in progress |
| `.button-secondary` | Ghost/secondary | `bg-(--neutral-fill) text-(--btn-ghost-text) hover:bg-(--neutral-fill-hover) focus:ring-(--btn-ghost-ring)` | in progress |
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
| `"tile"` | `base-btn base-btn-tile` | implemented |
| `"row"` | `base-btn base-btn-row` | implemented |

- `"demo"` — guest-session button ("Guest Demo mode" on the login card). Cyan palette (`bg-cyan-100 border-cyan-400 text-cyan-800 hover:bg-cyan-200 focus:ring-cyan-300`) — the same tone as `.guest-notice`, so starting guest mode and being in it read as one thing, and the tone no longer doubles as the `test` environment banner's colour. Distinct from `.guest-notice` itself, which is a banner, not a button.
- `"form"` — larger primary call-to-action button for form submissions. Lighter shade (`bg-primary-500`) than `.base-btn-default` (`primary-700`) — a distinct variant, not an inconsistency. `w-64 h-10` sizing stays as layout utilities in the template.
- `"tile"` — discovery tile for "create / import" affordances (`min-h-32` dashed `border-primary-400` panel with the icon above the label, filling the slot it sits in via `w-full`). The one variant that carries layout: it resets `.base-btn`'s action-bar margins (`m-0`) so it can be a grid cell or a list row. Its rule is `.base-btn.base-btn-tile` — a compounded selector, because `main.css` is loaded after `base-button.css` and gives `.base-btn-with-icon` an inline `gap-1` row that would otherwise win; the glyph is `h-6 w-6`. Replaces the former `.add-tile` class: `BaseButton` (`Import a character`, `Create new campaign`), `BaseLinkButton` (`Create a character`), and the empty states of both collection lists.
- `"row"` — disclosure row: a whole result row that is itself the control (`SpellSearch`'s spell rows, which expand in place). Resets `.base-btn`'s compact chrome (action-bar margins, tight padding, small centred bold label) and fills its slot; the row's own grid columns stay in the template, and the wrapping element keeps the row chrome (border, padding, `.spell-row-hover`). Because a native button cannot contain another control, the row's secondary control ("+ Add") is rendered as a sibling of the button rather than inside it. Rule: `.base-btn.base-btn-row` — compounded like the tile, for the same cascade reason.

Disabled state: `base-btn:disabled` → `opacity-50 cursor-not-allowed`.

Props: `variant`, `disabled`, `loading`, `confirmMessage`, `icon`, `type`. Emits: `click`.

`type` defaults to `button` (not the browser's implicit `submit`), so a
`<BaseButton>` rendered inside a `<form>` never submits it by accident — e.g. the
"Formatting help" disclosure under a markdown field. Pass `type="submit"` where
submission is genuinely intended (create/save forms).

### 2.2 Form fields → `src/assets/main.css`

`.input-field` is the **single source of truth** for `input`, `select` and
`textarea` styling. It gives editable fields their surface and focus ring:

| Concern | Rule |
|---------|------|
| Surface | `background-color: var(--color-primary-50)` |
| Focus | `focus:ring-2 focus:ring-primary-500 focus:border-transparent` |
| Read-only | `:disabled` → transparent background, so view mode stays text-like |

**Do not** set `style="background-color: var(--color-primary-50)"` (or any other
per-element colour) on a field — add the `input-field` class instead. The light
surface is what makes edit fields read as editable, while `:disabled` keeps
read-only views looking like plain text.

### 2.3 Badges → `src/assets/main.css`

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

### 2.4 Other utility classes → `src/assets/main.css`

| Class | Purpose | Tailwind | Status |
|-------|---------|----------|--------|
| `.section-heading` | Section title | `text-xl font-semibold text-primary-700` | implemented |
| `.element-link` | Navigation link | `text-primary-900 hover:text-primary-700` | implemented |
| `.error-message` | Error alert | `bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded` | implemented |
| `.success-message` | Success alert | `bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded` | implemented |
| `.context-sidebar` | Desktop-only contextual rail (md+), shared by the campaign and settings shells; mobile nav is rendered via `SlideOverDrawer` | `hidden md:flex md:h-full md:w-56 md:flex-shrink-0 md:self-stretch md:flex-col md:items-stretch md:justify-start md:gap-4 md:p-4` | implemented |
| `.context-gradient` | Vertical theme gradient for context rails and their mobile drawers | `bg-linear-to-b from-primary-100 via-primary-300 to-primary-100` | implemented |
| `.context-mobile-bar` | Mobile contextual top bar: title + local nav trigger | `flex items-center justify-between gap-2 p-2 md:hidden` | implemented |
| `.context-mobile-title` | Context title shown in the mobile top bar | `min-w-0 truncate text-lg font-bold text-third-700` | implemented |
| `.context-nav-trigger` | Section-drawer trigger in the mobile top bar (a `BaseButton` with base margins/padding reset). Never shrinks or wraps, so a long context title cannot reshape it | `ml-0 mt-0 inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap bg-primary-800 px-3 py-2 text-sm font-semibold text-primary-100 hover:bg-primary-900 focus:ring-primary-700` | implemented |
| `.context-nav-list` | Section-button list wrapper | `flex flex-col items-stretch justify-start gap-2 flex-1` | implemented |
| `.context-nav-item` | Section navigation button | `relative inline-flex items-center justify-start gap-2 text-sm font-medium px-3 py-2 rounded-md cursor-pointer transition-colors bg-primary-200 text-primary-900 hover:bg-primary-300 text-left` | implemented |
| `.context-nav-item--active` | Active/selected section modifier | `bg-primary-700 text-primary-100 hover:bg-primary-700` | implemented |
| `.context-nav-item-label` | Item label (always visible) | `inline` | implemented |
| `.context-nav-icon` | Monochrome nav icon sizing | `w-5 h-5 flex-shrink-0` | implemented |
| `.danger-zone` | Owner-only destructive grouping (Campaign Settings section) | `border border-red-300 rounded-lg p-4` | implemented |
| `.danger-zone-title` | Danger Zone heading | `text-lg font-semibold mb-3 text-red-700` | implemented |
| `.empty-cta` | Empty-state call-to-action container | `flex flex-col items-center gap-3 rounded-lg border border-third-200 p-6 text-center` | implemented |
| `.icon-btn` | Base icon-only button (`IconButton.vue`) | `inline-flex items-center justify-center rounded-md p-2 cursor-pointer transition-colors focus:outline-none focus:ring-2` | implemented |
| `.icon-btn-glyph` | Icon sizing inside icon buttons | `w-5 h-5 flex-shrink-0` | implemented |
| `.icon-btn-plain` | Icon button variant: transparent, hover tint | `text-third-700 hover:bg-primary-300/60 focus:ring-primary-600` | implemented |
| `.icon-btn-solid` | Icon button variant: filled | `bg-primary-800 text-primary-100 hover:bg-primary-900 focus:ring-primary-700` | implemented |
| `.icon-btn-on-dark` | Icon button variant: on dark surfaces | `text-primary-100 hover:bg-primary-800 focus:ring-primary-500` | implemented |
| `.icon-btn-chip` | Icon button variant: chip remove (small, no background, colour-only hover) | `p-0 text-third-700 hover:text-primary-800 leading-none focus:ring-0` | implemented |
| `.slide-over-backdrop` | Slide-over dimming layer (`SlideOverDrawer.vue`), rendered as a native `<button>` so click-outside is keyboard-operable | `fixed inset-0 bg-black/50` | implemented |
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
| `.text-subtle` | Faint labels, e.g. "Sign in" | `text-(--text-subtle)` | implemented |
| `.text-muted` | Help text, empty states | `text-(--text-muted)` | implemented |
| `.text-secondary` | Secondary body text, loading text | `text-(--text-secondary)` | implemented |
| `.text-default` | Form labels, headings, primary body text | `text-(--text-default)` | implemented |
| `.text-heading` | Section headings and card titles | `text-(--text-heading)` | implemented |
| `.border-subtle` | Light dividers between grouped items | `border-(--border-subtle)` | implemented |
| `.border-section` | Section dividers between major content areas | `border-(--border-section)` | implemented |
| `.border-input` | Input and button borders | `border-(--border-input)` | implemented |
| `.chip` | Removable skill/ability chip (name + inline remove button) | `inline-flex items-center gap-1 rounded-full bg-(--surface-raised) px-2 py-1 text-xs text-(--text-default)` | implemented |
| `.muted-surface` | Muted inset surface for repeated form rows / panels | `rounded-md bg-(--surface-muted)` | implemented |
| `.attribute-tile` | Attribute score tile (system stats panels) | `rounded-lg bg-(--surface-raised) p-2 text-center` | implemented |
| `.brand-mark` | Hat Man logo: dark ink on a fixed light disc so it reads the same in every theme/mode | `rounded-full bg-white p-2` | implemented |
| `.attribute-value` | Attribute score value | `text-lg font-bold text-primary-700` | implemented |
| `.attribute-label` | Attribute score label | `text-xs uppercase tracking-wide text-secondary` | implemented |
| `.stat-strip` | Campaign summary panel: label/value rows | `flex flex-col gap-1` | implemented |
| `.stat` | One `dt`/`dd` row in the summary panel | `flex items-baseline gap-2` | implemented |
| `.stat-label` / `.stat-value` | Row label / figure | `shrink-0 text-xs uppercase tracking-wide text-third-500` / `min-w-0 font-semibold text-third-700` | implemented |
| `.stat-entry` / `.stat-separator` | One participant in the summary roster (`nickname · ROLE`) / its leading `\|` | `whitespace-nowrap` / `mr-1.5 text-third-300` | implemented |
| `.stat-roster` | Participants roster wrapper: entries wrap *between* participants so a long roster stays inside the panel | `flex flex-wrap gap-x-3 gap-y-1` | implemented |
| `.info-popover` | Info popover body (`BaseTooltip.vue`) | `rounded-md bg-(--popover-surface) p-2 text-left text-xs font-normal normal-case leading-snug text-(--popover-text) shadow-lg` | implemented |
| `.info-popover--fixed` | Info popover on desktop (md+); teleported + JS-positioned | `fixed z-[60]` | implemented |
| `.info-popover--inline` | Info popover on mobile (<md); expands under the trigger | `mt-1 block` | implemented |
| `.text-warning` | Warning text tone (e.g. attribute array mismatch) | `text-secondary-700` | implemented |
| `.suggested-choice` | Highlight for a suggested skill option | `rounded bg-secondary-50 px-1` | implemented |
| `.suggested-choice-group` | Highlight panel for a class's suggested abilities | `rounded-md bg-secondary-50` | implemented |
| `.info-box` / `.info-box--{info,success,warning,danger}` | Inset callout with a semantic tone (`BaseInfoBox.vue`) | `flex items-start gap-2 rounded-md border px-3 py-2 text-sm`, plus a per-tone border/bg/text pair | implemented |
| `.info-box-icon` | Tone glyph sizing inside a callout | `mt-0.5 h-4 w-4 flex-shrink-0` | implemented |
| `.info-box-title` | Optional callout heading | `font-semibold` | implemented |
| `.modal-title` | Dialog/panel title | Opts out of the page-sized `h1–h3` rules: `font-size: 1.25rem`, `text-transform: none` | implemented |
| `.markdown-help` | Formatting-help disclosure wrapper (`MarkdownHelp.vue`) | `flex flex-col items-start gap-1` | implemented |
| `.markdown-help-panel` | Cheat-sheet panel (a `BaseInfoBox`), filling the field it sits under | `w-full` | implemented |
| `.markdown-help-list` | Cheat-sheet rows (capped, so a dialog cannot grow unbounded) | `flex max-h-64 flex-col gap-1 overflow-y-auto` | implemented |
| `.markdown-help-row` | One source/render pair | `flex items-start gap-2` | implemented |
| `.markdown-help-source` | The literal snippet a user types | `w-24 shrink-0 break-all rounded bg-third-100 px-1 font-mono text-xs` | implemented |
| `.markdown-help-result` | What the snippet renders to | `min-w-0` | implemented |
| `.base-carousel` | Carousel strip wrapper (`BaseCarousel.vue`): keeps the prev/next controls beside the track | `flex items-center gap-2` | implemented |
| `.base-carousel-track` | The scrolling strip itself — flex row, scroll-snapping, scrollbar hidden | `flex min-w-0 flex-1 list-none gap-4 overflow-x-auto pb-2`, `scroll-snap-type: x mandatory`, `scrollbar-width: none` | implemented |
| `.base-carousel-item` | One card inside a carousel (`w-64`; a caller overrides it through `itemClass`) | `w-64 shrink-0`, `scroll-snap-align: start` | implemented |
| `.base-carousel-control` | Prev/next `IconButton` in a carousel | `flex-shrink-0 self-center` | implemented |

### 2.5 Edit action bar → `src/assets/main.css`

`.edit-bar` / `.edit-bar-label` render the floating, right-aligned action tag used
while editing a long form (e.g. the ship sheet's Cancel / Save). It deliberately
uses the neutral `third` palette instead of a full-width white strip, so it reads
as a floating tag. Position the wrapper with `sticky bottom-*`.

Don't hand-roll the markup: use `<BaseStickyActions>` (see §2.6), which owns the
sticky wrapper, the tag and the buttons.

**Edit in place.** A long-text block that belongs to one section is edited in that
section, not in a central settings form — `CampaignView`'s "World Lore &
Background" renders the read view and swaps in `<BaseMarkdownField>`s (plus this
bar) when the owner presses Edit. The settings form then owns only the record's
identity (name, system, image).

### 2.6 Proposed new classes (not yet implemented)

| Class | Purpose | Replaces | Status |
|-------|---------|----------|--------|
| `.spinner` | Loading spinner | `inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent` (11 sites) | implemented |
| `.guest-notice` | Guest-session notice — the header strip plus the two inline "image upload is not supported in guest mode" warnings | `bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs px-3 py-2 rounded` (3 sites). Fixed tone, independent of `data-env`, so it can sit under any environment banner | implemented |
| `.env-banner` | Environment banner shown above the header — one tone per `data-env` value | `background-color` / `border-bottom` / `color` from the `--env-banner-*` roles plus `text-xs font-medium text-center px-3 py-2` (`EnvBanner.vue`) | implemented |
| `.input-field` | Form input focus ring | The `focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent` chain (17 sites — may be done as a global `input:focus` rule instead) | implemented |
| `.section-primary` | Primary section wrapper | `bg-primary-500 p-4 rounded-lg` (5 sites) | proposed |
| `.notification-base` | Notification popup base | Replace 9 hex values in `NotificationComponent.vue` scoped style | proposed |
| `<BaseModal>` component | Modal overlay + centering wrapper | The `fixed inset-0 flex items-center justify-center bg-black/50` overlay pattern. Extracted into `src/components/base/BaseModal.vue` (props: `zIndex`; emits `close`). The dimming layer is a native `<button aria-label="Close dialog">` painted under the panel (`-z-10` inside the overlay's stacking context), so closing on outside-click is keyboard-operable too. Also closes on Escape and locks body scroll while mounted (`src/utils/bodyScrollLock.js` counts the open overlays, so a stacked dialog cannot unlock the body early). In use in `SpellDetailModal.vue`, `CreateCampaign.vue`, and `ImportCharacterModal.vue`. Any new modal introduced in later phases should use it rather than re-implementing the overlay. `BaseModal` only centres its slot: a dialog whose content can grow must cap its own panel (`max-h-[90vh] overflow-y-auto`, as in `CreateCampaign.vue` / `SpellDetailModal.vue`), and any dialog opened from inside a heading must `<Teleport to="body">` — otherwise it inherits that heading's `text-transform: uppercase` and its page-sized type ramp. | implemented |
| `<BaseCard>` component | Content card that can act as one click target | `src/components/base/BaseCard.vue` (props: `clickable`; emits: `click`). A clickable card keeps the character/campaign card chrome (surface, `border-section`, hover lift, `cursor-pointer`) and gains `role="button"` + `tabindex="0"` + Enter/Space, so the whole card is keyboard-operable. Clicks and key events from a control in the slot stay with that control (`src/utils/interactiveEvent.js`), so call sites no longer need `@click.stop` wrappers around a card's own buttons. | implemented |
| `<BaseIcon>` component | Shared monochrome line-icon library | Single source of truth for icon SVGs (`menu`, `close`, `info`, `help`, `alert`, `overview`, `lore`, `characters`, `participants`, `messages`, `settings`, `edit`, `plus`, `ship`, `spells`, `chevron-left`, `chevron-right`, `download`, `upload`, `shield`) in `src/components/base/BaseIcon.vue`. `CampaignNavIcon` delegates to it. Add new icons here, not in feature folders. | implemented |
| `<IconButton>` component | Accessible icon-only button | `src/components/base/IconButton.vue` (props: `label` (required, → `aria-label`/`title`), `variant` (`plain`/`solid`/`on-dark`), `icon`; emits `click`). Use for compact controls with no visible text. | implemented |
| `<BaseButton icon="…">` prop | Leading icon on a text button | `icon` prop on `src/components/base/BaseButton.vue` renders a `BaseIcon` before the label (`.base-btn-with-icon` / `.base-btn-icon`: `inline-flex items-center gap-1`, `h-4 w-4`). Use it instead of hand-rolled `<CampaignNavIcon …>` + `inline-flex items-center gap-1` wrappers. Edit affordances should be `variant="update" icon="edit"` (`.base-btn-update`) so they read as the prominent action. | implemented |
| `<BaseLinkButton>` component | Router link styled as a button | `src/components/base/BaseLinkButton.vue` (props: `to`, `variant`, `icon`; default slot). Renders a `<RouterLink>` with the same `.base-btn` / `.base-btn-<variant>` classes as `<BaseButton>` (plus `.base-link-btn`, which drops the action-bar margins so the wrapping element owns the spacing). Use it for navigation actions that should read as buttons (e.g. the character → campaign link) instead of a quiet `.element-link`. | implemented |
| `<BaseNumberStepper>` component | Compact `−`/`+` control for nudging a number in place | `src/components/base/BaseNumberStepper.vue` (props: `modelValue`, `min`, `max` (`null` = no cap), `step`, `editable`, `disabled`, `ariaLabel`; emits `update:modelValue`). Renders `− value +` (`.number-stepper*` in `main.css`); when `editable` is false only the value renders, so non-owners see the figure without controls. Used for the Offworlders sheet's HP/Supply/Credits/XP and the ship's Hull/Drive fuel/Credits quick-edit. | implemented |
| `<BaseInput>` component | Labelled text/number field | `src/components/base/BaseInput.vue` (props: `modelValue`, `label`, `tooltip`, `tooltipDesktopOnly`, `labelClass`, `type`, `id`, `placeholder`, `hint`, `error`, `disabled`, `readonly`, `min`, `max`, `step`, `autocomplete`; emits `update:modelValue`). Owns the `.input-field` box, the hint/error line and the `aria-describedby`/`aria-invalid` wiring. `autocomplete` is rendered only when a call site sets it (an empty attribute is flagged by browsers). No outer spacing (pass `class="mb-4"`). `type="number"` emits numbers, so call sites use plain `v-model`. | implemented |
| `<BaseStickyActions>` component | Floating edit action bar for long forms | `src/components/base/BaseStickyActions.vue` (props: `dirty`, `saving`, `saveLabel`, `cancelLabel`, `dirtyLabel`; emits `cancel` / `save`). Renders the `.edit-bar` tag — sticky, right-aligned, Cancel + Save, plus an "Unsaved changes" hint while `dirty`. Buttons are `type="button"`, so it is safe inside a `<form>` (Enter-to-submit still goes through the form's submit handler). Used by `ShipSheet.vue`, `EditCharacter.vue` and `CampaignView.vue`; pair with `useUnsavedChanges` for the navigation guard. | implemented |
| `<SlideOverDrawer>` component | Edge-anchored slide-over overlay (edge sibling of `BaseModal`) | `src/components/base/SlideOverDrawer.vue` (props: `modelValue`, `side` (`left`/`right`), `full`, `label`, `panelClass`, `zIndex`; emits `update:modelValue`/`close`). Teleports to body, closes on Escape and on a click on its labelled backdrop button, locks body scroll through the shared `src/utils/bodyScrollLock.js` lock. Used by `HeaderComponent` (full-screen menu) and `ContextSidebar` (section drawer). | implemented |
| `<ContextSidebar>` component | Contextual navigation shell (desktop rail + mobile drawer) | `src/components/base/ContextSidebar.vue` (props: `items` (`{ key, label, icon }`), `activeSection`, `label`, `contextId`, `open`; emits `select`/`update:open`). Shared by the campaign and settings shells; `CampaignSidebar` is a thin campaign-named wrapper. One place for the `.context-sidebar` rail, the `.context-nav-*` list and the `context-gradient` drawer. | implemented |
| `<ContextNavList>` component | Presentational section list for a `ContextSidebar` | `src/components/base/ContextNavList.vue` (props: `items`, `activeSection`, `label`; emits `select`). Rendered twice by `ContextSidebar` (rail + drawer) so the markup exists once. Icons come from `BaseIcon`. | implemented |
| `<ContextMobileBar>` component | Mobile contextual top bar (drawer trigger + title) | `src/components/base/ContextMobileBar.vue` (props: `title`, `triggerLabel`; emits `open`). Replaced by the `ContextSidebar` rail at md+ (`.context-mobile-bar` is `md:hidden`). Used by `CampaignView` and `SettingsView`. | implemented |
| `<BaseMarkdownField>` component | Labelled markdown field with a Write/Preview toggle | `src/components/base/BaseMarkdownField.vue` (props: `modelValue`, `label`, `tooltip`, `tooltipDesktopOnly`, `hint`, `error`, `id`, `rows`, `placeholder`, `maxlength`, `disabled`, `writeLabel`, `previewLabel`, `emptyPreview`; emits `update:modelValue`). Mirrors `<BaseInput>`'s API and adds the preview tab; the toggle never touches the value, so the form's dirty tracking is unaffected. Renders a collapsed `<MarkdownHelp>` under the field instead of printing the syntax inline. Use it for every long free-text field instead of a raw `<textarea>`. | implemented |
| `<MarkdownText>` component | Rendered markdown — the only `v-html` site | `src/components/base/MarkdownText.vue` (props: `text`). Renders `renderMarkdown()` inside `.rich-text`. Read-only views use this instead of `{{ }}` for long-text fields. | implemented |
| `<JournalBoard>` component | "My journal" — the container the campaign view renders (§4 of the campaign shell) | `src/features/journal/components/JournalBoard.vue` (props: `campaignId`). Talks to `journalStore` like `MessageBoard` does to `messageStore`; wires the pager, the editor and the conflict banner, and registers the unsaved-changes guard. | implemented |
| `<JournalPageEditor>` component | The page itself: a markdown field with a save state and a character counter | `src/features/journal/components/JournalPageEditor.vue` (props: `modelValue`, `saveState`, `charCount`, `counterVisible`, `disabled`; emits `update:modelValue`, `rejected`). Wraps `<BaseMarkdownField>` (no native `maxlength`: an over-limit value is refused whole with a message, and the field is re-keyed so the previous text comes back). | implemented |
| `<JournalPager>` component | Page navigation: previous / next, "Page N of M", jump box, new page and delete | `src/features/journal/components/JournalPager.vue` (props: `pageNumber`, `lastPageNumber`, `busy`, `canDelete`; emits `go`, `insert`, `remove`). The jump entry is resolved by `journalUtils.resolveJump`: empty or non-numeric stays put, `0` and negatives go to page 1, past the end goes to the last page. | implemented |
| `<BaseClampedText>` component | Long markdown block clamped behind a reveal control | `src/components/base/BaseClampedText.vue` (props: `text`, `lines`, `threshold`, `moreLabel`, `lessLabel`, `mode` (`inline` / `modal`), `title`). `inline` (default) expands in place — the campaign description; `modal` opens the full text in a `<BaseModal>` dialog, so use it for long blocks in a narrow column (the character identity rail). The toggle appears only when `toPlainText(text)` exceeds `threshold`, so markdown markers never count towards the cut-off. | implemented |
| `<BaseInfoBox>` component | Inset callout with a semantic tone | `src/components/base/BaseInfoBox.vue` (props: `variant` (`info` / `success` / `warning` / `danger`), `title`, `icon` (`true` picks by tone, a `BaseIcon` name overrides it, `false` hides it); default slot). Colours come from the `.info-box--{tone}` modifiers, so the tone is a prop — never pass palette utilities from the call site. No outer spacing (pass `class="mb-4"`). | implemented |
| `<MarkdownHelp>` component | Markdown formatting cheat sheet | `src/components/base/MarkdownHelp.vue` (props: `label`, default `Formatting help`). A `variant="link"` disclosure that expands an in-flow `<BaseInfoBox variant="info">` listing each supported construct as a source snippet plus a live rendering. Deliberately in-flow (not a popover or nested dialog) so it is never clipped inside a scrollable dialog. Rendered by `<BaseMarkdownField>`; use it directly wherever users need the reference. | implemented |
| `<BaseCarousel>` component | Horizontally scrolling strip of cards, with optional prev/next controls | `src/components/base/BaseCarousel.vue` (props: `items` (Array, required), `label` (the strip's accessible name), `controls` (default `true`), `itemClass`; scoped slot `item` with `{ item, index }`; no emits). Scrolling is native — drag, trackpad, and tabbing into a card — so touch and keyboard need nothing extra; the controls render only while the strip actually overflows and disable at each end, so a list that already fits gets no dead buttons. Colours belong to the cards inside (the controls are `IconButton variant="plain"`); only `.base-carousel*` layout lives in `main.css`. Used by `HomeView` for the signed-in Campaigns and Characters strips. | implemented |
---

### 2.7 Markdown & long-text fields → `src/assets/main.css`, `src/utils/markdown.js`

Every long free-text field (character notes / appearance / backstory / private
backstory, campaign short description / world lore / private description, ship
notes, message bodies, spell descriptions) is **markdown**, stored as source text
and rendered on the client:

| Layer | File | Responsibility |
|-------|------|----------------|
| Parser | `src/utils/markdown.js` | The single `markdown-it` instance (`html: false`, `linkify: true`, `breaks: true`, typographer off, images disabled). Exports `renderMarkdown()` and `toPlainText()`. |
| Rendering | `src/components/base/MarkdownText.vue` | **The only component allowed to bind `v-html`.** Wraps `renderMarkdown()` output in `.rich-text`. |
| Editing | `src/components/base/BaseMarkdownField.vue` | Textarea + Write/Preview toggle; same props as `<BaseInput>`, plus `rows` / `maxlength`. A collapsed `<MarkdownHelp>` disclosure under the field carries the syntax reference. |
| Help | `src/components/base/MarkdownHelp.vue` | Collapsed "Formatting help" disclosure: the source snippet for each supported construct next to a live rendering of it, produced by the same `MarkdownText` renderer the views use. |
| Styling | `.rich-text`, `.markdown-preview`, `.field-tabs`, `.field-tab` in `main.css` | Structure only, palette tokens only. Headings are re-sized here because the global `h1–h5` rules are page-sized. |

Rules:

- Raw HTML typed by a user is escaped (`html: false`) and unsafe link targets
  (`javascript:` etc.) are rejected by markdown-it, so **no sanitiser (e.g.
  DOMPurify) is needed** — and `v-html` must not be used anywhere else (see §3.5).
- Images are disabled on purpose: a remote image in someone else's notes would
  leak the reader's IP address to a third party. Uploads go through the campaign
  image pipeline instead.
- Text that arrives pre-escaped from third-party data (Open5e spell `desc`,
  `higher_level`, material text) is decoded once in `normalizeSpell` via
  `src/utils/htmlEntities.js` — never in a template.
- Where a preview cuts text (`CampaignList`, `<BaseClampedText>`), measure and
  truncate the `toPlainText()` output, never the raw markdown, so a cut cannot
  land inside `**bold**`.

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

### 3.5 `v-html` only inside `MarkdownText.vue`

`v-html` is allowed **only** in `src/components/base/MarkdownText.vue`, and only
with the output of `renderMarkdown()` (which escapes raw HTML and validates link
targets). Any other `v-html` binding is a review blocker — it bypasses the
escaping model, and ESLint is not configured to catch it.

### 3.6 Interactive containers are operable by keyboard

Anything that acts on click must be reachable and operable by keyboard: use a
native `<button>` or link when the element's content allows it (a dialog scrim,
a card that only navigates), otherwise keep the element's tag and give it
`role`, `tabindex` and Enter/Space handlers — `<BaseCard clickable>` and the
spell-search result row both do this. A click handler on a plain element
without them is a review blocker.

Nested controls own their events: never wrap a button in a `@click.stop`
element to keep its click out of the surrounding clickable card or row. The
container ignores clicks and key events that originate inside a nested control
instead (`src/utils/interactiveEvent.js`) — that guard cannot move onto a
component listener, where `@click.stop` would run against the component's
payload rather than the DOM event.

Form fields carry an `id` (or a `name`): a field with neither is flagged by
Chrome DevTools (autofill cannot identify it), and an `id` is what a
`label[for]` resolves against. A component that can render twice in one
document — a rail + drawer pair, a page hosting two forms — derives its ids from
`useId()` (`BaseInput`, `SpellSearch`, `CampaignDetailsForm`), and a row inside a
list uses the row's own key (`participant-nickname-${participant.id}`). Render
the label only together with its field — a `for` that points at a conditionally
hidden input is flagged too (or use a `<span>` caption where the value is a
read-only stepper instead of an input). Optional attributes stay unset rather
than empty: pass `undefined` (e.g. `<BaseInput>` only renders `autocomplete` when
a caller sets it).

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