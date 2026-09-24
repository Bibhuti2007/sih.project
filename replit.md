# Jansetu

Jansetu helps citizens report civic issues, connects them with student teams and public-service partners, and keeps progress visible from first report to outcome.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required auth env: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
- Required AI env: `OPENAI_API_KEY` (used only by the API server for issue categorization and routing)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/jansetu/src/App.tsx` — public landing, Clerk auth pages, protected app shell, dashboards, issue reporting, tracking, teams, and impact views
- `artifacts/jansetu/src/index.css` — Jansetu visual tokens and responsive styling
- `artifacts/api-server/src/routes/jansetu.ts` — authenticated dashboard, issue, team, activity, and AI routing endpoints
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/db/src/schema/index.ts` — source-of-truth Drizzle schema for Jansetu data

## Architecture decisions

- Authentication is Replit-managed Clerk; protected API routes require Clerk session authentication.
- Issue categorization and team routing run server-side through the user's `OPENAI_API_KEY`; failed analysis returns an explicit error.
- Seeded civic data is created on first API access so a newly signed-in workspace has useful examples.
- Generated API hooks from the OpenAPI contract are the frontend's API boundary.

## Product

- Public civic-service landing page with four participant roles: citizens, student teams, government agencies, and companies/MNCs.
- Clerk sign-in/sign-up with role selection, protected workspace navigation, and sign-out.
- Authenticated issue submission, AI category/priority/routing results, searchable issue list, issue detail timeline, and solved status updates.
- Team capacity view, activity feed, impact summary, loading states, empty states, and API error states.

## User preferences

- Keep AI integration server-side and never expose API keys in the browser or chat.
- Preserve the warm paper, deep teal, saffron, and editorial civic visual system when extending the product.

## Gotchas

- Restart `artifacts/api-server: API Server` after backend or dependency changes and `artifacts/jansetu: web` after frontend/toolchain changes.
- Run `pnpm run typecheck` after API contract or generated-client changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
