/**
 * User presentation helpers.
 *
 * Role labels and their badge colours live here so components never hold
 * role → colour decisions in their templates, mirroring the pattern
 * established by `campaignUtils.js` and `spellUtils.js`.
 */

/** Backend role that grants administration rights. */
export const ADMIN_ROLE = 'ADMIN'

/** Backend role of an ordinary account. */
export const USER_ROLE = 'USER'

/**
 * Whether a role string means "administrator".
 *
 * `/api/users/me` returns the bare enum (`ADMIN`) while `/api/auth/me` returns
 * the granted authority (`ROLE_ADMIN`), so the `ROLE_` prefix is stripped and
 * the comparison is case-insensitive.
 *
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export function isAdminRole(role) {
  const normalized = String(role || '')
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, '')
  return normalized === ADMIN_ROLE
}

/**
 * Human-readable label for an account role.
 *
 * @param {string|null|undefined} role
 * @returns {string}
 */
export function getRoleLabel(role) {
  return isAdminRole(role) ? 'Administrator' : 'Standard user'
}

/**
 * Map an account role to a semantic badge class (see main.css §2.3).
 *
 * @param {string|null|undefined} role
 * @returns {string} Semantic badge class name
 */
export function getRoleBadgeClass(role) {
  return isAdminRole(role) ? 'badge-info' : 'badge-muted'
}