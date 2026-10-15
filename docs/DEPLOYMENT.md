# Deployment - unseenservant-frontend

Two environments run this image, and a third mode runs with no backend at all.
The host-side runbook and the verification checklist live in the infrastructure
repository (`Mattan41/projects-notes`,
`unseen-servant/staging/README.md`).

## Images and tags

`.github/workflows/docker-image.yml` publishes one multi-architecture manifest
(`linux/amd64` + `linux/arm64`, built on native runners and merged with
`docker buildx imagetools create`) from two events:

| Event | Tags |
|---|---|
| release published | `:latest` and `:<release tag>` |
| push to `main` | `:main` |

`VITE_USER_NODE_ENV=prod` is used as a build argument for both, so the published
bundle behaves as production in either environment.

* **`:latest` is production.** Production's watchtower follows it and rolls the
  new image out on its own within its polling interval, so a merge-to-main
  workflow must never move that tag. The job resolves its tags in a single step,
  and the step after it fails the run if `:latest` would be published outside a
  release event.
* **`:main` is staging** (Raspberry Pi 5). It is overwritten on every merge, and
  the Pi's watchtower follows it for the same reason production follows
  `:latest`.

## Environment variables are baked in at build time

Vite inlines `import.meta.env.*` during the build, so a published image is not
configurable per host. `.env.production` therefore ships an empty
`VITE_API_BASE_URL` and no `VITE_OAUTH_BASE_URL`, which keeps every request
relative (`/api/...`, `/images/...`, `/oauth-redirect`) and lets the nginx in
front decide where the backend lives. That is why one image serves both
environments without a per-environment build.

Guest demo mode (the `localStorage` adapter, no backend at all) ships in the same
bundle and is a project invariant: an infrastructure change must not break it.

## nginx config ownership

`nginx/default.conf` is baked into the image at
`/etc/nginx/conf.d/default.conf`, **and** hosts mount their own copy over that
same path. The mounted file wins.

`nginx/default.conf` is the repository's copy: it ships with the app and is
reviewed with it. It is deliberately left as it is for now, and it is **not** the
file production runs. The two are not equal:

* production's `~/projects/us/nginx.conf` forces `X-Forwarded-Proto https`,
  `X-Forwarded-Host $http_host` and `X-Forwarded-Port 443` on `/oauth2/` and
  `/login/oauth2/`, and clears `Authorization` plus hides `Set-Cookie` on
  `/images/`;
* this file does neither.

The consequence is worth stating plainly: Spring derives `redirect_uri` from the
forwarded headers, so **a host that runs this image without mounting its own
config fails every OAuth login with `redirect_uri_mismatch`**. Every host mounts a
file — do not rely on the baked one. Reconciling the two copies is an open task;
until then the host copies are what actually runs, and changes have to be
promoted deliberately in both directions.

## Known gap: a recreated backend needs an nginx restart

nginx resolves a `proxy_pass` hostname once, at startup, and keeps that address for
the worker's lifetime. When watchtower recreates the backend container (new IP)
without recreating nginx, the site answers 502 until nginx is restarted. Production
has no `resolver` directive, so the current workaround is `docker restart my-nginx`
after every release.

The fix is a `resolver 127.0.0.11 valid=5s ipv6=off;` directive plus a variable
upstream — `set $upstream backend:8080;` and `proxy_pass http://$upstream;` — in
each proxying location. The variable form is required: nginx caches a literal
hostname regardless. Two traps: a request can still fail for one `valid` window
after the upstream moves, and no URI may sit next to the variable, because nginx
then sends that URI verbatim for every request (`proxy_pass http://$upstream/api/`
would collapse every path to `/api/`).

This is deliberately not applied here yet. It is a task of its own, to be tried on
the staging host before production, and until it lands the restart stays part of
the release routine. Measured locally on the shape above: the variable form
recovered without an nginx restart, the literal form stayed broken indefinitely
while the backend was demonstrably alive at its new address.

## test.unseenservant.se — a Cloudflare Worker in front of staging

A third origin, deliberately light: Workers Assets serves the SPA from the edge,
and the Worker script relays only the paths that need a backend to the staging
box on the Raspberry Pi.

