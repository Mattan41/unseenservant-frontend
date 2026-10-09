import { ref } from 'vue'

/**
 * Environment / theme / mode wiring for the <html> element.
 *
 * Three independent axes (the canonical model is documented in
 * src/assets/main.css):
 *   data-env   — 'dev' | 'prod'  : environment signal (drives the banner only)
 *   data-theme — 'silver'        : identity / brand palette (forest alternative)
 *   data-mode  — 'light'         : surface / neutral palette (dark later)
 */

/** Build environment, sourced from the Vite env (falls back to 'dev'). */
export const ENVIRONMENT = import.meta.env.VITE_USER_NODE_ENV || 'dev'

/** True only for the development environment. */
export const IS_DEV_ENVIRONMENT = ENVIRONMENT === 'dev'

/** True only for the local demo environment. */
export const IS_DEMO_ENVIRONMENT = ENVIRONMENT === 'demo'

/**
 * Fallback theme used when no user preference is stored (see `setTheme`).
 * The theme switcher in UserProfileView persists the choice in localStorage.
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
