# Distopia

Production-oriented Next.js community chat app for `https://distopia.arkflame.com`.

Distopia is a distinct chat product. It does not use Discord branding, Discord private APIs, or Discord client internals.

## Production defaults

```txt
DISTOPIA_APP_URL=https://distopia.arkflame.com
DISTOPIA_PORT=3928
DISTOPIA_AI_MODEL=openrouter/free
```

No demo accounts are created. No default Distopia server is created. New users must create an account, create/join servers, invite friends, or open the built-in Distopia AI direct conversation.

## Deploy on Linux

```bash
unzip distopia-nextjs-production-launch.zip
cd distopia
cp .env.example .env
nano .env
./scripts/prod-linux.sh
```

Required for AI:

```txt
OPENROUTER_API_KEY=your_key_here
```

The production script installs dependencies with pnpm, prepares the SQLite schema, builds Next.js, and starts the app on port `3928`.

## Nginx reverse proxy

Use HTTPS at Nginx and proxy to the local Next.js server:

```nginx
server {
    server_name distopia.arkflame.com;

    client_max_body_size 8m;

    location / {
        proxy_pass http://127.0.0.1:3928;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

If testing directly over `http://localhost:3928`, set this in `.env` first:

```txt
DISTOPIA_SECURE_COOKIES=auto
DISTOPIA_APP_URL=http://localhost:3928
```

## Current features

- Account registration with required email, popular-provider validation, future-ready `emailVerified` field, and login with username/email using HTTP-only cookies.
- No default human accounts.
- No default official server.
- Server creation, server icons, public/private join setting, vanity invite codes.
- Channel creation and channel description under the top bar.
- Fixed-height app shell; messages scroll inside the chat panel.
- Hover message actions on the right side: pen icon for edit, trash icon for delete.
- Server owner can delete server messages.
- Message authors can edit their own server messages.
- Edited messages display `(edited)` and keep edit history.
- Message attachments require text content.
- Image and ZIP attachments up to 8 MB.
- Client-side image compression to WebP before upload.
- Runtime local CDN under `/cdn/messages`, `/cdn/user-avatars`, and `/cdn/server-icons`.
- Friend invites and accepted friend relationships.
- Private direct conversations accessed from Recent Conversations or profile-card context menu.
- Home left sidebar: Recent Conversations.
- Home right sidebar: Online Friends.
- Built-in Distopia AI direct conversation using OpenRouter `openrouter/free` by default.
- User-wide themes only; per-server themes removed from UI.
- Custom name colors and stylized fonts.
- Premade optimized WebP avatars and custom avatar upload.
- Webhooks for server channels.
- Rate-limit UI only when close to limit or blocked.
- Tiny ArkFlame credit under the composer.

## Scripts

```bash
./scripts/run-linux.sh          # dev, port 3928
./scripts/prod-linux.sh         # production, port 3928
./scripts/run-linux-yarn.sh     # fallback dev
./scripts/prod-linux-yarn.sh    # fallback production
node scripts/static-check.mjs   # static production check
```

## Limits before serious scale

SQLite is suitable for one server process and an MVP public launch. Before horizontal scaling, move sessions/rate limits to Redis, move uploads to S3/R2-compatible object storage, add WebSocket/SSE live transport, enable email verification/password reset, add admin moderation tools, and put the app behind a WAF/CDN.


## Registration fix notes

`DISTOPIA_SECURE_COOKIES=auto` prevents the common local-LAN failure where the API creates the account but the browser rejects the secure session cookie over plain HTTP. Local/private hosts use non-secure cookies; HTTPS/public hosts use secure cookies. The register screen now validates fields client-side, shows API/network errors, verifies the session after account creation, and only redirects when the session cookie is actually stored.


## Production start on port 3928

Use this for local LAN or public hosting. It builds and starts Next.js in production mode, so there is no `/_next/webpack-hmr` WebSocket.

```bash
cp .env.example .env
./scripts/run-linux.sh
```

Development mode is optional:

```bash
./scripts/dev-linux.sh
```

If you open development mode from a LAN IP such as `http://192.168.1.2:3928`, `DISTOPIA_DEV_ORIGINS` controls allowed Next.js dev origins. Production mode does not need this.


## HMR/Register fix 2026-05-30

`./scripts/run-linux.sh` and `./scripts/run-linux-yarn.sh` now run production mode by default. They build and start with `next start`, so the browser never requests `/_next/webpack-hmr`. For explicit dev mode, use `./scripts/dev-linux.sh` or set `DISTOPIA_MODE=dev`.

`next.config.ts` uses `allowedDevOrigins` from `DISTOPIA_DEV_ORIGINS` for LAN dev testing.
