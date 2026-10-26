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

/**
 * Neutral roles are named as tokens rather than hex values, because a warm theme
 * re-points them (crimson and golden do, in both modes). `resolveColor` reads the
 * theme's own value and falls back to the shared one, so every floor below is
 * checked against the colours that actually paint.
 */
const TEXT_DEFAULT = '--text-default'
const TEXT_MUTED = '--text-muted'
const TEXT_FAINT = '--text-subtle'

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
    pair: 'chip label on the raised surface',
    fg: TEXT_DEFAULT,
    bg: '--surface-raised',
    floor: 4.5,
    exempt: [],
  },
  {
    pair: 'sheet section text on the muted surface',
    fg: TEXT_DEFAULT,
    bg: '--surface-muted',
    floor: 4.5,
    exempt: [],
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

/** Every declaration inside the first match of a block selector. */
function readDeclarations(css, pattern) {
  const body = css.match(pattern)?.[1] ?? ''
  const declarations = new Map()
  for (const [, token, value] of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    declarations.set(token, value.trim())
  }
  return declarations
}

/** The palette tokens declared on `:root` — the pre-JS fallback and light roles. */
function readRootPalette(css) {
  return readDeclarations(css, /:root\s*\{([^}]*)\}/)
}

const PALETTE_BLOCKS = readPaletteBlocks(MAIN_CSS)
const THEME_MODES = AVAILABLE_THEMES.flatMap(({ id }) => [`${id} light`, `${id} dark`])

/** The fixed ramps from the `@theme` block, which the shared roles point at. */
const THEME_SCALE = readDeclarations(MAIN_CSS, /@theme\s*\{([^}]*)\}/)
/** The shared light roles; every theme inherits them unless it overrides them. */
const LIGHT_ROLES = readRootPalette(MAIN_CSS)
/** The shared dark roles (`html[data-mode='dark']`), inherited by every theme. */
const DARK_ROLES = readDeclarations(MAIN_CSS, /html\[data-mode='dark'\]\s*\{([^}]*)\}/)

const sharedRolesFor = (key) => (key.endsWith('dark') ? DARK_ROLES : LIGHT_ROLES)

/** `--text-subtle: var(--color-third-400)` to `#9ca3af` — one level of indirection. */
const followReference = (value) =>
  THEME_SCALE.get(String(value).match(/^var\((--[a-z0-9-]+)\)$/)?.[1]) ?? value

/**
 * A role token resolved for one theme+mode: the theme's own value when it
 * overrides the role, otherwise the shared one. A literal hex resolves to itself.
 */
const resolveColor = (value, key) => {
  if (!value.startsWith('--')) return value
  const own = PALETTE_BLOCKS.get(key).get(value)
  return followReference(own ?? sharedRolesFor(key).get(value))
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

  it('keeps every theme’s inset surfaces on silver’s own step from that theme’s card', () => {
    // L(surface) / L(card) is the relationship the design relies on: "quieter" and
    // "inset" have to sit below silver's white card, "raised" above the dark one.
    // Silver is the reference because the shared roles were tuned against it.
    const STEP_TOLERANCE = 0.2
    const steps = (key) =>
      ['--surface-muted', '--surface-inset', '--surface-raised'].map((token) => ({
        token,
        step: luminance(resolveColor(token, key)) / luminance(resolveColor('--color-surface', key)),
      }))

    const references = { light: steps('silver light'), dark: steps('silver dark') }
    const violations = []

    for (const key of THEME_MODES) {
      const expected = references[key.endsWith('dark') ? 'dark' : 'light']
      steps(key).forEach(({ token, step }, index) => {
        const want = expected[index].step
        if (Math.abs(step / want - 1) > STEP_TOLERANCE) {
          violations.push(
            `${key} ${token}: step ${step.toFixed(3)}, silver's is ${want.toFixed(3)}`,
          )
        }
      })
    }

    expect(violations).toEqual([])
  })

  it('re-points a warm theme’s text, borders and fills to its own hue without moving their luminance', () => {
    const violations = []

    for (const key of THEME_MODES) {
      const block = PALETTE_BLOCKS.get(key)
      // A theme that overrides the neutral *text* roles is the one re-pointing the family.
      if (!block.has('--text-default')) continue

      const shared = sharedRolesFor(key)

      for (const [token, value] of block) {
        if (PALETTE_TOKENS.includes(token)) continue

        const sharedValue = shared.get(token)
        if (!sharedValue) {
          violations.push(`${key} ${token}: not a shared role`)
          continue
        }
        const sharedHex = followReference(sharedValue)
        if (!/^#[0-9a-f]{6}$/.test(sharedHex)) {
          violations.push(`${key} ${token}: the shared ${sharedValue} did not resolve to a hex`)
          continue
        }
        if (warmth(value) <= warmth(sharedHex)) {
          violations.push(`${key} ${token}: ${value} is not warmer than ${sharedHex}`)
        }
        // The shared ladder is what keeps every text-on-surface ratio where it
        // was, so a value may differ in hue but not in lightness. The band is
        // 0.5x-1.5x rather than tight because one role (--neutral-strong-hover in
        // the dark themes) lands at 0.85x: that hue cannot reach the luminance by
        // scaling the canvas colour, and the warmer value still gains contrast
        // (5.2:1 -> 5.8:1).
        // Rounding a colour to integer hex moves its luminance by a fraction of a
        // percent — proportionally more for dark values, where one channel step is
        // worth more of L — hence the band rather than an exact match.
        const drift = luminance(value) / luminance(sharedHex)
        if (drift < 0.5 || drift > 1.5) {
          violations.push(`${key} ${token}: ${drift.toFixed(2)}x the shared luminance`)
        }
      }
    }

    expect(violations).toEqual([])
    // The two warm themes override the family, in both modes; silver and forest
    // keep the shared hue (they only rescale their inset surfaces).
    expect(THEME_MODES.filter((key) => PALETTE_BLOCKS.get(key).has('--text-default'))).toEqual([
      'crimson light',
      'crimson dark',
      'golden light',
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

      const ratio = contrastRatio(resolveColor(fg, key), resolveColor(bg, key))

      if (ratio < floor) below.push(`${key} at ${ratio.toFixed(2)}:1, floor ${floor}:1`)
    }

    expect(below).toEqual([])
  })
})
