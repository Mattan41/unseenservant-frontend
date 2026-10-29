import { parseUtcTimestamp } from '@/utils/timestampUtils.js'

/**
 * Which campaign sections deserve a badge, and why.
 *
 * Pure presentation logic — no store access, no colours — mirroring the pattern
 * established by `spellUtils.js` / `campaignUtils.js`. The two halves it brings
 * together come from opposite sides:
 *
 * - **what changed** is the backend's: `updatedAt` on the campaign and the ship,
 *   the newest message's `createdAt`, and the campaign activity read model
 *   (`GET /api/campaigns/activity`) that reports all three per campaign.
 * - **what the user has seen** is the client's own, kept per user in
 *   localStorage (`utils/sectionSeen.js`), because the API holds no per-user
 *   read state.
 *
 * A badge therefore means "changed since you last opened this section" — the
 * same thing Discord's channel badges mean. Nothing here polls or pushes: it is
 * evaluated from whatever the view has loaded.
 *
 * Section keys are the ones `CampaignView`'s `SECTIONS` uses, and the tables
 * below are keyed by them; a section that is not listed never badges.
 */

/** The section keys that can carry a badge. */
export const MESSAGES_SECTION_KEY = 'messages'
export const LORE_SECTION_KEY = 'lore'
export const SHIP_SECTION_KEY = 'ship'

/**
 * The newest `createdAt` in a message list, normalised to UTC ISO-8601 — the
 * form every marker is stored in. Falls back to `fallback` (usually "now") when
 * there is no usable stamp at all, so that the *first* message ever written to a
 * campaign still badges rather than being swallowed by a missing marker.
 *
 * @param {Array<{createdAt?: string}>} messages
 * @param {string|null} [fallback]
 * @returns {string|null}
 */
export function newestMessageStamp(messages, fallback = null) {
  const times = (messages || [])
    .map((message) => parseUtcTimestamp(message?.createdAt))
    .filter(Boolean)
    .map((date) => date.getTime())

  if (!times.length) return fallback
  return new Date(Math.max(...times)).toISOString()
}

/**
 * The markers that reflect the state currently on screen — what to store when a
 * section is opened, and what to seed an unmarked campaign with.
 *
 * @param {object} params
 * @param {object|null} params.campaign - the campaign as loaded (its `updatedAt`)
 * @param {object|null} params.ship - the ship as loaded, when the campaign has one
 * @param {Array} [params.messages] - the campaign's messages
 * @param {string} [params.now] - what to fall back to when an area has no stamp
 * @returns {{messages: string, lore: string, ship: string}}
 */
export function currentMarkers({ campaign, ship, messages = [], now = new Date().toISOString() }) {
  return {
    [MESSAGES_SECTION_KEY]: newestMessageStamp(messages, now),
    [LORE_SECTION_KEY]: parseUtcTimestamp(campaign?.updatedAt) ? campaign.updatedAt : now,
    [SHIP_SECTION_KEY]: parseUtcTimestamp(ship?.updatedAt) ? ship.updatedAt : now,
  }
}

/**
 * How many messages are new for this user: written by somebody else, after the
 * marker. Their own posts never count — they wrote them, and the store appends
 * them to the list as they are sent.
 *
 * A missing or unparseable marker answers `0` rather than "everything", because
 * an unmarked section is one the user has not opened yet and is seeded instead
 * of badged (see `currentMarkers`).
 *
 * @param {Array<{userId: (number|string), createdAt?: string}>} messages
 * @param {number|string|null} userId
 * @param {string|null|undefined} marker
 * @returns {number}
 */
export function unreadMessageCount(messages, userId, marker) {
  const seenAt = parseUtcTimestamp(marker)
  if (!seenAt) return 0

  return (messages || []).filter((message) => {
    if (String(message?.userId) === String(userId)) return false
    const writtenAt = parseUtcTimestamp(message?.createdAt)
    return writtenAt ? writtenAt.getTime() > seenAt.getTime() : false
  }).length
}

/**
 * Whether `stamp` is newer than the marker — the one comparison every badge is
 * built on. Either side missing (no such stamp, or the section is unmarked)
 * answers `false`, so a half-loaded campaign never lights up.
 *
 * @param {string|null|undefined} stamp - when the area last changed
 * @param {string|null|undefined} marker - when the user last saw it
 * @returns {boolean}
 */
export function changedSince(stamp, marker) {
  const changedAt = parseUtcTimestamp(stamp)
  const seenAt = parseUtcTimestamp(marker)
  if (!changedAt || !seenAt) return false
  return changedAt.getTime() > seenAt.getTime()
}

/**
 * The badge each badgeable section should wear, keyed by section key.
 *
 * Messages carry a **count** (the campaign's messages are loaded anyway), while
 * the world lore and the ship carry a **dot**: the backend reports that those
 * changed and when, never how much.
 *
 * @param {object} params
 * @param {object|null} params.campaign
 * @param {object|null} params.ship
 * @param {Array} [params.messages]
 * @param {number|string|null} params.userId
 * @param {Object<string, string>} [params.markers] - this user's markers
 * @returns {{messages: {count: number}, lore: {isNew: boolean}, ship: {isNew: boolean}}}
 */
export function sectionAlerts({ campaign, ship, messages = [], userId, markers = {} }) {
  return {
    [MESSAGES_SECTION_KEY]: {
      count: unreadMessageCount(messages, userId, markers[MESSAGES_SECTION_KEY]),
    },
    [LORE_SECTION_KEY]: {
      isNew: changedSince(campaign?.updatedAt, markers[LORE_SECTION_KEY]),
    },
    [SHIP_SECTION_KEY]: {
      isNew: changedSince(ship?.updatedAt, markers[SHIP_SECTION_KEY]),
    },
  }
}

/**
 * Whether a campaign deserves the "something changed" dot in the campaign list,
 * from one row of the activity read model.
 *
 * The list holds no messages of its own, so this is a dot rather than a count:
 * `lastMessageAt` says somebody wrote something new, and the exact number appears
 * one click later, in that campaign's own menu. A campaign with no ship (or with
 * no activity row at all) simply has no ship stamp to compare.
 *
 * @param {object|null} activity - `{ campaignUpdatedAt, lastMessageAt, shipUpdatedAt }`
 * @param {Object<string, string>} [markers]
 * @returns {boolean}
 */
export function campaignHasActivity(activity, markers = {}) {
  if (!activity) return false
  return (
    changedSince(activity.lastMessageAt, markers[MESSAGES_SECTION_KEY]) ||
    changedSince(activity.campaignUpdatedAt, markers[LORE_SECTION_KEY]) ||
    changedSince(activity.shipUpdatedAt, markers[SHIP_SECTION_KEY])
  )
}
