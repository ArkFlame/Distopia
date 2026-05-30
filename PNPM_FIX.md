# Distopia pnpm runtime fix

Problem observed:

```txt
npm error Exit handler never called!
```

Fix applied:

- Removed `npm install` from Linux scripts.
- Default scripts now use `pnpm`.
- Added Corepack bootstrap for `pnpm@10.12.1`.
- Removed stale `package-lock.json`.
- Added optional Yarn fallback scripts.
- Added explicit notice that the terminal remains open after the server starts.

Main commands:

```bash
./scripts/run-linux.sh
./scripts/prod-linux.sh
```

Fallback:

```bash
./scripts/run-linux-yarn.sh
./scripts/prod-linux-yarn.sh
```
