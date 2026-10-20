import { ref } from 'vue'

/**
 * Environment / theme / mode wiring for the <html> element.
 *
 * Three independent axes (the canonical model is documented in
 * src/assets/main.css):
 *   data-env   — 'local' | 'dev' | 'test' | 'staging' | 'prod' | 'demo'
 *                : where this bundle is served. It selects the environment
 *                  banner's text here and its colours in main.css
 *                  (`html[data-env='X']` → --env-banner-*).
 *   data-theme — 'silver'        : identity / brand palette (forest alternative)
 *   data-mode  — 'light' | 'dark': surface / neutral palette. Resolved from a
 *                'system' | 'light' | 'dark' preference that follows the OS by
 *                default and can be overridden in Settings → General.
 */

/** Build environment, sourced from the Vite env (falls back to 'local'). */
export const ENVIRONMENT = import.meta.env.VITE_USER_NODE_ENV || 'local'

/** True only for a local dev server (`npm run dev`). */
export const IS_LOCAL_ENVIRONMENT = ENVIRONMENT === 'local'

/**
 * True only for dev.unseenservant.se, the Cloudflare Worker that previews this
 * frontend against production's backend. Its own value because that origin
 * looks at real data, so the banner must not borrow the local wording.
 */
export const IS_DEV_ENVIRONMENT = ENVIRONMENT === 'dev'

/** True only for test.unseenservant.se, the Worker that previews staging. */
export const IS_TEST_ENVIRONMENT = ENVIRONMENT === 'test'

/**
 * True only for staging.unseenservant.se: the Raspberry Pi (the `:main` image).
 * Its own value so the banner can say "staging" rather than borrowing another
 * environment's wording.
 */
export const IS_STAGING_ENVIRONMENT = ENVIRONMENT === 'staging'

/** True only for the local demo environment. */
export const IS_DEMO_ENVIRONMENT = ENVIRONMENT === 'demo'

/**
 * Short human-readable label per environment, for read-only display (e.g. the
 * general settings section). Distinct from the banner messages in `App.vue`,
 * which warn about an environment rather than name it.
 */
export const ENVIRONMENT_LABELS = {
  local: 'Local development',
  dev: 'Development preview',
  test: 'Test',
  staging: 'Staging',
  prod: 'Production',
  demo: 'Demo mode',
}

/** Label for the environment this bundle is served from. */
export const ENVIRONMENT_LABEL = ENVIRONMENT_LABELS[ENVIRONMENT] || ENVIRONMENT

/**
 * Fallback theme used when no user preference is stored (see `setTheme`).
 * The theme switcher in the settings view (General) persists the choice in
 * localStorage.
 */
export const DEFAULT_THEME = 'silver'

/** localStorage key holding the user's chosen theme. */
export const THEME_STORAGE_KEY = 'theme'

/** Themes the app can render — must match the html[data-theme] blocks in main.css. */
export const AVAILABLE_THEMES = [
  { id: 'silver', label: 'Silver' },
  { id: 'forest', label: 'Forest' },
]

/**
 * Reads the persisted theme, falling back to DEFAULT_THEME when nothing valid
 * is stored (or when localStorage is unavailable).
 */
function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return AVAILABLE_THEMES.some((option) => option.id === stored) ? stored : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/** Active theme (reactive). Initialised from localStorage at app start. */
export const theme = ref(readStoredTheme())

/**
 * Switches the active theme: updates the ref, <html data-theme>, and the
 * persisted preference. Unknown theme ids are ignored.
 */
export function setTheme(newTheme) {
  if (!AVAILABLE_THEMES.some((option) => option.id === newTheme)) return

  theme.value = newTheme
  document.documentElement.dataset.theme = newTheme

  // Client-side only for now. A future commit may mirror this to the
  // backend and reconcile on login. Keep the localStorage write — it is
  // the source of truth before any backend fetch.
  try {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  } catch {
    // localStorage unavailable (e.g. privacy mode) — theme still applies for this session.
  }
}

/**
 * Mode preference — 'system' follows the OS, 'light'/'dark' override it. The
 * default is `system`, so no stored value means "follow prefers-color-scheme".
 */
export const DEFAULT_MODE = 'system'

/** localStorage key holding the user's mode preference. */
export const MODE_STORAGE_KEY = 'mode'

/** Modes the user can pick — must match the data-mode values in main.css. */
export const AVAILABLE_MODES = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

/** Media query that reports the OS colour-scheme preference. */
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * True when the OS asks for dark. Guarded because `matchMedia` is absent in
 * jsdom and in any non-browser render, and importing this module must not throw.
 */
function prefersDark() {
  try {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(SYSTEM_DARK_QUERY).matches
      : false
  } catch {
    return false
  }
}

/** Resolves a preference to the concrete mode painted on <html>. */
function resolveMode(preference) {
  if (preference === 'system') return prefersDark() ? 'dark' : 'light'
  return preference
}

/**
 * Reads the persisted mode preference, falling back to DEFAULT_MODE when
 * nothing valid is stored (or when localStorage is unavailable).
 */
function readStoredMode() {
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    return AVAILABLE_MODES.some((option) => option.id === stored) ? stored : DEFAULT_MODE
  } catch {
    return DEFAULT_MODE
  }
}

/** Active mode preference (reactive). Initialised from localStorage at app start. */
export const mode = ref(readStoredMode())

/** The concrete mode currently painted ('light' or 'dark'); 'system' resolved. */
export const resolvedMode = ref(resolveMode(mode.value))

/** Writes the resolved mode onto <html data-mode>. */
function applyModeAttribute() {
  resolvedMode.value = resolveMode(mode.value)
  document.documentElement.dataset.mode = resolvedMode.value
}

/**
 * Switches the mode preference: updates the ref, <html data-mode>, and the
 * persisted preference. Unknown ids are ignored; 'system' re-reads the OS.
 */
export function setMode(newMode) {
  if (!AVAILABLE_MODES.some((option) => option.id === newMode)) return

  mode.value = newMode
  applyModeAttribute()

  // Client-side only for now, like the theme. Keep the localStorage write — it
  // is the source of truth before any future backend mirror.
  try {
    localStorage.setItem(MODE_STORAGE_KEY, newMode)
  } catch {
    // localStorage unavailable (e.g. privacy mode) — mode still applies this session.
  }
}

// Live OS changes only matter while the preference is 'system'. Subscribing
// once here (guarded for non-browser environments) keeps <html> in step
// without any component polling.
try {
  if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia(SYSTEM_DARK_QUERY).addEventListener?.('change', () => {
      if (mode.value === 'system') applyModeAttribute()
    })
  }
} catch {
  // No matchMedia (jsdom/build) — nothing to subscribe to.
}

/**
 * Applies the three axes to <html>.
 *
 * data-mode is the resolved OS/override mode; data-theme is applied from the
 * (possibly persisted) reactive `theme`.
 */
export function applyEnvironmentAttributes() {
  const root = document.documentElement
  root.dataset.env = ENVIRONMENT
  root.dataset.theme = theme.value
  applyModeAttribute()
}
