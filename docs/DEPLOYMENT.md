# Deployment - unseenservant-frontend

Two environments run this image, and a third mode runs with no backend at all.
The host-side runbook lives in the infrastructure repository
(`Mattan41/projects-notes`: `unseen-servant/README.md` for the runbook and
`unseen-servant/infra/` for the compose files and the host-side nginx copies).

## Images and tags

`.github/workflows/docker-image.yml` publishes one multi-architecture manifest
(`linux/amd64` + `linux/arm64`, built on native runners and merged with
`docker buildx imagetools create`) from two events:

| Event | Tags |
|---|---|
| release published | `:latest` and `:<release tag>` |
| push to `main` | `:main` |

`VITE_USER_NODE_ENV` is the one build-time difference between the two: a release
builds with `prod`, which hides the environment banner; a merge to `main` builds
with `staging`, which draws it. Both otherwise use the same `.env.production`
values, so the published bundle behaves as production in either environment.

* **`:latest` is production.** Production's watchtower follows it and rolls the
  new image out on its own within its polling interval, so a merge-to-main
  workflow must never move that tag. The job resolves its tags in a single step,
  and the step after it fails the run if `:latest` would be published outside a
  release event.
* **`:main` is staging** (Raspberry Pi 5). It is overwritten on every merge, but
  the Pi runs no watchtower: the pull is manual, so a merge reaches staging only
  when someone pulls `:main` and recreates the containers there.

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
`/etc/nginx/conf.d/default.conf`, and a host may mount its own copy over that same
path. A mounted file wins.

This repository's `nginx/default.conf` is the **source of truth**. Both hosts had
drifted copies — the host copies were the ones that made OAuth work — and the
files are now reconciled. What the reconciliation changed:

* `/oauth2/` and `/login/oauth2/` no longer hardcode `X-Forwarded-Proto https`,
  `X-Forwarded-Host $http_host` and `X-Forwarded-Port 443`; the scheme and host
  now come through the maps in *Forwarded headers*, so Spring still derives
  `https://<public host>/login/oauth2/code/<provider>`;
* `X-Forwarded-Port` is gone entirely (*Forwarded headers* explains why);
* `location /logout` is gone — it answered 401 (*What each location is for*);
* `/images/` no longer clears `Authorization` or hides `Set-Cookie` (*What each
  location is for*);
* the header set lives once at server level, because `proxy_set_header` is
  all-or-nothing per level and the per-location repeats were what drifted.

The rule from here on: **a conf change lands in this repository first**, and then
the host copies are set to the same bytes. Patches go the other way only in an
emergency, and are copied back the same day.

A host that drops its mount simply runs the baked file, which is that same
content — the tidier end state for staging, where a merge to `main` plus a pull
then delivers the bundle and the config together. It is only safe once the
`:main` image actually carries the new file: the previous baked copy had none of
the fixes above.

The config file itself carries only one-line pointers into this section, so the
reasoning lives here and the file stays readable.

### Forwarded headers

Both hosts run behind a Cloudflare tunnel: Cloudflare terminates TLS at the edge
and `cloudflared` speaks plain HTTP to nginx, so `$scheme` inside the container is
always `http`. The public scheme and host have to arrive as headers instead.

Cloudflare's edge sets `X-Forwarded-Proto` and `X-Forwarded-For` on the way in,
but **not** `X-Forwarded-Host` — so an `X-Forwarded-Host` was set by a Cloudflare
Worker (`test.unseenservant.se`) or by a client. Both headers are therefore mapped
with a fallback to what nginx can observe itself:

```nginx
map $http_x_forwarded_host $proxy_x_forwarded_host {
    default $http_x_forwarded_host;
    ""      $host;
}

map $http_x_forwarded_proto $proxy_x_forwarded_proto {
    default $http_x_forwarded_proto;
    ""      $scheme;
}
```

`$host` is the value the tunnel route pins to the public hostname, so a direct
LAN hit still resolves sensibly. Those two variables, plus `Host`, `X-Real-IP` and
`X-Forwarded-For`, are set **once at server level**: `proxy_set_header` is
all-or-nothing per level, so a location that overrides one header has to restate
the whole set — which is how the host copies drifted apart in the first place.

