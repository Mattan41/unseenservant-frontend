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
 *   data-mode  — 'light'         : surface / neutral palette (dark later)
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
  document.documentElement.setAttribute('data-theme', newTheme)

  // Client-side only for now. A future commit may mirror this to the
  // backend and reconcile on login. Keep the localStorage write — it is
  // the source of truth before any backend fetch.
  try {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  } catch {
    // localStorage unavailable (e.g. privacy mode) — theme still applies for this session.
  }
}

/** Active mode. Only 'light' exists today; prefers-color-scheme is a later pass. */
export const DEFAULT_MODE = 'light'

/**
 * Applies the three axes to <html>.
 *
 * data-mode will become reactive (prefers-color-scheme) in a future pass;
 * data-theme is applied from the (possibly persisted) reactive `theme`.
 */
export function applyEnvironmentAttributes() {
  const root = document.documentElement
  root.setAttribute('data-env', ENVIRONMENT)
  root.setAttribute('data-theme', theme.value)
  root.setAttribute('data-mode', DEFAULT_MODE)
}
