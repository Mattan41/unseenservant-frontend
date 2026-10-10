import { onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

const DEFAULT_MESSAGE = 'You have unsaved changes. Leave without saving?'

// Guards registered by active forms, so that in-app navigation which does NOT
// change the route (e.g. switching sections inside a campaign) can ask for
// confirmation too — the router guards never see those.
const activeGuards = new Set()

/**
 * Ask the user to confirm before discarding unsaved changes held by any active
 * form. Returns `false` when the user chooses to stay.
 *
 * Call this from in-app navigation that bypasses the router.
 */
export function confirmDiscardUnsavedChanges() {
  for (const guard of activeGuards) {
    if (guard.isDirty() && !window.confirm(guard.message)) return false
  }
  return true
}

/**
 * Warns before navigating away (or closing/reloading the tab) while there are
 * unsaved changes. The user can choose to proceed without saving.
 *
 * `isDirty` is a function so callers can derive dirtiness from reactive state
 * on demand without extra bookkeeping — e.g.
 * `useUnsavedChanges(() => JSON.stringify(form) !== initialSnapshot)`.
 *
 * Must be called from a component's `setup` that lives on a routed view (so
 * `onBeforeRouteLeave` has a route to guard).
 *
 * @param {() => boolean} isDirty - returns true when there are unsaved changes
 * @param {string} [message] - confirmation text shown on route navigation
 */
export function useUnsavedChanges(isDirty, message = DEFAULT_MESSAGE) {
  const guard = { isDirty, message }
  activeGuards.add(guard)

  onBeforeRouteLeave(() => {
    if (!isDirty()) return true
    return window.confirm(message)
  })

  function onBeforeUnload(event) {
    if (!isDirty()) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    activeGuards.delete(guard)
  })
}