Spring reads all of it (`SERVER_FORWARD_HEADERS_STRATEGY=framework`) and derives
the OAuth `redirect_uri` from `X-Forwarded-Proto` (scheme) and `X-Forwarded-Host`
(host). That is why the two OAuth locations must not report `$scheme`/`http`, and
why a host running a config without these headers **fails every OAuth login with
`redirect_uri_mismatch`** — which is exactly what the stale copies did.

`X-Forwarded-Port` is deliberately **not** set: with `X-Forwarded-Proto https` and
a host without a port, the derived URI is
`https://<public host>/login/oauth2/code/<provider>` with no port, which is what
the providers have registered. The probe under *Verifying a conf change* is what
confirms it; if it ever comes back with `:8080` or `http`, the forwarding broke.

A client-supplied `X-Forwarded-Host` cannot leak anything:
`CustomOAuth2SuccessHandler` matches the value it builds against `ALLOWED_ORIGINS`
before it redirects the token.

### What each location is for

| Location | Why |
|---|---|
| `/api/` | The REST API, proxied to `backend:8080`. |
| `/oauth2/`, `/login/oauth2/` | The OAuth handshake, where Spring derives `redirect_uri` from the forwarded headers — the scheme and host must be the public ones (*Forwarded headers*). |
| `/images/` | Uploaded campaign, character and ship images, proxied as-is: the backend serves `/images/**` as `permitAll`, `JwtAuthenticationFilter` ignores a token it cannot validate, and a browser sends no `Authorization` header for an `<img>`, so nothing has to be stripped or hidden. |
| `/` | The SPA, with `try_files … /index.html` for Vue Router's history mode. `/logout` must **not** be proxied: it is a client-side route (`LogoutView` only clears `localStorage`) while the backend has no logout endpoint at all (Spring's logout is disabled), so the old `location /logout` answered 401 instead of rendering the app. |

`client_max_body_size 10M` covers the backend's 5 MB per-file limit
(`app.upload.max-file-size`) and its 8 MB multipart limit, with room for the
multipart envelope.

### Verifying a conf change

Read back the URI Spring derives, before and after, on each host:

```sh
curl -s -D - https://staging.unseenservant.se/oauth2/authorization/google |
  grep -i location    # redirect_uri=https://staging.unseenservant.se/login/oauth2/code/google
curl -sI https://staging.unseenservant.se/api/auth/me | head -1   # 401, from the backend
curl -sI https://staging.unseenservant.se/logout | head -1        # 200 + text/html, the SPA route
curl -sI https://staging.unseenservant.se/campaigns | head -1     # 200 + text/html, an SPA route
curl -sI https://staging.unseenservant.se/images/<a real file> | head -1  # 200, and no Set-Cookie
```

The `redirect_uri` must be `https`, must carry the host's own public name, and
must have **no port**. Then log in for real (Google and GitHub): the browser ends
at `<host>/oauth-redirect?token=...` and `/api/auth/me` answers 200 afterwards.

Applying it: on the Pi, `docker exec my-nginx nginx -t` first and then
`docker compose up -d nginx` (or `nginx -s reload` inside the container) is
enough; production follows the release.

## Known gap: a recreated backend needs an nginx restart

nginx resolves a `proxy_pass` hostname once, at startup, and keeps that address for
the worker's lifetime. When watchtower recreates the backend container (new IP)
without recreating nginx, the site answers 502 until nginx is restarted. Neither
host has a `resolver` directive, so the workaround is `docker restart my-nginx`
after a release on production, and the same restart after a manual `:main` pull on
the Pi.

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
URI registered at Google **and** GitHub, and manual handling of the 3xx responses
in the Worker instead of letting `fetch` follow them. (A third obstacle used to be
staging's nginx overwriting `X-Forwarded-Host` with `$http_host` on those two
locations; the reconciled config passes a Worker's value through, so only the
registration and the 3xx handling remain.) `/logout` is a client-side route (the
store only clears `localStorage`), so serving `index.html` for it is correct — and
the nginx hosts now behave the same way, because their `/logout` location was
removed.

### Configuration is build-time here too

`.env.test` holds this origin's values and `npm run build:test` bakes them in:
`VITE_OAUTH_BASE_URL` points at staging, `VITE_API_BASE_URL` stays empty
(same-origin through the Worker), and `VITE_USER_NODE_ENV=staging` renders the
"Staging environment" banner so this origin can never be mistaken for
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

