# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Open Source Guru emails users when issues in GitHub repos they follow get labels like "help wanted",
and tracks their open-source contributions (streaks, goals, public profiles, README badges).
pnpm + Turborepo monorepo, Node 24+. See `AGENTS.md` (Turborepo) and `apps/web/AGENTS.md` (Next.js):
both tools are newer than training data, so read their bundled docs in `node_modules` before
changing their config or using unfamiliar APIs.

## Commands

```bash
pnpm db:up && pnpm db:migrate     # Postgres (port 5433) + Mailpit (SMTP 1025, UI http://localhost:8025)
pnpm dev                          # web :3000, API :4000 (Swagger at /docs), worker — all in watch mode
pnpm lint / pnpm lint:fix         # Biome (CI runs `pnpm biome ci .`)
pnpm typecheck                    # turbo; web runs `next typegen` first
pnpm test                         # Vitest everywhere; Docker must be running (Testcontainers)
pnpm build

pnpm --filter @osg/core test                          # one package
pnpm --filter @osg/api exec vitest run src/goals.integration.test.ts   # one file
pnpm --filter @osg/api exec vitest run -t "name"      # by test name

pnpm db:generate                  # Drizzle migration from schema changes (commit migration + snapshot)
pnpm --filter @osg/api openapi    # regenerate apps/web/openapi.json (a test fails if stale)
pnpm --filter @osg/api auth:schema  # regenerate Better Auth tables in core/src/db/schema/auth.ts
```

All apps read the single root `.env` (see `.env.example`); each app validates it in its `env.ts`.

## Architecture

- **`packages/core`** (`@osg/core`): shared, framework-free logic consumed via subpath exports
  (`@osg/core/db`, `/db/schema`, `/github`, `/mail`, `/notifications/match`, `/contributions/streaks`,
  …; see `package.json` `exports`). Holds the Drizzle schema + migrations (`drizzle/`), GitHub
  App client, issue change detection, subscription matching, email composition/scheduling, signed
  email-link tokens, contribution classification/streaks/goals, and `@osg/core/testing`
  (Testcontainers Postgres). No build step — sources are imported as `.ts`.
- **`packages/emails`** (`@osg/emails`): React Email templates. The **only** package with a build
  step (`dist/`); turbo's `^build` dependency builds it before dev/test/typecheck elsewhere.
- **`apps/api`** (`@osg/api`): Fastify + Zod type provider. `buildApp(deps)` in `app.ts` takes an
  `ApiContext` (db, Better Auth, GitHub, mailer, links, `now`) — real in `server.ts`, fakes in
  tests. Routes in `routes/` are factories `xRoutes(ctx)`; logic lives in `services/`. Throw
  `ApiError` (`errors.ts`) for client errors. Auth: Better Auth sessions (cookie) or personal API
  keys (`Bearer osg_…`); some actions require a session (`request.user.via`).
- **`apps/worker`** (`@osg/worker`): pg-boss jobs wired in `worker.ts` with a `WorkerContext`.
  Pipeline: `schedule-polls` → `poll-repo` (per-repo, detects label events) → `fanout` (matches
  events to subscriptions, creates deliveries) → `send-instant` / `send-digests`. Also
  contribution syncs (per user+year), repo classification, streak/goal reminder emails, cleanup.
- **`apps/web`** (`@osg/web`): Next.js (App Router, Cache Components, standalone output) +
  Fumadocs user docs (`content/docs/*.mdx`, API reference from `openapi.json`). The browser only
  talks to the web app: `next.config.ts` rewrites `/api/*` to the API, so client code uses
  `apiFetch` (`lib/api-client.ts`) and server components use `getCurrentUser` (`lib/session.ts`,
  forwards cookies to `API_INTERNAL_URL`). Session logic lives only in the API.

API and worker run TypeScript directly with Node type stripping: **erasable syntax only** (no
`enum`, `namespace`, parameter properties), `import type` for types, and `.ts` extensions on
relative imports.

## Tests

- Pure logic: `foo.ts` → `foo.test.ts` alongside it.
- Anything touching the DB: `*.integration.test.ts`, using the package's `src/testing/setup.ts`
  (API setup builds the real app with a fake GitHub and in-memory mailer, one throwaway Postgres
  per test file).

## Conventions (docs/coding-standards.md)

- Max **300 lines per file** and PascalCase `.tsx` component filenames (in `apps/web/components/`,
  `_components/` folders, `packages/emails/src/`) are Biome-enforced; other modules kebab-case.
- 100-char lines, double quotes, semicolons; strict TS with `noUncheckedIndexedAccess`.
- Web: never hardcode paths — use `ROUTES` from `@/lib/constants` (add new pages there first).
- Check `@osg/core` before adding a helper or type.
- Related changes in the same PR: schema → `pnpm db:generate` (never edit migrations already on
  `main`); API route/schema → regenerate `openapi.json`; new env var → `.env.example`,
  `.env.production.example`, and `env.ts`; user-facing behavior → `apps/web/content/docs/`.
- Conventional Commits via commitlint; allowed scopes: `api worker web docs core emails db deps ci
  config release`. Branches: `<type>/<short-description>`. Lefthook runs Biome on commit and
  typecheck + tests on push.
- Be mindful of GitHub API call volume — the service polls GitHub on a tiny budget.
