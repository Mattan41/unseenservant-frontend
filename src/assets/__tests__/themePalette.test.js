import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AVAILABLE_THEMES, DEFAULT_THEME } from '@/utils/environment.js'

/**
 * `main.css` is the source of truth for every palette, so these checks read the
 * stylesheet itself instead of a copy of it. It is read from the filesystem
 * because Vitest does not process CSS: importing it would hand back an empty
 * module and every check below would pass for the wrong reason.
 */
const MAIN_CSS = readFileSync(resolve(process.cwd(), 'src/assets/main.css'), 'utf8')

/**
 * A palette edit that drops a token, breaks the light/dark ramp inversion or
 * sinks a colour pair below its contrast floor fails here rather than in a
 * reader's eyes. The floors were measured on the running app, and every one of
 * them is a value the stylesheet already holds — a failure here means a new
 * regression, not a pre-existing one.
 */

/** Every theme+mode block declares the same set: surface, section and the ramp. */
const PALETTE_TOKENS = [
  '--color-surface',
  '--surface-section',
  '--primary',
  ...[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => `--primary-${step}`),
]

const RAMP_STEPS = PALETTE_TOKENS.filter((token) => /^--primary-\d+$/.test(token))

/** Fixed neutral roles — they do not change per theme, only per mode. */
const TEXT_DEFAULT = { light: '#374151', dark: '#d2d7df' }
const TEXT_MUTED = { light: '#6b7280', dark: '#97a0b0' }
const TEXT_FAINT = { light: '#9ca3af', dark: '#7c8698' }

/**
 * The pairs the app paints most, each with the floor it has to clear. `exempt`
 * names the theme+mode combinations that already sit below the floor today: the
 * pre-existing debt, pinned so a new palette cannot add to it.
 */
const CONTRAST_FLOORS = [
  {
    pair: 'body text on the canvas',
    fg: '--primary-900',
    bg: '--primary-100',
    floor: 4.5,
    exempt: [],
  },
  {
    pair: 'form label on the canvas',
    fg: TEXT_DEFAULT,
    bg: '--primary-100',
    floor: 4.5,
    exempt: [],
  },
  {
    pair: 'section heading on the canvas',
    fg: '--primary-700',
    bg: '--primary-100',
    floor: 4.5,
    exempt: ['forest light'],
  },
  {
    pair: 'input text on the field',
    fg: '--primary-900',
    bg: '--primary-50',
    floor: 4.5,
    exempt: [],
  },
  {
    pair: 'badge text on the badge',
    fg: '--primary-600',
    bg: '--primary-50',
    floor: 4.5,
    exempt: ['silver light', 'forest light'],
  },
  {
    pair: 'default button label',
    fg: '--primary-100',
    bg: '--primary-700',
    floor: 4.5,
    exempt: ['forest light'],
  },
  {
    pair: 'default button label on hover',
    fg: '--primary-100',
    bg: '--primary-800',
    floor: 4.5,
    exempt: [],
  },
  {
    pair: 'context nav item',
    fg: '--primary-900',
    bg: '--primary-200',
    floor: 4.5,
    exempt: [],
  },
  {
    pair: 'inline link on the canvas',
    fg: '--primary-600',
    bg: '--primary-100',
    floor: 4.5,
    exempt: ['silver light', 'forest light'],
  },
  {
    pair: 'form CTA label (white)',
    fg: '#ffffff',
    bg: '--primary-500',
    floor: 3,
    exempt: ['silver light'],
  },
  {
    pair: 'panel body text on .section-primary',
    fg: TEXT_DEFAULT,
    bg: '--surface-section',
    floor: 3,
    exempt: ['forest light'],
  },
  {
    // The tile in an empty Characters/Campaigns panel: its label is --primary-700
    // on the panel itself. No theme clears AA here (silver is the best at 3.68:1),
    // so the floor is a regression guard rather than a promise.
    pair: 'discovery tile label on .section-primary',
    fg: '--primary-700',
    bg: '--surface-section',
    floor: 2,
    exempt: [],
  },
  {
    pair: 'help text on the canvas',
    fg: TEXT_MUTED,
    bg: '--primary-100',
    floor: 3,
    exempt: ['forest light'],
  },
  {
    pair: 'faint label on the canvas',
    fg: TEXT_FAINT,
    bg: '--primary-100',
    floor: 2,
    exempt: ['forest light'],
  },
]

