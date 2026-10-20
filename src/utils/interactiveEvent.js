/**
 * Guards for an interactive container that nests other controls.
 *
 * A clickable card or a disclosure row owns an action (navigate, expand) while
 * holding controls of its own (a "Save" button, an "+ Add" button). Those
 * controls must not repeat the container's action, so the container ignores
 * their events.
 *
 * Doing that here replaces the `@click.stop` guard wrappers the call sites used
 * to need: a click handler on a plain element is a keyboard-accessibility
 * violation, and the same guard cannot move onto a component listener —
 * `@click.stop` compiles to `withModifiers(handler, ['stop'])`, which would call
 * `stopPropagation()` on the component's payload instead of on the DOM event.
 */

/**
 * True when a click landed on a nested control (button or link), i.e. that
 * control owns the interaction and the container must not run its own action.
 *
 * @param {MouseEvent} event
 * @returns {boolean}
 */
export function isNestedControlClick(event) {
  return Boolean(event.target?.closest?.('button, a'))
}

/**
 * True when a key event fired on the container itself rather than on one of the
 * controls it nests, so Enter/Space on a nested button never repeats the
 * container's action.
 *
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
export function isOwnKeyEvent(event) {
  return event.target === event.currentTarget
}
