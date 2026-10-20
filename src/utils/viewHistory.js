import { ref } from 'vue'

/**
 * Per-user view history — when the current user last opened a campaign or a
 * character.
 *
 * Deliberately client-only and stored in localStorage: the backend has no
 * "last viewed" field, and the ordering it feeds is a browser-local
 * convenience, not shared data. Every entry is keyed by user id, so the Guest
 * Demo user (`guest_demo`) and real accounts never mix, and logging out does
 * not wipe somebody else's history. Mirrors the `environment.js` pattern
 * (module-level reactive ref + guarded localStorage reads).
 */

/** localStorage key holding the whole per-user map. */
export const VIEW_HISTORY_STORAGE_KEY = 'view_history'

/** Viewable record kinds — one timestamp map per kind, per user. */
export const VIEW_KINDS = ['campaign', 'character']

/**
 * Entries kept per user and kind. The oldest are pruned on write, so a very
 * long browsing history cannot grow the localStorage value without bound.
 */
const MAX_ENTRIES_PER_KIND = 100

function emptyHistory() {
  return {}
}

/**
 * Reads the persisted history, falling back to an empty map when nothing valid
 * is stored — malformed JSON, a non-object value, or localStorage being
 * unavailable must never break the app at module load.
 */
function readStoredHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(VIEW_HISTORY_STORAGE_KEY) || 'null')
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : emptyHistory()
  } catch {
    return emptyHistory()
  }
}

/**
 * Reactive view history:
 * `{ [userId]: { campaign: { [id]: epochMs }, character: { [id]: epochMs } } }`.
 */
export const viewHistory = ref(readStoredHistory())

/**
 * Persists the current map. Failures are ignored: without storage the lists
 * simply fall back to their incoming order for this session.
 */
function persist() {
  try {
    if (Object.keys(viewHistory.value).length === 0) {
      localStorage.removeItem(VIEW_HISTORY_STORAGE_KEY)
      return
    }
    localStorage.setItem(VIEW_HISTORY_STORAGE_KEY, JSON.stringify(viewHistory.value))
  } catch {
    // localStorage unavailable (e.g. privacy mode) — ordering stays session-only.
  }
}

/** Keeps the `MAX_ENTRIES_PER_KIND` most recently viewed ids. */
function pruneEntries(entries) {
  const newestFirst = Object.entries(entries).sort(([, a], [, b]) => b - a)
  return Object.fromEntries(newestFirst.slice(0, MAX_ENTRIES_PER_KIND))
}

/**
 * The timestamps one user has recorded for one kind, as `{ [id]: epochMs }`.
 * Read inside a store getter, this makes the getter re-sort on every new view.
 *
 * @param {string} kind - one of `VIEW_KINDS`
 * @param {number|string|null} userId
 * @returns {Object<string, number>}
 */
export function viewedAtByUser(kind, userId) {
  if (!userId) return {}
  return viewHistory.value[String(userId)]?.[kind] || {}
}

/**
 * When the user last viewed a record, or `0` when they never have.
 *
 * @param {string} kind - one of `VIEW_KINDS`
 * @param {number|string|null} id
 * @param {number|string|null} userId
 * @returns {number} Epoch milliseconds
 */
export function viewedAt(kind, id, userId) {
  if (id === null || id === undefined) return 0
  return viewedAtByUser(kind, userId)[String(id)] || 0
}

/**
 * Records that the user has just viewed a record. Ids are stored as strings,
 * so a backend id (`4`) and its guest-mode counterpart (`'4'`) are the same
 * entry. A missing id or user id is a no-op — the user profile loads
 * asynchronously, so views are recorded again once it arrives.
 *
 * @param {string} kind - one of `VIEW_KINDS`
 * @param {number|string|null} id
 * @param {number|string|null} userId
 */
export function recordView(kind, id, userId) {
  if (id === null || id === undefined || id === '' || !userId) return

  const userKey = String(userId)
  const perUser = { ...viewHistory.value[userKey] }
  const entries = { ...perUser[kind], [String(id)]: Date.now() }

  viewHistory.value = {
    ...viewHistory.value,
    [userKey]: { ...perUser, [kind]: pruneEntries(entries) },
  }
  persist()
}

/**
 * Forgets the view history of one user, or of everybody when `userId` is
 * omitted. Called when leaving Guest Demo, so the demo session leaves nothing
 * behind (matching `clearGuestStorage`).
 *
 * @param {number|string|null} [userId]
 */
export function clearViewHistory(userId = null) {
  if (userId) {
    const rest = { ...viewHistory.value }
    delete rest[String(userId)]
    viewHistory.value = rest
  } else {
    viewHistory.value = emptyHistory()
  }
  persist()
}
