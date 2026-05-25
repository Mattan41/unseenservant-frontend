
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

## Getting Started

Requires the [Unseen Servant backend](https://github.com/Mattan41/unseenservant-backend) to be running locally on port 8080 or whatever you have configured in `.env.development`.

```
VITE_API_BASE_URL=http://localhost:8080
```

**2. Install and run**

```sh
npm install
npm run dev
```

App runs at `http://localhost:5173`

## Environment Variables

| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_OAUTH_BASE_URL` | OAuth redirect base URL (production only) |