# Deployment - unseenservant-frontend

Two environments run this image (production on the OptiPlex, staging on the
Raspberry Pi 5), two origins are served from Cloudflare's edge by a Worker
(`test.unseenservant.se` in front of staging, `dev.unseenservant.se` in front of
production), and a third mode runs with no backend at all. The host-side runbook
lives in the infrastructure repository (`Mattan41/projects-notes`:
`unseen-servant/README.md` for the runbook and `unseen-servant/infra/` for the
compose files and the host-side nginx copies).

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

Each location also carries the rate or concurrency limit described in
*Rate limiting*; that section explains why the login endpoint has one of its own.

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

## Rate limiting

Three layers, each where it is for a reason.

| Layer | What it can see | What it does |
|---|---|---|
| Cloudflare, one rule on the `unseenservant.se` zone | the address, before the tunnel | blocks a coarse login flood before it costs the tunnel or the JVM anything. The free plan has **one** rule and a 10s counting period, so this is a throttle and not a strategy. |
| nginx `limit_req` in `nginx/default.conf` | the address, before the JVM | the per-address brake: rejects before a request thread or a database connection exists. |
| Backend `LoginAttemptLimiter` | the address **and the username** | the per-account brake, and the only layer that can see an account at all. |

### Why the limiter is not keyed on `$remote_addr`

Both hosts sit behind the tunnel: Cloudflare terminates TLS at the edge and
`cloudflared` speaks plain HTTP to nginx from inside the compose network. So
`$remote_addr` is the *tunnel*, identical for every visitor — a limiter keyed on
it would read as one client and let a single abuser spend everyone's budget.

The key is `CF-Connecting-IP`, which Cloudflare sets on the traffic it forwards
to the origin. For the backend the equivalent is the **last** entry of
`X-Forwarded-For`: nginx appends the address it saw with
`$proxy_add_x_forwarded_for`, so everything before that comma is whatever the
client sent.

One path needs care: `test.unseenservant.se` and `dev.unseenservant.se` reach
their backend through a Worker's same-zone subrequest, and Cloudflare documents
that branch as "the value of `CF-Connecting-IP` reflects the value of
`x-real-ip`". `worker/index.ts` forwards headers unchanged and never sets
`x-real-ip`, so the visitor should survive it — verify per origin rather than
assume (*Verifying the rate limits* below).

### Keeping the key trustworthy

`CF-Connecting-IP` only means something while the origin cannot be reached
directly. Two things keep it that way:

* the backend's published port stays bound to loopback (`"8090:8080"` →
  `"127.0.0.1:8090:8080"`, or dropped — nginx reaches it over the compose
  network). A direct hit on that port bypasses nginx *and* Cloudflare, which is
  what would make every limit in this document optional for an attacker;
* if the host's port 80 must stay reachable on the LAN, uncomment the two lines
  in `nginx/default.conf`, with the subnet from
  `docker network inspect <compose network>`:

```nginx
set_real_ip_from <cloudflared subnet>;
real_ip_header CF-Connecting-IP;
```

That makes nginx ignore the header from any peer outside the tunnel's network, so
a direct LAN client is counted by its own address instead of the one it claims.
An unmatched subnet is not unsafe, just wrong in a specific way: real-IP
resolution never fires, every visitor is counted as the tunnel, and the site is
capped as a whole instead of per client.

### The budgets

| Location | Rule | Why |
|---|---|---|
| `= /api/auth/login` | `auth_zone`, 10r/m, burst 5 | the one endpoint where a request costs a BCrypt comparison. Sized off real use: a login, sometimes a typo or two. |
| `/api/auth/`, `/api/` | `api_zone`, 30r/s, burst 60 | a flood ceiling, deliberately far above normal. The SPA fires several requests on boot and any of them may be a 5MB upload. |
| `/oauth2/`, `/login/oauth2/` | `api_zone`, burst 20 | each handshake start mints an authorization request. |
| `/images/` | `img_zone`, 50r/s, burst 100 | unauthenticated and read from disk, and a gallery is legitimately many requests at once. A rate rather than a `limit_conn`: connection limits count the *tunnel's* connections, and cloudflared carries every visitor over a few of them, so a per-visitor concurrency cap would measure nothing. |

