# frontend

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Deployment

### Environment Variables

| Variable | Description | Required for |
| `VITE_API_BASE_URL` | Backend API URL (used for images) | Local dev |
| `VITE_OAUTH_BASE_URL` | OAuth redirect base URL | Cloudflare Pages |

### Cloudflare Pages

1. Connect your GitHub repo to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_OAUTH_BASE_URL=https://yourdomain.org`
4. Add environment variable: `VITE_API_BASE_URL=https://yourdomain.org`

The `_redirects` file in `public/` handles API proxying:

**Note:** OAuth redirects (`/oauth2/*`) go directly to backend via `VITE_OAUTH_BASE_URL` because Cloudflare Pages cannot properly proxy OAuth flows that require browser redirects.

### Docker/nginx (RPI)

The nginx configuration in `nginx/default.conf` handles all proxying. No environment variables needed at runtime since the frontend is served alongside the backend.