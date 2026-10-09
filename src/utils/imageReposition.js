/**
 * Pure geometry helpers for the image reposition (crop) editor.
 *
 * The editor shows a fixed "frame" (the visible crop area). The image is
 * displayed on top of it, draggable and zoomable, and is always scaled so it
 * fully covers the frame. These helpers translate the on-screen offset/zoom
 * into a source-image rectangle that can be drawn onto a canvas.
 *
 * All values are unit-agnostic (pixels) as long as the same unit is used for
 * the frame and the displayed size. The source-image helpers convert back to
 * the image's natural pixel space.
 */

/**
 * Scale that makes an image exactly cover a frame (the `zoom = 1` baseline).
 * Uses the larger ratio so the shorter edge fills the frame.
 *
 * @param {number} imageWidth Natural image width in pixels.
 * @param {number} imageHeight Natural image height in pixels.
 * @param {number} frameWidth Frame width in pixels.
 * @param {number} frameHeight Frame height in pixels.
 * @returns {number} The cover scale, or 1 when any input is invalid.
 */
export function computeBaseScale(imageWidth, imageHeight, frameWidth, frameHeight) {
  if (!imageWidth || !imageHeight || !frameWidth || !frameHeight) return 1
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight)
}

/**
 * On-screen size of the image at a given zoom level.
 *
 * @param {number} imageWidth Natural image width in pixels.
 * @param {number} imageHeight Natural image height in pixels.
 * @param {number} frameWidth Frame width in pixels.
 * @param {number} frameHeight Frame height in pixels.
 * @param {number} [zoom=1] Zoom factor applied on top of the cover scale.
 * @returns {{ width: number, height: number }} Displayed size in pixels.
 */
export function computeDisplaySize(imageWidth, imageHeight, frameWidth, frameHeight, zoom = 1) {
  const scale = computeBaseScale(imageWidth, imageHeight, frameWidth, frameHeight) * zoom
  return { width: imageWidth * scale, height: imageHeight * scale }
}

/**
 * Clamp an image offset so the image always fully covers the frame.
 * The offset is the top-left corner of the image relative to the frame,
 * therefore it is always <= 0 on both axes.
 *
 * @param {number} offsetX Desired x offset in pixels.
 * @param {number} offsetY Desired y offset in pixels.
 * @param {number} displayWidth Displayed image width in pixels.
 * @param {number} displayHeight Displayed image height in pixels.
 * @param {number} frameWidth Frame width in pixels.
 * @param {number} frameHeight Frame height in pixels.
 * @returns {{ x: number, y: number }} The clamped offset.
 */
export function clampOffset(
  offsetX,
  offsetY,
  displayWidth,
  displayHeight,
  frameWidth,
  frameHeight,
) {
  const minX = frameWidth - displayWidth
  const minY = frameHeight - displayHeight
  return {
    x: Math.min(0, Math.max(minX, offsetX)),
    y: Math.min(0, Math.max(minY, offsetY)),
  }
}

/**
 * Map the visible frame (in displayed coordinates) back to a rectangle in the
 * source image's natural pixel space, for use with `drawImage`.
 *
 * @param {number} offsetX Image x offset relative to the frame.
 * @param {number} offsetY Image y offset relative to the frame.
 * @param {number} displayWidth Displayed image width in pixels.
 * @param {number} displayHeight Displayed image height in pixels.
 * @param {number} frameWidth Frame width in pixels.
 * @param {number} frameHeight Frame height in pixels.
 * @param {number} imageWidth Natural image width in pixels.
 * @param {number} imageHeight Natural image height in pixels.
 * @returns {{ sx: number, sy: number, sWidth: number, sHeight: number }} Source rectangle.
 */
export function computeCropRect(
  offsetX,
  offsetY,
  displayWidth,
  displayHeight,
  frameWidth,
  frameHeight,
  imageWidth,
  imageHeight,
) {
  const ratioX = displayWidth ? imageWidth / displayWidth : 1
  const ratioY = displayHeight ? imageHeight / displayHeight : 1
  return {
    sx: -offsetX * ratioX || 0,
    sy: -offsetY * ratioY || 0,
    sWidth: frameWidth * ratioX,
    sHeight: frameHeight * ratioY,
  }
}