`limit_req_status 429` is not cosmetic: nginx answers 503 by default, and the SPA
renders `>= 500` as "Something went wrong on the server", which would be untrue.
`src/api/lib/axios.js` has a 429 branch with its own message and deliberately does
not read the body, because nginx's 429 body is an HTML error page.

The zones are active as committed. To observe before enforcing, add
`limit_req_dry_run on;` beside `limit_req_status`, log `$limit_req_status` for a
day, then remove it. Each layer is independent — disabling one leaves the others
in place.

### Verifying the rate limits

```sh
# The address each layer would key on. Log $http_cf_connecting_ip, $remote_addr
# and $http_x_forwarded_for temporarily, hit each of the four origins from a
# phone on mobile data, and read the origin's log. The Worker-fronted origins
# must show the visitor, not cloudflared and not a Worker address.
docker logs my-nginx --tail 20

# The login budget from one address: answers, then 429 with Retry-After.
for i in $(seq 1 12); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST https://unseenservant.se/api/auth/login \
    -H 'Content-Type: application/json' -d '{"username":"nobody","password":"password123"}'
done

# Then confirm normal use is untouched: a page load on each origin, an image in
# a campaign, and one image upload. If any of those is refused, raise api_zone
# rather than removing it.
```

A conf change lands in this repository first and the host copies are then set to
the same bytes, exactly as everywhere else in this document.

## Upstream re-resolution

nginx resolves a literal `proxy_pass` hostname once, at startup, and keeps that
address for the worker's lifetime. So when watchtower (production) or a manual
pull on the Pi recreates the backend container on a new IP, the site answers 502
until nginx is restarted — and if the backend does not exist yet when nginx
starts, nginx refuses to start at all:

```
[emerg] host not found in upstream "backend" in /etc/nginx/conf.d/default.conf:31
```

`nginx/default.conf` therefore uses the variable form, which asks Docker's
embedded DNS for the address again every `valid` window:

```nginx
resolver 127.0.0.11 valid=5s ipv6=off;
set $upstream backend:8080;

location /api/ {
    proxy_pass http://$upstream;
}
```

* `resolver 127.0.0.11` is Docker's embedded DNS: correct inside these compose
  networks, meaningless outside them.
* The variable is what makes re-resolution happen — a literal hostname is cached
  regardless of any `resolver` directive.
* **No URI may sit next to the variable.** With `proxy_pass http://$upstream/api/`
  nginx would send that URI verbatim for *every* request, collapsing every path to
  `/api/`. `proxy_pass http://$upstream;` (no URI part) passes the original request
  URI through unchanged, which is what these four locations want, since their
  prefixes are identical on both sides.
* A request can still fail for one `valid` window right after the upstream moves.

Measured locally against this exact file — two nginx containers on one network,
the upstream recreated on a different IP:

| | path and query | upstream recreated on a new IP | started while the backend was missing |
|---|---|---|---|
| literal `proxy_pass` | passed through | stopped answering and never recovered | `[emerg]`, container exited |
| `resolver` + variable | identical | recovered, no nginx restart | started, answered 502, served once the backend appeared |

The `Host` and `X-Forwarded-*` headers are unaffected: they are still set
explicitly at server level, and the upstream sees the same URI it saw before.

What this does not fix: the upstream being down (that is a 502 by definition) and
Docker's DNS being unavailable. On a host, verify after recreating the backend —
`curl -sI https://<host>/api/auth/me` must answer 401 within a few seconds, with
no `docker restart my-nginx`.

`depends_on: backend` in both compose files is still worth keeping: it orders
startup, it is not what makes re-resolution work.

## The Cloudflare Workers: test and dev

Two origins, deliberately light: Workers Assets serves the SPA from the edge, and
one shared Worker script relays only the paths that need a backend to that
environment's nginx.

| | Served by | Backend |
|---|---|---|
| `unseenservant.se` | nginx in this image (OptiPlex) | `backend:8080` in the same compose |
| `staging.unseenservant.se` | the same image (Pi), host-mounted `nginx.conf` | `backend:8080` in the same compose |
| `test.unseenservant.se` | `wrangler` + Workers Assets, `unseenservant-frontend-staging` | proxied to `https://staging.unseenservant.se` |
| `dev.unseenservant.se` | `wrangler` + Workers Assets, `unseenservant-frontend-dev` | proxied to `https://unseenservant.se` |

