import { onBeforeUnmount, onMounted } from 'vue'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'

/**
 * Live campaign section badges.
 *
 * The campaign list and a campaign's own rail both mark what changed since the
 * user last looked, and both want that mark to appear while the page is open
 * rather than only after a reload. This polls the change stamps that decision is
 * built from — `GET /api/campaigns/activity`, one row per campaign the user is
 * in, a single request for the whole list — on a slow interval, and only while
 * the tab is visible.
 *
 * One timer, not one per caller: the list and a campaign view can be on screen
 * together (or overlap while the router swaps one for the other), so the poll is
 * ref-counted and shared. This only keeps the backend's "what changed" half
 * fresh; the client's read state stays in `sectionSeen.js`, and the badge logic
 * re-evaluates on its own when the stamps land in the store.
 */

/**
 * How often the stamps are re-read. Slow on purpose: a badge is not urgent, and
 * the endpoint is cheap but not free. Well above the interval at which a human
 * notices a stale dot appearing.
 */
export const ACTIVITY_POLL_INTERVAL_MS = 45_000

// --- Shared poll state (module-level, so every caller shares one timer) ------
let subscribers = 0
let timerId = null

/**
 * Reads the stamps once. Done inside the store, so this stays a thin driver and
 * the call is silent on failure (a badge that cannot be computed simply does not
 * appear — see `campaignStore.fetchCampaignActivity`).
 */
function tick() {
  useCampaignStore().fetchCampaignActivity()
}

function startTimer() {
  if (timerId !== null) return
  timerId = setInterval(tick, ACTIVITY_POLL_INTERVAL_MS)
}

function stopTimer() {
  if (timerId === null) return
  clearInterval(timerId)
  timerId = null
}

/**
 * A hidden tab polls nothing. Coming back refreshes once — the stamps may have
 * moved while the tab was away — and then resumes the interval.
 */
function handleVisibilityChange() {
  if (document.hidden) {
    stopTimer()
    return
  }
  tick()
  startTimer()
}

/**
 * Register this component as a consumer of the shared activity poll. Call it
 * from `setup`: the poll starts (and reads once) when the first consumer mounts,
 * and stops when the last one unmounts.
 */
export function useCampaignActivityPoll() {
  onMounted(() => {
    subscribers += 1
    if (subscribers > 1) return

    document.addEventListener('visibilitychange', handleVisibilityChange)
    if (!document.hidden) {
      tick()
      startTimer()
    }
  })

  onBeforeUnmount(() => {
    subscribers = Math.max(0, subscribers - 1)
    if (subscribers > 0) return

    document.removeEventListener('visibilitychange', handleVisibilityChange)
    stopTimer()
  })
}
