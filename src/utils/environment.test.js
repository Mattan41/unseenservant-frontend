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

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('environment', () => {
  it('treats staging as an environment of its own', async () => {
    const environment = await loadEnvironment('staging')
    expect(environment.ENVIRONMENT).toBe('staging')
    expect(environment.IS_STAGING_ENVIRONMENT).toBe(true)
    expect(environment.IS_DEV_ENVIRONMENT).toBe(false)
    expect(environment.IS_DEMO_ENVIRONMENT).toBe(false)
  })

  it('keeps dev and demo from being read as staging', async () => {
    const dev = await loadEnvironment('dev')
    expect(dev.IS_DEV_ENVIRONMENT).toBe(true)
    expect(dev.IS_STAGING_ENVIRONMENT).toBe(false)

    const demo = await loadEnvironment('demo')
    expect(demo.IS_DEMO_ENVIRONMENT).toBe(true)
    expect(demo.IS_STAGING_ENVIRONMENT).toBe(false)
  })

  it('falls back to dev when the value is missing', async () => {
    const environment = await loadEnvironment('')
    expect(environment.ENVIRONMENT).toBe('dev')
    expect(environment.IS_DEV_ENVIRONMENT).toBe(true)
    expect(environment.IS_STAGING_ENVIRONMENT).toBe(false)
  })

  it('reports production as none of the non-production environments', async () => {
    const environment = await loadEnvironment('prod')
    expect(environment.IS_DEV_ENVIRONMENT).toBe(false)
    expect(environment.IS_STAGING_ENVIRONMENT).toBe(false)
    expect(environment.IS_DEMO_ENVIRONMENT).toBe(false)
  })

  it('writes the environment to <html data-env>', async () => {
    const environment = await loadEnvironment('staging')
    environment.applyEnvironmentAttributes()
    expect(document.documentElement.getAttribute('data-env')).toBe('staging')
  })
})