One script, two Workers: `worker/index.ts` is shared, and `wrangler.jsonc` /
`wrangler.dev.jsonc` differ only in `name`, `vars` (`UPSTREAM_HOST`,
`PUBLIC_HOST`) and which build mode produced `./dist`. Each origin has its own
`localStorage` and can carry its own Cloudflare Access policy, so no two origins
share a session.

### Routing

`assets.run_worker_first` in each wrangler config hands the Worker the two prefixes
that must reach a backend (`/api/*`, `/images/*`); every other request is
asset-first, and a path matching no asset returns `index.html`
(`not_found_handling: "single-page-application"`), which is what Vue Router's
history mode needs.

`/oauth2/*`, `/login/oauth2/*` and `/logout` are **not** on that list, and that is
deliberate. Each Worker leaves the handshake to the environment it fronts: the SPA
sends `oauth-init` to `VITE_OAUTH_BASE_URL` (staging for test, production for dev),
that backend sets its redirect-origin cookie there and sends the browser back to
this origin, which it permits because the origin is in its `ALLOWED_ORIGINS`.
Relaying the handshake through the Worker instead would need this origin's
redirect URI registered at Google **and** GitHub, and manual handling of the 3xx
responses in the Worker instead of letting `fetch` follow them. (A third obstacle
used to be nginx overwriting `X-Forwarded-Host` with `$http_host` on those two
locations; the reconciled config passes a Worker's value through, so only the
registration and the 3xx handling remain.) `/logout` is a client-side route (the
store only clears `localStorage`), so serving `index.html` for it is correct — and
the nginx hosts now behave the same way, because their `/logout` location was
removed.

### Configuration is build-time here too

One committed env file per origin, and one build mode per file:

| Origin | Env file | Build | `VITE_API_BASE_URL` | `VITE_OAUTH_BASE_URL` | `VITE_USER_NODE_ENV` |
|---|---|---|---|---|---|
| `test.unseenservant.se` | `.env.test` | `npm run build:test` | empty — same-origin through the Worker | `https://staging.unseenservant.se` | `test` |
| `dev.unseenservant.se` | `.env.dev` | `npm run build:dev` | empty — same-origin through the Worker | `https://unseenservant.se` | `dev` |

The empty API base is what keeps the SPA's requests relative, so the Worker decides
where the backend lives; the OAuth base is where the handshake starts, because the
Worker does not proxy it. `npm run dev` keeps reading `.env.development`: `--mode
dev` loads `.env.dev`, which is a different file.

`VITE_USER_NODE_ENV` names **where the bundle is served**, and it is what selects
the environment banner's text (App.vue) and tone (main.css): `local` blue, `dev`
green, `test` yellow, `staging` orange, `demo` violet, and `prod`, which draws no
banner. No two origins may share a value — that is why the Pi is `staging` while
the Worker in front of it is `test`, and why `.env.dev` is `dev` while
`.env.development` is `local`.

The origins' **Variables and secrets in Cloudflare are deliberately empty**,
including in a Git-connected build. Cloudflare injects those into the build
environment as well, and a variable that already exists when Vite runs beats every
`.env` file — so a leftover there is an invisible override rather than a visible
error. A `VITE_USER_NODE_ENV=env` silently drops the banner, and a stale
`VITE_API_BASE_URL` quietly bypasses the Worker's proxy. The committed env file is
the single source; to see which one won, read the attribute the app sets on the
document in the browser console:

```js
// the env file's value: local | dev | test | staging | demo | prod
document.documentElement.dataset.env
```

Each Worker's own runtime values are a different thing and *do* live in the
repository: `UPSTREAM_HOST` and `PUBLIC_HOST` are `vars` in `wrangler.jsonc` /
`wrangler.dev.jsonc`. They are deployment settings of the Worker, not build
inputs, and they deliberately avoid the `VITE_` prefix so they cannot be mistaken
for one.