const toLinear = (channel) => {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const channels = (hex) => {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16))
}

const luminance = (hex) => {
  const [r, g, b] = channels(hex)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/** Red minus blue: positive is a warm colour, negative a cool one. */
const warmth = (hex) => {
  const [r, , b] = channels(hex)
  return r - b
}

const contrastRatio = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/**
 * Every `html[data-theme='x'][data-mode='y']` block, keyed `x y`, merged in
 * document order: a theme may legitimately appear twice (its palette, then its
 * warm-neutral role overrides), and merging later-wins is what the cascade does
 * for rules of equal specificity.
 */
function readPaletteBlocks(css) {
  const blocks = new Map()
  const blockPattern = /html\[data-theme='([a-z]+)'\]\[data-mode='([a-z]+)'\]\s*\{([^}]*)\}/g
  for (const [, theme, mode, body] of css.matchAll(blockPattern)) {
    const key = `${theme} ${mode}`
    const declarations = blocks.get(key) ?? new Map()
    for (const [, token, value] of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      declarations.set(token, value.trim())
    }
    blocks.set(key, declarations)
  }
  return blocks
}

/** The shared dark roles — `html[data-mode='dark']`, inherited by every theme. */
function readDarkRoles(css) {
  const body = css.match(/html\[data-mode='dark'\]\s*\{([^}]*)\}/)?.[1] ?? ''
  const declarations = new Map()
  for (const [, token, value] of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    declarations.set(token, value.trim())
  }
  return declarations
}

/** The palette tokens declared on `:root` — the pre-JS fallback. */
function readRootPalette(css) {
  const body = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? ''
  const declarations = new Map()
  for (const [, token, value] of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    declarations.set(token, value.trim())
  }
  return declarations
}

const PALETTE_BLOCKS = readPaletteBlocks(MAIN_CSS)
const THEME_MODES = AVAILABLE_THEMES.flatMap(({ id }) => [`${id} light`, `${id} dark`])

/** A token name, a literal hex, or a per-mode literal. */
const resolveColor = (value, mode, block) => {
  if (typeof value === 'string') return value.startsWith('--') ? block.get(value) : value
  return value[mode]
}

