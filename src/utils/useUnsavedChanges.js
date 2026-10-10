import { onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

const DEFAULT_MESSAGE = 'You have unsaved changes. Leave without saving?'

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
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
}