Runtime *build* variables are worse than useless here: an already-built bundle
cannot be reconfigured, which is why the deploy is always
`npm run build:<mode> && npx wrangler deploy …` and never `wrangler deploy` on its
own.

### `public/_redirects` is gone

The file belonged to the Cloudflare **Pages** deployment on
`dev.unseenservant.se`, which this repository no longer uses — that origin is now
the `unseenservant-frontend-dev` Worker, configured by `.env.dev` instead of
variables in the Cloudflare project. Two reasons it had to go:

* Workers Assets rejects absolute 200-proxy rules, which is what the file was for:
  deploying with it in `dist/` fails with `Proxy (200) redirects can only point to
  relative paths`;
* the Worker needs no redirect rules at all — `run_worker_first` covers `/api/*`
  and `/images/*`, and `not_found_handling: single-page-application` covers the SPA
  routes.

So `build:test` and `build:dev` are plain `vite build --mode …`, with no
`rm -f dist/_redirects` afterwards.

The measured history is worth keeping in mind before adding such a file back: the
Pages deployment never applied those rules, and its bundle carried absolute
production URLs taken from the Cloudflare project — the configuration lived
outside the repository, which is exactly what a committed env file prevents.

The Pages project itself (`unseenservant-frontend`) was detached from this hostname
on 2026-10-16, when `unseenservant-frontend-dev` took it over, leaving a Pages
project with no domain and a long list of deployments — retired once that list is
cleared. A Pages project with that many deployments cannot be deleted from the
dashboard; its deployments have to go first with `wrangler pages deployment
delete`, then the project itself (dashboard → Settings → Delete project). Three
details that cost time when the loop was written:

* `wrangler pages deployment list` pages at 25, so clearing a project takes
  several passes — delete what the list returns, then list again;
* its `--json` output keys the id as **`Id`**, not `id`;
* use `--force` (a preview deployment can still carry an active branch alias) and
  keep the active production deployment, which the project delete consumes.

Cloudflare documents the same remedy under Pages → *Known issues* → "Delete a
project with a high number of deployments".

### Deploy

```sh
# test.unseenservant.se -> staging
npm ci
npm run build:test
npx wrangler deploy

# dev.unseenservant.se -> production
npm ci
npm run build:dev
npx wrangler deploy --config wrangler.dev.jsonc
```

Both work as Cloudflare Workers Builds, one Cloudflare project per Worker:

| Cloudflare project | Build command | Deploy command | Preview command |
|---|---|---|---|
| `unseenservant-frontend-staging` | `npm run build:test` | `npx wrangler deploy` | default (`npx wrangler versions upload`) |
| `unseenservant-frontend-dev` | `npm run build:dev` | `npx wrangler deploy --config wrangler.dev.jsonc` | `npx wrangler versions upload --config wrangler.dev.jsonc` |

The dev project's preview command has to name its config: the default would read
`wrangler.jsonc` and upload a *staging* version.

`wrangler deploy` publishes the version so the custom domain serves it. A preview
command only *uploads* a version and prints a separate URL, so it never changes
what the origin serves — and Cloudflare's default for it has moved: when these
projects were set up the default was `npx wrangler versions upload`, while the
current Builds documentation names **`npx wrangler preview`** (which expects a
`previews` block in the config and creates a Preview, a separate environment with
its own URL). Check **Settings → Build** in each project rather than trusting
either value.

One rule survives whichever default a project has: **the dev project's preview
command must name its config** — `--config wrangler.dev.jsonc` — because the
default reads `wrangler.jsonc` and would upload a *staging* version. Pick
deliberately:

| Goal | Setting |
|---|---|
| the origin always serves the latest build of `main` | Deploy command `npx wrangler deploy` (`--config wrangler.dev.jsonc` for dev) |
| branch builds only produce a throwaway URL | Preview command `npx wrangler versions upload` (same `--config` rule) |
| Previews with their own configuration | add `"previews": {}` to the config and set the preview command to `npx wrangler preview`; the origin keeps serving whatever the deploy command publishes |

Neither config declares `previews`, so no build depends on that feature. Each
origin is served by whatever its deploy command publishes.

