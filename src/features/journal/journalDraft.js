/**
 * The unsaved-text mirror for a journal page.
 *
 * Autosave is debounced, so a tab that is closed in the middle of a sentence can
 * lose the last few words: a `beforeunload` prompt cannot wait for a request to
 * finish. This module is the belt to that braces — the editor's text is written
 * to localStorage synchronously on every keystroke and removed again once the
 * save has landed, so the next visit can restore it.
 *
 * Deliberately separate from the API layer: it holds no contract with the
 * backend, only this browser's copy of what the user is typing.
 */

const KEY_PREFIX = 'journal_draft'

/** One key per user + campaign + page (the virtual page keys on its own name). */
function storageKey(userId, campaignId, pageKey) {
  return `${KEY_PREFIX}:${userId ?? 'anon'}:${campaignId}:${pageKey}`
}

/**
 * The mirrored text, or `null` when there is none.
 * @param {number|string|null} userId
 * @param {number|string|null} campaignId
 * @param {number|string} pageKey the page id, or `'virtual'`
 * @returns {{content: string}|null}
 */
export function readDraft(userId, campaignId, pageKey) {
  try {
    const raw = localStorage.getItem(storageKey(userId, campaignId, pageKey))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed?.content === 'string' ? parsed : null
  } catch {
    return null
  }
}

/**
 * Mirror the text. Called on every keystroke, so it stays small and synchronous.
 */
export function writeDraft(userId, campaignId, pageKey, content) {
  try {
    localStorage.setItem(storageKey(userId, campaignId, pageKey), JSON.stringify({ content }))
  } catch {
    // A full or unavailable storage must never break typing.
  }
}

/** Drop the mirror once the text is saved (or the page is gone). */
export function clearDraft(userId, campaignId, pageKey) {
  try {
    localStorage.removeItem(storageKey(userId, campaignId, pageKey))
  } catch {
    // Nothing to do — the mirror is only a safety net.
  }
}
