# Distopia


## Linux run scripts

Distopia now uses `pnpm` by default. The previous npm installer path was removed because some npm CLI versions can hang with `Exit handler never called!`.

Development:

```bash
cp .env.example .env
./scripts/run-linux.sh
```

Production:

```bash
cp .env.example .env
./scripts/prod-linux.sh
```

If `pnpm` is not installed, the script activates `pnpm@10.12.1` through Corepack. If Corepack fails, install pnpm once and rerun:

```bash
corepack enable
corepack prepare pnpm@10.12.1 --activate
```

Fallback Yarn scripts are included only as backup:

```bash
./scripts/run-linux-yarn.sh
./scripts/prod-linux-yarn.sh
```

Note: when the server starts successfully, the terminal intentionally stays open. Stop it with `Ctrl+C`.

Distopia is a self-contained Next.js community-chat application with local SQLite storage, account login, servers, channels, messages, image uploads, invites, friend links, webhooks, privacy settings, custom themes, rate limiting, and lightweight moderation.

This project is a distinct chat product. It does not use Discord branding, Discord private APIs, or Discord client internals.

## Run on Linux

```bash
cp .env.example .env
bash scripts/run-linux.sh
```

Open:

```txt
http://localhost:3000
```

Demo users:

```txt
owner / owner12345
nova / nova12345
```

## Production run

```bash
cp .env.example .env
bash scripts/prod-linux.sh
```

## Current features

- Next.js App Router.
- React client shell.
- Local SQLite through `node:sqlite`.
- HTTP-only session cookie.
- Server creation.
- Default Distopia Official server.
- Join server by invite code.
- Text channels.
- Message sending.
- Image uploads with `DISTOPIA_MAX_UPLOAD_BYTES`, default `2097152` bytes.
- Runtime internal CDN route for uploaded message/profile images under `/cdn/...`.
- Upload status shown only when relevant.
- Rate-limit status shown only when low/blocked.
- Friend invites and friend accept flow.
- Server invite links.
- Webhook creation and incoming webhook posts.
- Profile editing.
- Privacy toggles.
- Custom name colors, fonts, and themes.
- Deterministic local WebP default avatars based on user ID.
- Selectable premade Distopia profile avatars converted from supplied images.
- Uploaded custom profile avatar support.
- Transparent Distopia logo, square app icon, white-on-purple icon, and white-on-transparent icon variants.
- Local WebP Distopia logo.
- Local SVG UI icons.
- Collapsible channel and member panels.
- Active/inactive member list with presence dots.
- Three-dot server action menu.
- Responsive compact layout.

## Important limits

This is a publishable MVP, not a Discord-scale production system. It does not include voice, video, WebSocket live transport, push notifications, OAuth, email verification, mobile native clients, full audit logs, distributed rate limits, or infrastructure-level DDoS mitigation.

For public deployment, put the app behind a reverse proxy/WAF, enable HTTPS, configure file size limits at proxy level, rotate `DISTOPIA_COOKIE_NAME`/secrets if expanded, and move rate limits to Redis or another shared store before horizontal scaling.

## Useful paths

```txt
/app                         Authenticated app shell
/join/distopia               Official server invite
/embed/server/:id            Public server embed
/api/webhooks/:token         Incoming webhook endpoint
/api/avatar/:seed            Deterministic avatar redirect
public/assets/               Bundled WebP/SVG assets
data/cdn/                    Runtime uploaded-image store served by /cdn/...
docs/ASSETS.md              Brand/profile asset inventory
```


## 2026-05-30 fixes

- Channel creation confirmed and extended with optional channel description.
- Channel settings modal can edit the top-bar channel description.
- Server settings modal can update server name, description, vanity invite, public joins, and icon.
- Server creation supports custom icon upload.
- Server-side upload validation now supports images and ZIP attachments.
- Message attachments support PNG/JPG/GIF/WEBP and `.zip` up to 8 MB.
- Client-side image uploads are compressed to WebP before upload for avatars, server icons, and message images.
- Composer shows selected attachment only when present, with an `×` remove button.
- Sent message attachments can be removed by the message owner.
- Message send is optimistic: input/attachment clear immediately, pending messages render dimmed, failed messages render red.
- Theme selection is user-wide only in profile settings; per-server theme controls were removed from UI.
- Distopia app icon now uses a compact white-on-dark generated variant for small-size readability.

Upload limits:

```txt
DISTOPIA_MAX_IMAGE_UPLOAD_BYTES=8388608
DISTOPIA_MAX_ZIP_UPLOAD_BYTES=8388608
```