Both Cloudflare projects' **production branch is `main`**, so only merges there run
their deploy command and publish the origin. Every other branch runs the *preview*
command instead — which is why a feature-branch push can show a successful build
and a failed deploy: the configured preview command has to be one this repository
can run (`npx wrangler versions upload`, or `npx wrangler preview` only when the
config declares `previews`), and for dev both commands have to name
`--config wrangler.dev.jsonc`.

`wrangler` is deliberately **not** a dependency: `npx` fetches it at deploy time.
Pinning it is a change of its own, and the cheaper form is to pin it in the deploy
command (`npx wrangler@4.151.0 deploy`). Adding it to `devDependencies` makes
`npm install` re-resolve and rewrite the entire lockfile — 4100 insertions and
2600 deletions when that was tried — which silently moves transitive versions
under CI and the Docker build. Either way it never reaches the published image:
the Dockerfile is a multi-stage build whose final stage is `nginx:alpine` plus
the built `dist/`.

Each Worker's hostname is declared in its own config as a custom domain —
`test.unseenservant.se` in `wrangler.jsonc`, `dev.unseenservant.se` in
`wrangler.dev.jsonc` — so `npx wrangler deploy` reconciles it, and a re-created
Worker re-attaches it without a dashboard visit. Both were first attached in the
dashboard, which remains the source of the live attachment; a deploy against an
already-attached hostname is a no-op. Two things to remember: each `name` in the
wrangler config has to match its Cloudflare project, or a deploy lands on a second
Worker and leaves the configured one empty; and a hostname can belong to only one
service, so `dev.unseenservant.se` had to be detached from the old Pages project
before the Worker could claim it. Give each origin an Access policy if it should
not be open.

### Verifying it

The same three probes per origin — here for test, with the upstream each one
should reach:

```sh
curl -sI https://test.unseenservant.se/ | head -1              # 200, from the assets
curl -sI https://test.unseenservant.se/api/auth/me | head -1   # 401, from staging's backend
curl -sI https://test.unseenservant.se/campaigns | head -1     # 200, index.html for an SPA route

curl -sI https://dev.unseenservant.se/ | head -1               # 200, from the assets
curl -sI https://dev.unseenservant.se/api/auth/me | head -1    # 401, from production's backend
curl -sI https://dev.unseenservant.se/campaigns | head -1      # 200, index.html for an SPA route
```

The 401 is the interesting one: it is the backend answering, through the Worker.
A 502 means the upstream is unreachable; a 200 with HTML means the Worker did not
match the path and the SPA answered instead. To see *which* backend answered, ask
for a campaign id that exists in only one of the two environments.

Measured on `dev.unseenservant.se` on 2026-10-16, the day it moved from Pages to
its Worker — the full shape of a correctly attached Worker, including the paths it
must *not* proxy:

```sh
curl -sI https://dev.unseenservant.se/ | head -1                              # 200 text/html, from the assets
curl -sI https://dev.unseenservant.se/api/auth/me | head -1                   # 401, production's backend through the Worker
curl -sI https://dev.unseenservant.se/campaigns | head -1                     # 200 text/html, SPA route
curl -sI https://dev.unseenservant.se/logout | head -1                        # 200 text/html, SPA route
curl -sI https://dev.unseenservant.se/oauth2/authorization/google | head -1   # 200 text/html, NOT proxied: the handshake runs on production
curl -sI https://dev.unseenservant.se/images/does-not-exist.png | head -1     # 401, proxied to the backend
```

Before the move every one of those API, image and `/oauth2/` requests answered
`200 text/html` — the SPA — because the Pages deployment had no working proxy.
That contrast is the fastest way to tell which product is serving a hostname.

Then log in with Google and GitHub on each origin: the browser must leave for that
origin's `VITE_OAUTH_BASE_URL` (visible in the address bar — staging for test,
production for dev), come back to `<origin>/oauth-redirect?token=...`, and
`/api/auth/me` must answer 200 afterwards. A login that ends on the other origin
means this origin is missing from that backend's `ALLOWED_ORIGINS`.

## Keeping this file honest

Changing the workflow, the tag contract, the nginx ownership rules, or either
Worker's routing, `vars` and build mode, means updating this document in the same
change.
