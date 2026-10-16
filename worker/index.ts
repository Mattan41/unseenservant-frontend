/**
 * Cloudflare Worker for test.unseenservant.se.
 *
 * The SPA itself is served from Workers Assets. This script exists only so the
 * paths that need a backend reach the staging box on the Raspberry Pi:
 *
 *   /api/*     the REST API
 *   /images/*  uploaded campaign, character and ship images
 *
 * Everything else is either an asset or an SPA route and never reaches this
 * code. Which requests get here at all is decided by
 * `assets.run_worker_first` in wrangler.jsonc — keep PROXY_PREFIXES below and
 * that list in step.
 *
 * Deliberate choices, each with a reason not to "simplify" it:
 *
 * 1. `/oauth2/*`, `/login/oauth2/*` and `/logout` are NOT proxied.
 *    The handshake runs on staging itself: the SPA sends oauth-init to
 *    VITE_OAUTH_BASE_URL (staging), staging sets its `oauth_redirect_origin`
 *    cookie there and, after the provider round trip, redirects the browser
 *    back to this origin — which staging allows because
 *    https://test.unseenservant.se is in its ALLOWED_ORIGINS. Relaying the
 *    handshake through this Worker instead would require (a) a
 *    test.unseenservant.se redirect URI registered at Google and GitHub, and
 *    (b) manual handling of the 3xx responses here instead of letting fetch
 *    follow them server-side. (A third obstacle used to be staging's nginx
 *    overwriting X-Forwarded-Host with $http_host on those locations; the
 *    reconciled nginx config passes a Worker's X-Forwarded-Host through, so only
 *    the registration and the 3xx handling remain.) That is a later task, not a
 *    Worker change. `/logout` is a client-side route (the store only clears
 *    localStorage), so serving index.html for it is correct.
 *
 * 2. `Host` is never set by hand: it is a forbidden header in the Workers
 *    runtime and would be ignored. The host comes from the URL the request is
 *    sent to.
 *
 * 3. Only X-Forwarded-Host is set. X-Forwarded-Proto/Port would be pointless
 *    here: the app never reads the scheme on /api/ or /images/ (image URLs in
 *    the DTOs are relative paths), so whatever staging's nginx reports for it
 *    changes nothing. X-Forwarded-Host is preserved for /api/ by the map in that
 *    config, and it is what CustomOAuth2SuccessHandler falls back to when its
 *    origin cookie is missing — so it should say test.unseenservant.se, not the
 *    proxy target.
 *
 * No imports and no Cloudflare types on purpose: wrangler bundles this with
 * esbuild, which strips types without checking them, so the Worker adds no
 * dependency to the project. An editor may underline the DOM types until a
 * tsconfig (or @cloudflare/workers-types) is added for this folder.
 */

interface Env {
  /** Workers Assets binding, declared in wrangler.jsonc. */
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

const STAGING_HOST = 'staging.unseenservant.se'

/** The public origin this Worker answers on, as staging should see it. */
const PUBLIC_HOST = 'test.unseenservant.se'

/** Must match assets.run_worker_first in wrangler.jsonc. */
const PROXY_PREFIXES = ['/api/', '/images/']

function shouldProxy(pathname: string): boolean {
  return PROXY_PREFIXES.some(
    // Also match the bare prefix, so `/api` does not fall through to the SPA.
    (prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix),
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (!shouldProxy(url.pathname)) {
      return env.ASSETS.fetch(request)
    }

    // Same path and query, different host: the backend routes are identical
    // behind staging's nginx, so nothing has to be rewritten.
    const target = new URL(request.url)
    target.protocol = 'https:'
    target.host = STAGING_HOST

    const proxied = new Request(target, request)
    proxied.headers.set('X-Forwarded-Host', PUBLIC_HOST)

    return fetch(proxied)
  },
}
