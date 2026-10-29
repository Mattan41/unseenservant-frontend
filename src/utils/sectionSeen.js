import { ref } from 'vue'

/**
 * Per-user "last opened" markers for a campaign's sections.
 *
 * The campaign shell badges a section when it has changed since the user last
 * opened it — a message from somebody else, an edit to the world lore, a ship
 * save. The *changes* come from the backend (timestamps on the campaign, ship
 * and message read models); the *read state* cannot, because it is per user and
 * the API keeps no per-user state for it. So it lives here, in localStorage,
 * exactly like the view history (`viewHistory.js`): a marker per user, per
 * campaign, per section, holding the newest change stamp the user has seen.
 *
 * A marker is an opaque string — the backend writes UTC timestamps, so ISO-8601
 * text is what is usually stored (`timestampUtils.js` parses them back). A
 * section with no marker yet is *not* badged: the campaign view seeds the
 * markers from the state it just loaded, so entering a campaign for the first
 * time shows a quiet menu rather than one that shouts at every section.
 *
 * Layout:
 * `{ [userId]: { [campaignId]: { at: epochMs, seen: { [sectionKey]: marker } } } }`
 * — `at` is the last time any section of that campaign was marked, which is what
 * prunes the map so a long history cannot grow the stored value without bound.
 * Ids are stored as strings, so a backend id (`4`) and a guest-mode id
 * (`guest_campaign_1`) can live in the same map.
 */

/** localStorage key holding the whole per-user map. */
export const SECTION_SEEN_STORAGE_KEY = 'section_seen'

/** Campaigns kept per user. The least recently marked are dropped first. */
const MAX_CAMPAIGNS_PER_USER = 100

function emptySeen() {
  return {}
}

/**
 * Reads the persisted map, falling back to an empty one when nothing valid is
 * stored — malformed JSON, a non-object value, or localStorage being unavailable
 * must never break the app at module load.
 */
function readStoredSeen() {
  try {
    const stored = JSON.parse(localStorage.getItem(SECTION_SEEN_STORAGE_KEY) || 'null')
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : emptySeen()
  } catch {
    return emptySeen()
  }
}

/** Reactive map of the markers, as described above. */
export const sectionSeen = ref(readStoredSeen())

/**
 * Persists the current map. Failures are ignored: without storage the badges
 * simply fall back to "nothing is new" for this session.
 */
function persist() {
  try {
    if (Object.keys(sectionSeen.value).length === 0) {
      localStorage.removeItem(SECTION_SEEN_STORAGE_KEY)
      return
    }
    localStorage.setItem(SECTION_SEEN_STORAGE_KEY, JSON.stringify(sectionSeen.value))
  } catch {
    // localStorage unavailable (e.g. privacy mode) — badges stay session-only.
  }
}

/** Keeps the `MAX_CAMPAIGNS_PER_USER` most recently marked campaigns. */
function pruneCampaigns(campaigns) {
  const newestFirst = Object.entries(campaigns).sort(([, a], [, b]) => (b?.at || 0) - (a?.at || 0))
  return Object.fromEntries(newestFirst.slice(0, MAX_CAMPAIGNS_PER_USER))
}

/**
 * The markers one user holds for one campaign, as `{ [sectionKey]: marker }`.
 * Read inside a computed, this makes the badges re-evaluate on every new marker.
 *
 * @param {number|string|null} userId
 * @param {number|string|null} campaignId
 * @returns {Object<string, string>}
 */
export function seenMarkers(userId, campaignId) {
  if (!userId || campaignId === null || campaignId === undefined) return {}
  return sectionSeen.value[String(userId)]?.[String(campaignId)]?.seen || {}
}

/**
 * Records that the user has now seen one section: the marker it should hold from
 * here on. A marker that is not a value (`null`, `undefined`) is a no-op — there
 * is nothing to remember yet, and storing "nothing" would turn into a marker
 * that badges on the next change anyway.
 *
 * @param {number|string|null} userId
 * @param {number|string|null} campaignId
 * @param {string} sectionKey - the campaign section key (e.g. `messages`)
 * @param {string|number|null} marker - the newest change stamp that was seen
 */
export function markSectionSeen(userId, campaignId, sectionKey, marker) {
  if (!userId || campaignId === null || campaignId === undefined || !sectionKey) return
  if (marker === null || marker === undefined || marker === '') return

  const userKey = String(userId)
  const campaignKey = String(campaignId)
  const perUser = { ...sectionSeen.value[userKey] }
  const forCampaign = perUser[campaignKey] || { seen: {} }

  sectionSeen.value = {
    ...sectionSeen.value,
    [userKey]: pruneCampaigns({
      ...perUser,
      [campaignKey]: {
        at: Date.now(),
        seen: { ...forCampaign.seen, [sectionKey]: String(marker) },
      },
    }),
  }
  persist()
}

/**
 * Forgets the markers of one user, or of everybody when `userId` is omitted.
 * Called when leaving Guest Demo, so the demo session leaves nothing behind
 * (matching `clearGuestStorage` and `clearViewHistory`).
 *
 * @param {number|string|null} [userId]
 */
export function clearSectionSeen(userId = null) {
  if (userId) {
    const rest = { ...sectionSeen.value }
    delete rest[String(userId)]
    sectionSeen.value = rest
  } else {
    sectionSeen.value = emptySeen()
  }
  persist()
}