### Why the test build deletes `_redirects`

`public/_redirects` belongs to the Cloudflare **Pages** deployment on
`dev.unseenservant.se`. Pages accepts absolute 200-proxy rules, which is exactly
what Workers Assets rejects.

Workers Assets rejects exactly that. Deploying with the file in `dist/` fails with

```
Invalid _redirects configuration:
Line 2: Proxy (200) redirects can only point to relative paths. Got https://unseenservant.se/api/:splat
```

so `npm run build:test` ends with `rm -f dist/_redirects`. The Worker needs no
redirect rules at all: `run_worker_first` handles `/api/*` and `/images/*`, and
`not_found_handling: single-page-application` covers the SPA routes.

The Pages deployment does **not** use this file either. Measured on 2026-10-16,
the bundle `dev.unseenservant.se` serves has absolute production URLs baked in
(`https://unseenservant.se` as both the axios base and the OAuth base) plus the
`dev` banner, so that build was configured by variables on the Cloudflare project
— not by this repository's `npm run build`, which would have left both values
empty — and `/api/*`, `/images/*` and `/oauth2/*` on that origin answer
`index.html`, i.e. the rules are not in effect there. So dev's configuration lives
outside the repository (the hazard the Worker's *Variables and secrets* paragraph
warns about), and no `/api/*` or `/images/*` rule is doing anything for anyone.

Consolidating that origin onto the `test` shape (a Worker, a committed `.env.dev`,
an empty API base) would retire `public/_redirects` and that `rm -f` together.
Until then both stay: a Pages deployment that *did* apply the file needs the
`/api/*` rule for the SPA's own calls and the `/oauth2/*` and `/login/oauth2/*`
rules for the handshake, which an empty `VITE_OAUTH_BASE_URL` sends to its own
origin.

### Deploy

```sh
npm ci
npm run build:test
npx wrangler deploy
```

The same two commands work as a Cloudflare Workers Build (build command
`npm run build:test`, deploy command `npx wrangler deploy`). Either way the values
come from `.env.test` in the repository.

Both of Cloudflare's defaults need no extra configuration: `wrangler deploy`
publishes the version so the custom domain serves it, while
`wrangler versions upload` only uploads a version and prints a preview URL.

Do **not** reach for `npx wrangler preview` to get a preview. It is an open beta
command from the newer Previews feature, it fails with "Your Wrangler
configuration is missing a `previews` block" unless `wrangler.jsonc` carries one,
and a Preview is a separate environment — so it does not update what
`test.unseenservant.se` serves. Pick deliberately:

| Goal | Setting |
|---|---|
| `test.unseenservant.se` always serves the latest build of this branch | Deploy command `npx wrangler deploy` |
| Branch builds only produce a throwaway preview URL | Preview command `npx wrangler versions upload` |
| Per-build Previews with their own configuration (beta) | add `"previews": {}` to `wrangler.jsonc`, use `npx wrangler preview`, and route `test.unseenservant.se` at whatever should track it |

This project deliberately uses **no** Previews: the preview command stays at its
default and `wrangler.jsonc` carries no `previews` block, so nothing in the build
depends on a beta feature. `test.unseenservant.se` is served by whatever the
deploy command publishes.

The Cloudflare project's **production branch is `main`**, so only merges there run
`npx wrangler deploy` and publish `test.unseenservant.se`. Every other branch runs
the *preview* command instead — which is why a feature-branch push can show a
successful build and a failed deploy: that command has to stay at its GA default
(`npx wrangler versions upload`), not `npx wrangler preview`.

`wrangler` is deliberately **not** a dependency: `npx` fetches it at deploy time.
Pinning it is a change of its own, and the cheaper form is to pin it in the deploy
command (`npx wrangler@4.151.0 deploy`). Adding it to `devDependencies` makes
`npm install` re-resolve and rewrite the entire lockfile — 4100 insertions and
2600 deletions when that was tried — which silently moves transitive versions
under CI and the Docker build. Either way it never reaches the published image:
the Dockerfile is a multi-stage build whose final stage is `nginx:alpine` plus
the built `dist/`.

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
