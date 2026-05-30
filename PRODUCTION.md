# Distopia production launch checklist

1. Set DNS `distopia.arkflame.com` to the server.
2. Install Node 22+ and enable Corepack.
3. Unzip project into `/opt/distopia` or similar.
4. Copy `.env.example` to `.env`.
5. Set `OPENROUTER_API_KEY`.
6. Keep `DISTOPIA_PORT=3928`.
7. Keep `DISTOPIA_APP_URL=https://distopia.arkflame.com`.
8. Use `DISTOPIA_SECURE_COOKIES=auto` by default. It uses non-secure cookies on localhost/private LAN testing and secure cookies on HTTPS/public hosts. You may force `true` after nginx is correctly passing `X-Forwarded-Proto: https`.
9. Configure Nginx with `client_max_body_size 8m`.
10. Run `./scripts/prod-linux.sh`.

No default server or demo users are created. First real user creates the first account and first server manually.


## Register / HMR note

For public launch, run `./scripts/prod-linux.sh` or `./scripts/run-linux.sh`. Both use `next build` + `next start` and do not create the development-only `/_next/webpack-hmr` WebSocket.

The dev-only HMR WebSocket is allowed for configured LAN hosts through `DISTOPIA_DEV_ORIGINS` and `next.config.ts`, but production hosting at `https://distopia.arkflame.com` should use production mode behind Nginx.


## HMR/Register fix 2026-05-30

`./scripts/run-linux.sh` and `./scripts/run-linux-yarn.sh` now run production mode by default. They build and start with `next start`, so the browser never requests `/_next/webpack-hmr`. For explicit dev mode, use `./scripts/dev-linux.sh` or set `DISTOPIA_MODE=dev`.

`next.config.ts` uses `allowedDevOrigins` from `DISTOPIA_DEV_ORIGINS` for LAN dev testing.
