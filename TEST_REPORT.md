# Distopia Asset/CDN Upgrade Test Report

Date: 2026-05-29

## Verified

- `npm ci` completed successfully.
- `npm run build` completed successfully on Next.js 16.2.6.
- `npm run db:seed` completed successfully.
- Production server booted with `NODE_OPTIONS=--experimental-sqlite npm start`.
- Login API accepted `owner / owner12345`.
- Bootstrap API returned Distopia Official, channels, messages, and member presence.
- Screenshot capture completed after authenticated login.
- Logo banner processed into transparent WebP/PNG wordmark and icon variants using Python/Pillow.
- Supplied profile pictures converted to optimized 512x512 WebP premade avatars.
- Profile modal premade-avatar selection verified visually.
- Runtime CDN route `/cdn/[kind]/[name]` verified with a message image upload and HTTP 200 image response.
- ArkFlame Studios credit link added below the chat composer.

## UI changes verified visually

- First-run `/app` home screen shows: Invite friends, Create server, Join server.
- User is joined to Distopia Official by default through seed and registration flow.
- Right sidebar shows active and inactive member groups.
- Inactive users are dimmed and show offline status.
- Server actions moved into a three-dot context menu.
- Rate/upload status is no longer always visible; it appears only for errors, selected files, or low remaining rate budget.
- Left channel sidebar and right member sidebar have collapse controls.
- Default profile pictures use deterministic local WebP avatar variants derived from user IDs.
- Local Distopia WebP logo, transparent icon variants, favicon, app icons, and SVG icons load from bundled assets.
- Runtime message/profile uploads are saved under `data/cdn` and served by the app CDN route.

## Notes

- Browser screenshot required temporarily removing the container Chromium URL block policy, then restoring it after capture.
- No runtime CDN dependency remains. Static image/icon assets are bundled locally.
- Chromium/SQLite warnings are environment/API warnings, not build failures.


## 2026-05-30 patch validation

Passed in sandbox:

```bash
node scripts/static-check.mjs
```

Validated statically:

- New server icon upload endpoint exists.
- New channel edit endpoint exists.
- New message attachment delete endpoint exists.
- SQLite schema includes channel descriptions and attachment metadata columns.
- Upload library supports images, ZIP files, server-icons CDN bucket, and 8 MB ZIP/image limits.
- Client includes optimistic message send, attachment chip delete, sent attachment delete, channel/server settings, and compact app icon usage.
- Generated WebP/PNG/ICO app assets exist.

Not executed in sandbox:

```bash
pnpm install
pnpm run build
```

Reason: sandbox DNS resolution to `registry.npmjs.org` failed while Corepack tried to download pnpm. The scripts remain pnpm-first and include Yarn fallback.

## Message ownership, scroll, and font patch

Static validation performed with:

```bash
node scripts/static-check.mjs
```

Covered by static checks and source inspection:

- Message text is now required. Attachment-only sends are rejected client-side and server-side.
- Sent attachment cards no longer expose attachment delete controls. Only the input attachment chip has an X button.
- Server owners can delete messages from the hover action bar.
- Authors can edit their own messages from the hover action bar.
- Edited messages show `(edited)` after the message content.
- Edit history is stored in `message_edits` and exposed through `/api/messages/:messageId/history`.
- Chat layout is fixed to viewport height using `100dvh`, `minmax(0, 1fr)`, and a dedicated `.messages` scroll container.
- Server icons now use `object-fit: contain` inside left rail bubbles to avoid side cropping.
- Profile font dropdown now includes additional stylized options including Neon Pulse, Cyber Grid, Arcade, Terminal, Elegant Serif, Street Bold, and Rounded Soft.

Build not run in this sandbox because package install still requires registry access and the environment cannot resolve `registry.npmjs.org`.
