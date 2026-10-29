/**
 * Audit-trail presentation helpers.
 *
 * The event type is the wire contract (`AuditEventType` in the backend); its
 * label and its badge colour live here, so the Logs view holds no type → colour
 * decision in its template — the pattern `spellUtils.js` and `userUtils.js`
 * establish.
 *
 * An unrecognised type is deliberately not an error. The backend can add one
 * before the frontend knows about it, and a log view that breaks on a new event
 * is worse than one that shows it plainly.
 */

/** Every type the backend records, in the order the filter lists them. */
export const AUDIT_EVENT_TYPES = [
  'ACCOUNT_CREATED',
  'LOGIN_SUCCEEDED',
  'LOGIN_FAILED',
  'LOGIN_THROTTLED',
  'OAUTH_REFUSED',
  'ROLE_CHANGED',
  'ROLE_CHANGE_REFUSED',
  'WHITELIST_ADDED',
  'WHITELIST_UPDATED',
  'WHITELIST_REVOKED',
]

const EVENT_LABELS = {
  ACCOUNT_CREATED: 'Account created',
  LOGIN_SUCCEEDED: 'Signed in',
  LOGIN_FAILED: 'Failed sign-in',
  LOGIN_THROTTLED: 'Sign-in throttled',
  OAUTH_REFUSED: 'Provider sign-in refused',
  ROLE_CHANGED: 'Role changed',
  ROLE_CHANGE_REFUSED: 'Role change refused',
  WHITELIST_ADDED: 'Address admitted',
  WHITELIST_UPDATED: 'Whitelist row updated',
  WHITELIST_REVOKED: 'Address revoked',
}

/** Semantic badge classes (main.css §2.3) — never palette utilities. */
const EVENT_BADGE_CLASSES = {
  ACCOUNT_CREATED: 'badge-teal',
  LOGIN_SUCCEEDED: 'badge-muted',
  LOGIN_FAILED: 'badge-danger',
  LOGIN_THROTTLED: 'badge-danger',
  OAUTH_REFUSED: 'badge-yellow',
  ROLE_CHANGED: 'badge-purple',
  ROLE_CHANGE_REFUSED: 'badge-yellow',
  WHITELIST_ADDED: 'badge-teal',
  WHITELIST_UPDATED: 'badge-blue',
  WHITELIST_REVOKED: 'badge-danger',
}

/**
 * Human-readable label for an event type.
 *
 * @param {string|null|undefined} type
 * @returns {string}
 */
export function getEventLabel(type) {
  return EVENT_LABELS[type] || String(type || 'Unknown event')
}

/**
 * Map an event type to a semantic badge class.
 *
 * @param {string|null|undefined} type
 * @returns {string} Semantic badge class name
 */
export function getEventBadgeClass(type) {
  return EVENT_BADGE_CLASSES[type] || 'badge-muted'
}

/**
 * Who did it, and to whom — the one line the row shows under the badge.
 *
 * Both names are copies the backend took when the event was written, so they
 * read correctly even after an account is renamed or deleted, and a failed
 * attempt has no account behind it at all. That is why this is text and not a
 * link to a profile.
 *
 * @param {object|null|undefined} event An AuditEventDTO
 * @returns {string}
 */
export function getEventParties(event) {
  const actor = event?.actorName || '—'
  return event?.targetName ? `${actor} → ${event.targetName}` : actor
}
