/**
 * Environment / theme / mode wiring for the <html> element.
 *
 * Three independent axes (the canonical model is documented in
 * src/assets/main.css):
 *   data-env   — 'dev' | 'prod'  : environment signal (drives the banner only)
 *   data-theme — 'forest'        : identity / brand palette (silver later)
 *   data-mode  — 'light'         : surface / neutral palette (dark later)
 */

/** Build environment, sourced from the Vite env (falls back to 'dev'). */
export const ENVIRONMENT = import.meta.env.VITE_USER_NODE_ENV || 'dev'

/** True only for the development environment. */
export const IS_DEV_ENVIRONMENT = ENVIRONMENT === 'dev'

/** True only for the local demo environment. */
export const IS_DEMO_ENVIRONMENT = ENVIRONMENT === 'demo'

/**
 * Fallback theme used when no user preference is stored. A future commit
 * adds a theme switcher under /user that persists the choice in localStorage.
 */
export const DEFAULT_THEME = 'silver'

/** Active mode. Only 'light' exists today; prefers-color-scheme is a later pass. */
export const DEFAULT_MODE = 'light'

/**
 * Applies the three axes to <html>.
 *
 * data-mode will become reactive (prefers-color-scheme) and data-theme
 * switchable in future passes — this pass only wires the defaults.
 */
export function applyEnvironmentAttributes() {
  const root = document.documentElement
  root.setAttribute('data-env', ENVIRONMENT)
  root.setAttribute('data-theme', DEFAULT_THEME)
  root.setAttribute('data-mode', DEFAULT_MODE)
}
