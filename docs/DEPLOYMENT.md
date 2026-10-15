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

## Keeping this file honest

Changing the workflow, the tag contract or the nginx ownership rules means
updating this document in the same change.
