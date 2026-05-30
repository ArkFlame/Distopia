# Distopia Assets

Generated from the provided Distopia banner and profile images using Python/Pillow only.

## Brand assets

```txt
public/assets/brand/distopia-logo-transparent.webp
public/assets/brand/distopia-logo-transparent.png
public/assets/brand/distopia-icon-transparent.webp
public/assets/brand/distopia-icon-transparent.png
public/assets/brand/distopia-icon-white-purple.webp
public/assets/brand/distopia-icon-white-purple.png
public/assets/brand/distopia-icon-white-transparent.webp
public/assets/brand/distopia-icon-white-transparent.png
public/assets/distopia-wordmark.webp
public/assets/distopia-mark.webp
public/assets/distopia-logo.webp
public/favicon.ico
public/icon.png
app/icon.png
app/apple-icon.png
```

## Premade avatars

```txt
public/assets/premade-avatars/distopia-avatar-1.webp
public/assets/premade-avatars/distopia-avatar-2.webp
public/assets/premade-avatars/distopia-avatar-3.webp
public/assets/premade-avatars/distopia-avatar-4.webp
public/assets/premade-avatars/distopia-avatar-5.webp
public/assets/premade-avatars/distopia-avatar-6.webp
public/assets/premade-avatars/distopia-avatar-7.webp
public/assets/premade-avatars/distopia-avatar-8.webp
```

## Runtime CDN

Runtime uploads are stored outside `public` under `DISTOPIA_UPLOAD_DIR`, default `./data/cdn`, and served through the internal route:

```txt
/cdn/messages/:name
/cdn/user-avatars/:name
/cdn/misc/:name
```

This avoids relying on Next.js static-public runtime file discovery and keeps CDN behavior working after production startup.

## 2026-05-30 compact icon variants

Generated from the supplied Distopia banner with Python/Pillow only:

- `public/assets/brand/distopia-logo-transparent.webp`
- `public/assets/brand/distopia-icon-transparent.webp`
- `public/assets/brand/distopia-icon-white-transparent.webp`
- `public/assets/brand/distopia-icon-white-purple.webp`
- `public/assets/brand/distopia-app-icon.webp`
- `public/assets/brand/distopia-app-icon-256.webp`
- `public/assets/brand/distopia-app-icon-128.webp`
- `public/assets/brand/distopia-app-icon-64.webp`
- `public/favicon.ico`
- `app/icon.png`
- `app/apple-icon.png`

The UI uses `distopia-app-icon.webp` for small app surfaces because transparent detailed marks lose contrast at small sizes.
