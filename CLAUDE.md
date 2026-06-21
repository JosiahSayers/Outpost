# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev              # Start Express server + frontend dev server
bun run dev:workers      # Start BullMQ background workers (separate process)

bun test                                    # Run all tests
bun test tests/unit/transformers/foo.test.ts  # Run a single test file
SKIP_DB_SETUP=1 bun test tests/component/dashboard/foo.test.tsx  # Skip DB reset for component/unit tests

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

`tests/preload.ts` is loaded before every test file (configured in `bunfig.toml`). It:

- Registers a DOM environment via `@happy-dom/global-registrator`
- Runs `prisma migrate reset --force` + `bun db:seed` once before the suite (skipped when `SKIP_DB_SETUP=1`)
- Wraps each test in a PostgreSQL `SAVEPOINT` and rolls back after, so tests don't pollute each other
- Calls `cleanup()` from Testing Library after each test

**Use `SKIP_DB_SETUP=1` for component and unit tests** — they don't need the database and the reset adds significant time.

### Mocking modules in component tests

Follow the pattern in `tests/component/utils/guards/authenticated.test.tsx`: call `mock.module("$/path/to/module", ...)` before importing the component under test. This lets you control what hooks return without needing a real backend. Components that use React Query hooks still need a `QueryClientProvider` wrapper in the render.
