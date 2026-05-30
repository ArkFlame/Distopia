# Distopia registration fix test report

Date: 2026-05-30

## Checks run in sandbox

```bash
node scripts/static-check.mjs
```

Result:

```txt
Static production check passed.
```

```bash
bash -n scripts/run-linux.sh
bash -n scripts/prod-linux.sh
bash -n scripts/run-linux-yarn.sh
bash -n scripts/prod-linux-yarn.sh
```

Result:

```txt
shell-ok
```

TypeScript syntax transpile check was run through the globally installed TypeScript compiler API against all `app`, `components`, `lib`, and `scripts` TypeScript/TSX files.

Result:

```txt
TypeScript transpile syntax check passed.
```

## Not run in sandbox

```bash
pnpm install
pnpm run build
```

Reason: package registry DNS/network access is unavailable in the execution sandbox. The project remains pnpm-first and includes Yarn fallback scripts.

## Production changes verified statically

- No demo `owner` / `nova` users in seed.
- No `Distopia Official` default server in seed.
- Registration no longer auto-joins a default server.
- `DISTOPIA_PORT=3928` present in `.env.example`.
- `DISTOPIA_APP_URL=https://distopia.arkflame.com` present in `.env.example`.
- `OPENROUTER_API_KEY` and `DISTOPIA_AI_MODEL=openrouter/free` present in `.env.example`.
- Direct conversation API routes exist.
- Direct message API route exists.
- Distopia AI system user exists in schema.
- Pen/trash SVG icons exist.
- Home sidebars changed to Recent Conversations and Online Friends.


## Registration fix checks

```bash
tsc lib/email.ts --noEmit --target ES2022 --module ESNext --strict
```

Result:

```txt
passed
```

```bash
tsc lib/email.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --outDir /tmp/distopia-email-test --strict
node email-validation-smoke-test
```

Result:

```txt
Email validation smoke test passed.
```

Verified statically:

- Register form has required email input.
- Register form catches network/non-JSON failures and shows visible errors.
- Successful auth uses `window.location.assign('/app')` to avoid silent router failure.
- Register API validates email with `normalizePopularEmail`.
- Login API accepts username or email.
- User schema has `email`, `emailVerified`, and unique lower-email index.


## Registration/session fix

- Registration form now validates email, username, display name, and password before sending.
- Auth requests use same-origin credentials and no-store cache.
- Successful auth verifies `/api/me` before redirecting.
- Session cookies use automatic secure-cookie detection to avoid LAN/HTTP local testing failures.
- Static check verifies auth page, email helper, and cookie-secure logic tokens.


## HMR/Register fix 2026-05-30

`./scripts/run-linux.sh` and `./scripts/run-linux-yarn.sh` now run production mode by default. They build and start with `next start`, so the browser never requests `/_next/webpack-hmr`. For explicit dev mode, use `./scripts/dev-linux.sh` or set `DISTOPIA_MODE=dev`.

`next.config.ts` uses `allowedDevOrigins` from `DISTOPIA_DEV_ORIGINS` for LAN dev testing.