describe('theme palettes', () => {
  it('declares a light and a dark block for every available theme and nothing else', () => {
    expect([...PALETTE_BLOCKS.keys()].sort()).toEqual([...THEME_MODES].sort())
  })

  it('declares the whole palette in every block, and nothing but hex values', () => {
    const missing = []
    const malformed = []

    for (const key of THEME_MODES) {
      const block = PALETTE_BLOCKS.get(key)
      for (const token of PALETTE_TOKENS) {
        if (!block.has(token)) missing.push(`${key} ${token}`)
        else if (!/^#[0-9a-f]{6}$/.test(block.get(token))) malformed.push(`${key} ${token}`)
      }
    }

    expect(missing).toEqual([])
    expect(malformed).toEqual([])
  })

  it('re-points a warm theme’s dark neutrals to its own hue without moving the ladder', () => {
    const shared = readDarkRoles(MAIN_CSS)
    const textDefault = shared.get('--text-default')
    const violations = []

    for (const key of THEME_MODES.filter((mode) => mode.endsWith('dark'))) {
      const block = PALETTE_BLOCKS.get(key)
      // Only a theme that overrides the shared neutrals has this role in its block.
      if (!block.has('--surface-muted')) continue

      for (const [token, value] of block) {
        if (PALETTE_TOKENS.includes(token)) continue

        const sharedValue = shared.get(token)
        if (!sharedValue) {
          violations.push(`${key} ${token}: not a shared dark role`)
          continue
        }
        if (warmth(value) <= warmth(sharedValue)) {
          violations.push(`${key} ${token}: ${value} is not warmer than ${sharedValue}`)
        }
        // The shared ladder is what keeps every text-on-surface ratio where it
        // was, so a value may differ in hue but not in lightness. The band is
        // 0.5x-1.5x rather than tight because one role (--neutral-strong-hover)
        // lands at 0.85x: the theme's hue cannot reach that luminance by scaling
        // its canvas colour, and the warmer value still gains contrast (5.2 -> 5.8).
        const drift = luminance(value) / luminance(sharedValue)
        if (drift < 0.5 || drift > 1.5) {
          violations.push(`${key} ${token}: ${drift.toFixed(2)}x the shared luminance`)
        }
      }

      // Rounding to integer hex moves a ratio by hundredths, so the check is for a
      // real loss of contrast, not for a rounding wobble.
      const muted = block.get('--surface-muted')
      const sharedMuted = shared.get('--surface-muted')
      const tolerance = 0.05
      if (contrastRatio(textDefault, muted) < contrastRatio(textDefault, sharedMuted) - tolerance) {
        violations.push(`${key}: body text lost contrast on --surface-muted`)
      }
    }

    expect(violations).toEqual([])
    // The two warm themes override; silver and forest keep the shared neutrals.
    expect(THEME_MODES.filter((key) => PALETTE_BLOCKS.get(key).has('--surface-muted'))).toEqual([
      'crimson dark',
      'golden dark',
    ])
  })

  it('runs the ramp light→dark in light mode and back in dark mode', () => {
    const outOfOrder = []

    for (const key of THEME_MODES) {
      const ramp = RAMP_STEPS.map((token) => luminance(PALETTE_BLOCKS.get(key).get(token)))

      for (let i = 1; i < ramp.length; i += 1) {
        const climbs = key.endsWith('light') ? ramp[i] < ramp[i - 1] : ramp[i] > ramp[i - 1]
        if (!climbs) outOfOrder.push(`${key}: ${RAMP_STEPS[i - 1]} to ${RAMP_STEPS[i]}`)
      }
    }

    expect(outOfOrder).toEqual([])
  })

  it('keeps cards above the canvas and the dark panel below the cards', () => {
    const mismatched = []

    for (const key of THEME_MODES) {
      const block = PALETTE_BLOCKS.get(key)
      const surface = luminance(block.get('--color-surface'))

      if (surface <= luminance(block.get('--primary-100'))) mismatched.push(`${key} card vs canvas`)
      if (key.endsWith('dark') && luminance(block.get('--surface-section')) >= surface) {
        mismatched.push(`${key} panel vs card`)
      }
    }

    expect(mismatched).toEqual([])
  })

  it('mirrors the default theme’s light palette on :root for the first paint', () => {
    const fallback = readRootPalette(MAIN_CSS)
    const light = PALETTE_BLOCKS.get(`${DEFAULT_THEME} light`)

    const mismatched = PALETTE_TOKENS.filter(
      (token) => fallback.get(token) !== light.get(token),
    ).map(
      (token) =>
        `${token}: ${fallback.get(token)} on :root, ${light.get(token)} in ${DEFAULT_THEME}`,
    )

    expect(mismatched).toEqual([])
  })

  it.each(CONTRAST_FLOORS)('clears the contrast floor: $pair', ({ fg, bg, floor, exempt }) => {
    const below = []

    for (const key of THEME_MODES) {
      if (exempt.includes(key)) continue

      const block = PALETTE_BLOCKS.get(key)
      const mode = key.split(' ')[1]
      const ratio = contrastRatio(resolveColor(fg, mode, block), resolveColor(bg, mode, block))

      if (ratio < floor) below.push(`${key} at ${ratio.toFixed(2)}:1, floor ${floor}:1`)
    }

    expect(below).toEqual([])
  })
})
