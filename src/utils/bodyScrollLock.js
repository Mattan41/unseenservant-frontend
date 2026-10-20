/**
 * Body scroll lock, shared by every overlay (`BaseModal`, `SlideOverDrawer`).
 *
 * Open overlays are counted at module scope instead of each component writing
 * `document.body.style.overflow` on its own: a dialog stacked on top of another
 * (an image editor opened from a form dialog, a drawer over a modal) cannot
 * unlock the body early when the first one closes.
 *
 * Callers hold the lock only while their overlay is open, so every call to
 * `unlockBodyScroll()` must pair with a `lockBodyScroll()`.
 */

/** Number of overlays currently holding the lock; the body stays locked above 0. */
let lockedOverlays = 0

/** Take the body scroll lock (once per open overlay). */
export function lockBodyScroll() {
  lockedOverlays += 1
  document.body.style.overflow = 'hidden'
}

/** Release the lock this overlay holds, keeping the body locked while others do. */
export function unlockBodyScroll() {
  lockedOverlays = Math.max(0, lockedOverlays - 1)
  if (lockedOverlays === 0) {
    document.body.style.overflow = ''
  }
}
