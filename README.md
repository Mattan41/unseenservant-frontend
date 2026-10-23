
# Unseen Servant – Frontend

A campaign tracker and character manager for tabletop RPG groups.
Originally built as my thesis project at IT-Högskolan (2025), now maintained as a hobby project.

## Tech Stack

- Vue 3 (Composition API) · Vue Router · Pinia
- Axios · Tailwind CSS · Vite
- OAuth2 login via Google and GitHub

## Features

- Campaign management with participants and roles (GM/Player)
- Character builder and tracker for D&D 5e
- Import characters into campaigns
- Settings for everyone — colour theme and profile — plus an administrator
  surface for accounts and the email whitelist. The theme (Settings → General) is
  reachable without an account, so it can be set before logging in.
- Image uploads (campaign, character and ship) are capped at 5MB per file by the backend (`app.upload.max-file-size`)
- Private journals per campaign participant: a book of numbered markdown pages, one per participant per campaign, readable only by its owner (10,000 characters per page by default, at most 500 pages)

## Campaign roles & permissions

Rights live on two **independent axes** so that owning a campaign and running
the table stay separate:

| Capability | Owner | GM | Player |
|---|---|---|---|
| Transfer ownership / delete campaign | ✅ | — | — |
| Add/remove participants, change roles | ✅ | — | — |
| Edit other participants' nicknames | ✅ | — | — |
| Edit campaign details (name, description, system, image) | — | ✅ | — |
| Edit world lore and GM notes | — | ✅ | — |
| See GM notes / others' private backstories | — | ✅ | — |
| Change your own nickname, import a character | ✅ | ✅ | ✅ |
| View roster/characters/messages, view & edit the ship | ✅ | ✅ | ✅ |

- **Ownership axis** — `isOwner`: administration (transfer, delete, roster, roles, nicknames).
- **Table-role axis** — `isGm`: world-building (details, image, lore, GM notes).
- A campaign owner who is only a *player* has the admin rights but not the
  world-building rights; a non-owner *GM* has world-building but not admin.

The rules are defined once in `src/features/campaign/campaignPermissions.js`
and enforced in the UI and in guest mode (`src/api/lib/guest-axios.js`).

## Accounts & administration

Platform accounts carry one of two roles: **USER** and **ADMIN**. Administrators
additionally see **Settings → Admin**:

- **Users** — every account, with the role control. A role change takes effect
  immediately (authorities are read from the database on every request), and the
  last administrator cannot be demoted.
- **Email whitelist** — which addresses may log in at all. OAuth logins are gated
  by this list, and a row's role decides what a *first* login is granted; an
  account that already exists keeps its own role, which is changed under Users.

Both are enforced by the backend (`/api/admin/**`, ROLE_ADMIN) and gated in the
UI. Guest Demo does not demo them: it serves no `/api/admin/**` route, the
Settings → Admin section is hidden for the whole guest session (see
`docs/ARCHITECTURE.MD` → Guest Mode Limitations), and the demo account is an
ordinary user (`demoData.js`).

## Getting Started

**Full Stack Mode:** Requires the [Unseen Servant backend](https://github.com/Mattan41/unseenservant-backend) to be running locally on port 8080 or whatever you have configured in `.env.development`.

```
VITE_API_BASE_URL=http://localhost:8080
```

* **Demo Mode:** 
1. Run backend with `demo` profile. 
2. Set VITE_USER_NODE_ENV=demo in env.demo 
3. start frontend with `npm run demo`. 
This uses form login with test users (User1-User5, admin — all passwords: `password`). 

* **Guest Demo Mode:** No backend required. You can run the frontend completely decoupled by clicking **"Guest Demo"** on the login screen to run the app using a local `localStorage` adapter seeded with mock data (Note: image uploads are not supported in this mode).

**2. Install and run**

```sh
npm install
npm run dev
```

App runs at `http://localhost:5173`

## Environment Variables

| `VITE_API_BASE_URL` | Backend API base URL. Empty in the Docker builds, so the SPA uses relative URLs and the nginx in front decides where the backend is |
| `VITE_OAUTH_BASE_URL` | Where the OAuth handshake starts. Empty in the Docker builds and for local dev; each Worker points it at the environment it fronts |

`npm run build:test` and `npm run build:dev` build the bundles for
`test.unseenservant.se` (a Cloudflare Worker in front of staging) and
`dev.unseenservant.se` (a Worker in front of production). The tag contract, the
build modes, the Worker config and the DNS side of both are documented in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Docker image

On every release, GitHub Actions publishes `mattan41/unseenservant-frontend` to
Docker Hub tagged `latest` and with the release tag; every merge to `main`
publishes `main` for the staging host. [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
documents the tag contract — production's watchtower follows `latest`, staging's
follows `main`, and a merge must never be able to move `latest` — and which copy
of the nginx config is authoritative where.

The image is built for
`linux/amd64` and `linux/arm64` on native runners (`ubuntu-latest` /
`ubuntu-24.04-arm`) and the two architectures are combined into one multi-arch
manifest with `docker buildx imagetools create`, so `docker pull` selects the
right architecture automatically. The merged index also lists the per-arch
provenance attestation manifests as extra `unknown/unknown` platform entries —
expected, and it does not affect `docker pull` or `docker run`.

Build cache and per-architecture staging images live in the GitHub Container
Registry (`ghcr.io/mattan41/unseenservant-frontend:buildcache-<arch>`), not on
Docker Hub.
