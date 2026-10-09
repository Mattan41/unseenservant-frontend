import { describe, it, expect } from 'vitest'
import {
  computeBaseScale,
  computeDisplaySize,
  clampOffset,
  computeCropRect,
} from '@/utils/imageReposition.js'

describe('computeBaseScale', () => {
  it('covers the frame using the larger ratio', () => {
    // Landscape image in a square frame: width fills, height overflows.
    expect(computeBaseScale(2000, 1000, 300, 300)).toBe(300 / 1000)
  })

  it('uses the height ratio for a portrait image in a square frame', () => {
    expect(computeBaseScale(1000, 2000, 300, 300)).toBe(300 / 1000)
  })

  it('falls back to 1 for invalid inputs', () => {
    expect(computeBaseScale(0, 100, 300, 300)).toBe(1)
    expect(computeBaseScale(100, 100, 0, 300)).toBe(1)
  })
})

describe('computeDisplaySize', () => {
  it('covers the frame at zoom 1 and scales with zoom', () => {
    const base = computeDisplaySize(2000, 1000, 300, 300)
    expect(base.width).toBe(600)
    expect(base.height).toBe(300)

    const zoomed = computeDisplaySize(2000, 1000, 300, 300, 1.5)
    expect(zoomed.width).toBeCloseTo(900)
    expect(zoomed.height).toBeCloseTo(450)
  })
})

describe('clampOffset', () => {
  it('keeps the image covering the frame', () => {
    // Displayed 600x300 in a 300x300 frame -> x in [-300, 0], y == 0.
    expect(clampOffset(-100, 0, 600, 300, 300, 300)).toEqual({ x: -100, y: 0 })
    // Out of bounds on the top/left is clamped to 0.
    expect(clampOffset(50, 25, 600, 300, 300, 300)).toEqual({ x: 0, y: 0 })
    // Out of bounds on the bottom/right is clamped to the minimum.
    expect(clampOffset(-500, -100, 600, 300, 300, 300)).toEqual({ x: -300, y: 0 })
  })
})

describe('computeCropRect', () => {
  it('centers the crop for a centered offset', () => {
    // 2000x1000 image displayed 600x300, centered in a 300x300 frame.
    const crop = computeCropRect(-150, 0, 600, 300, 300, 300, 2000, 1000)
    expect(crop.sx).toBe(500)
    expect(crop.sy).toBe(0)
    expect(crop.sWidth).toBe(1000)
    expect(crop.sHeight).toBe(1000)
  })

  it('moves toward the top-left when the image is dragged down/right', () => {
    const crop = computeCropRect(0, 0, 600, 300, 300, 300, 2000, 1000)
    expect(crop.sx).toBe(0)
    expect(crop.sy).toBe(0)
  })

  it('handles zero display size defensively', () => {
    const crop = computeCropRect(0, 0, 0, 0, 300, 300, 2000, 1000)
    expect(crop.sWidth).toBe(300)
    expect(crop.sHeight).toBe(300)
  })
})