| | Served by | Backend |
|---|---|---|
| `unseenservant.se` | nginx in this image (OptiPlex) | `backend:8080` in the same compose |
| `staging.unseenservant.se` | the same image (Pi), host-mounted `nginx.conf` | `backend:8080` in the same compose |
| `test.unseenservant.se` | `wrangler` + Workers Assets | proxied to `https://staging.unseenservant.se` |

The test origin has its own `localStorage` and can carry its own Cloudflare
Access policy, so it never shares a session with staging.

### Routing

`wrangler.jsonc` hands `assets.run_worker_first` the two prefixes that must reach
the Worker (`/api/*`, `/images/*`); every other request is asset-first, and a
path matching no asset returns `index.html` (`not_found_handling:
"single-page-application"`), which is what Vue Router's history mode needs.

`/oauth2/*`, `/login/oauth2/*` and `/logout` are **not** on that list, and that is
deliberate. The handshake runs on staging: the SPA sends `oauth-init` to
`VITE_OAUTH_BASE_URL`, staging sets its redirect-origin cookie there and sends the
browser back to this origin, which staging permits because
`https://test.unseenservant.se` is in its `ALLOWED_ORIGINS`. Relaying the
handshake through the Worker instead would need a `test.unseenservant.se` redirect
URI registered at Google **and** GitHub, manual handling of the 3xx responses in
the Worker instead of letting `fetch` follow them, and staging's nginx to stop
overwriting `X-Forwarded-Host` on those two locations. `/logout` is a client-side
route (the store only clears `localStorage`), so serving `index.html` for it is
correct — better than the nginx hosts, where a hard reload of `/logout` reaches
the backend.

### Configuration is build-time here too

`.env.test` holds this origin's values and `npm run build:test` bakes them in:
`VITE_OAUTH_BASE_URL` points at staging, `VITE_API_BASE_URL` stays empty
(same-origin through the Worker), and `VITE_USER_NODE_ENV=dev` renders the
"Development environment" banner so this origin can never be mistaken for
production.

The Worker's **Variables and secrets are deliberately empty**, including in a
Git-connected build. Cloudflare injects those into the build environment as well,
and a variable that already exists when Vite runs beats every `.env` file — so a
leftover there is an invisible override rather than a visible error. A
`VITE_USER_NODE_ENV=env` silently drops the banner, and a stale
`VITE_API_BASE_URL` quietly bypasses the Worker's proxy. `.env.test` is the
single source; to see which one won, read the attribute the app sets on the
document in the browser console:

```js
document.documentElement.dataset.env // 'dev' from .env.test · 'prod' if neither ran
```

Runtime variables are worse than useless here: an already-built bundle cannot be
reconfigured, which is why the deploy is `npm run build:test && npx wrangler
deploy` and never `wrangler deploy` on its own.

### Deploy

```sh
npm ci
npm run build:test
npx wrangler deploy
```

The same two commands work as a Cloudflare Workers Build (build command
`npm run build:test`, deploy command `npx wrangler deploy`). Either way the values
come from `.env.test` in the repository. `wrangler` is not a dependency of this
project — `npx` fetches it; pin it in `devDependencies` if you would rather lock
the version.

Then add `test.unseenservant.se` as a custom domain or route for the
`unseenservant-frontend-staging` Worker — the `name` in `wrangler.jsonc` has to
match it, or a deploy lands on a second Worker and leaves the configured one
empty — and give the origin an Access policy if it should not be open.

### Verifying it

```sh
curl -sI https://test.unseenservant.se/ | head -1              # 200, from the assets
curl -sI https://test.unseenservant.se/api/auth/me | head -1   # 401, from staging's backend
curl -sI https://test.unseenservant.se/campaigns | head -1     # 200, index.html for an SPA route
```

The 401 is the interesting one: it is the backend answering, through the Worker.
A 502 means staging is unreachable; a 200 with HTML means the Worker did not match
the path and the SPA answered instead.

Then log in with Google: the browser must leave for staging (visible in the
address bar), come back to
`test.unseenservant.se/oauth-redirect?token=...`, and `/api/auth/me` must answer
200 afterwards.

## Keeping this file honest

Changing the workflow, the tag contract, the nginx ownership rules or the test
Worker's routing means updating this document in the same change.
