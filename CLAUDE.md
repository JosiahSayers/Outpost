# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev              # Start Express server + frontend dev server
bun run dev:workers      # Start BullMQ background workers (separate process)

bun run test:unit                           # Unit + component tests, no DB reset (fast)
bun run test:integration                    # Integration tests, with DB reset/seed per test
bun run test:all                            # Both suites, in sequence
bun test tests/unit/transformers/foo.test.ts  # Run a single unit/component test file directly

bun run db:migrate       # Apply pending Prisma migrations
bun run db:seed          # Seed with dev data
bun run db:reset         # Drop, migrate, seed (destructive)

bun run format           # Format with Prettier
bun run format:check     # Check formatting
```

## Import alias

`$/*` resolves to `./app/*`. Use `$/utils/db`, `$/routers/api/gear-inventory`, etc. everywhere. Prisma client is imported from `$/../generated/prisma/client` (outside `app/`).

## Architecture

**Runtime**: Bun. **Backend**: Express. **Frontend**: React 19 + Wouter + Mantine + React Query. **DB**: PostgreSQL via Prisma (with `@prisma/adapter-pg`). **Auth**: Better Auth (email/password).

### Two servers in dev

`app/routers/frontend.ts` spawns a Bun bundler/dev server on `PORT+1` and Express proxies frontend requests to it. In production, Express serves the built bundle directly. Keep this in mind when touching the frontend server setup.

### Request lifecycle

Every request goes through: `stashRequestMetadata` → `attachLogger` → `requestLogger` → `stashSession`. `stashSession` calls Better Auth to resolve the session and attaches it to `req.session`. Protected routes call `requireValidSession` middleware, which returns 401 if the session is missing.

The types for `req.session`, `req.logger`, and `req.id` are declared in `environment.d.ts` via module augmentation on `Express.Request`.

### API route pattern

All API routes follow: Zod validation (`express-zod-safe` `validate()` middleware) → auth check → DB query → transformer → response. Transformers (`app/transformers/`) convert Prisma models to DTOs and are the only place to add/remove fields from API responses. Prisma `P2025` errors (record not found) should be caught and returned as 404.

### Frontend data fetching

API hooks live in `app/frontend/utils/api/`. Each hook uses `useQuery`/`useMutation` from React Query and calls `apiClient` (a thin `fetch` wrapper that throws on non-2xx). Components that use these hooks must be rendered inside a `QueryClientProvider`.

### Auth in tests

`tests/helpers/auth.ts` exposes `getAuthCookies(email)` which returns cookie headers for the given seeded user. Pass these via `.set("Cookie", authCookies)` in integration tests.

## Test setup

`tests/preload.ts` is loaded before every test file (configured in `bunfig.toml`). It registers a DOM environment via `@happy-dom/global-registrator` and calls `cleanup()` from Testing Library after each test. It does **not** touch the database.

`tests/integration-preload.ts` is loaded in addition, only for `bun run test:integration` (via `bun test --preload`). It:

- Runs `prisma migrate reset --force` + `bun db:seed` once before the suite
- Snapshots the seeded tables, then truncates and restores from that snapshot after every test so integration tests don't pollute each other

Unit and component tests (`tests/unit`, `tests/component`) never load this file, so `bun run test:unit` skips the database entirely and runs fast. Integration tests (`tests/integration`) rely on it and must be run via `bun run test:integration` (or `bun run test:all`) — running them with plain `bun test` skips the reset/seed and will fail or corrupt shared state.

### Mocking in component tests

**Do not use `mock.module()`** — Bun has a bug where module mocks persist for the entire test run and `mock.restore()` does not restore them. This causes tests to bleed into each other in unpredictable ways.

Instead, mock at the hook/function level using `mock()` from `bun:test`, or structure components so their dependencies can be controlled via props or context.

## GDAL

`ogr2ogr`/`ogrinfo` are required (dev, CI, and the worker image) for the PAD-US ingest job, which shells out to real GDAL against fixtures in tests. Install locally with `brew install gdal`.
