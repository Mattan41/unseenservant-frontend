
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

| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_OAUTH_BASE_URL` | OAuth redirect base URL (production only) |