import { describe, it, expect, vi, afterEach } from 'vitest'

/**
 * environment.js reads import.meta.env at module scope, so every case needs a
 * fresh module instance with the value stubbed before the import.
 */
async function loadEnvironment(value) {
  vi.resetModules()
  vi.stubEnv('VITE_USER_NODE_ENV', value)
  return import('@/utils/environment.js')
}

/** One flag per environment value — the banner tone keys off exactly one. */
const ENVIRONMENT_FLAGS = {
  local: 'IS_LOCAL_ENVIRONMENT',
  dev: 'IS_DEV_ENVIRONMENT',
  test: 'IS_TEST_ENVIRONMENT',
  staging: 'IS_STAGING_ENVIRONMENT',
  demo: 'IS_DEMO_ENVIRONMENT',
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  localStorage.clear()
})

/**
 * Stubs `matchMedia` so a `system` preference resolves deterministically. The
 * default jsdom environment has no `matchMedia`, which the module treats as
 * "light".
 */
function stubMatchMedia(matches) {
  vi.stubGlobal('matchMedia', (query) => ({
    matches,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }))
}

describe('environment', () => {
  it('gives every origin its own value, so no two share a banner tone', async () => {
    for (const [value, flag] of Object.entries(ENVIRONMENT_FLAGS)) {
      const environment = await loadEnvironment(value)
      expect(environment.ENVIRONMENT).toBe(value)
      expect(environment[flag]).toBe(true)

      for (const other of Object.values(ENVIRONMENT_FLAGS)) {
        if (other !== flag) expect(environment[other]).toBe(false)
      }
    }
  })

  it('falls back to local when the value is missing', async () => {
    const environment = await loadEnvironment('')
    expect(environment.ENVIRONMENT).toBe('local')
    expect(environment.IS_LOCAL_ENVIRONMENT).toBe(true)
    expect(environment.IS_DEV_ENVIRONMENT).toBe(false)
  })

  it('reports production as none of the non-production environments', async () => {
    const environment = await loadEnvironment('prod')
    for (const flag of Object.values(ENVIRONMENT_FLAGS)) {
      expect(environment[flag]).toBe(false)
    }
  })

  it('writes the environment to <html data-env>', async () => {
    const environment = await loadEnvironment('test')
    environment.applyEnvironmentAttributes()
    expect(document.documentElement.getAttribute('data-env')).toBe('test')
  })
})

describe('mode', () => {
  it('defaults to system and resolves to light when the OS has no dark preference', async () => {
    stubMatchMedia(false)
    const environment = await loadEnvironment('local')
    expect(environment.DEFAULT_MODE).toBe('system')
    expect(environment.mode.value).toBe('system')
    expect(environment.resolvedMode.value).toBe('light')
  })

  it('resolves system to dark when the OS prefers dark', async () => {
    stubMatchMedia(true)
    const environment = await loadEnvironment('local')
    expect(environment.resolvedMode.value).toBe('dark')
  })

  it('honours and persists an explicit override', async () => {
    stubMatchMedia(false)
    const environment = await loadEnvironment('local')

    environment.setMode('dark')

    expect(environment.mode.value).toBe('dark')
    expect(environment.resolvedMode.value).toBe('dark')
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark')
    expect(localStorage.getItem('mode')).toBe('dark')
  })

  it('ignores an unknown mode id', async () => {
    const environment = await loadEnvironment('local')
    environment.setMode('neon')
    expect(environment.mode.value).toBe('system')
  })

  it('reads a stored preference instead of the default', async () => {
    localStorage.setItem('mode', 'light')
    stubMatchMedia(true)
    const environment = await loadEnvironment('local')
    expect(environment.mode.value).toBe('light')
    expect(environment.resolvedMode.value).toBe('light')
  })

  it('writes the resolved mode to <html data-mode>', async () => {
    stubMatchMedia(true)
    const environment = await loadEnvironment('local')
    environment.applyEnvironmentAttributes()
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark')
  })
})
