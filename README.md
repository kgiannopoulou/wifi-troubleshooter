# WiFi Troubleshooter

A guided WiFi diagnostic tool: pick a router model, describe the symptom,
and answer a short sequence of narrowing questions until you reach the
likely cause and fix steps — the same process an ISP support rep actually
follows, encoded as data instead of hard-coded logic.

Built after real technical support experience troubleshooting WiFi issues
on **Speedport Plus, Speedport Plus 2, ZTE H1600, and RDK Vantiva** routers.
The diagnostic tree itself lives in the database and is fully editable
through an admin panel — this app is a generic diagnostic-tree engine that
happens to ship pre-seeded with WiFi troubleshooting content, not a
one-off script.

## Stack

Single Next.js (App Router, TypeScript) app — the frontend and the backend
API both live in this one app (API routes under `src/app/api`), backed by
PostgreSQL via raw `pg` with hand-written SQL migrations (no ORM).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — runs Postgres locally via `docker-compose.yml`

## First-time setup

```sh
# 1. Start Postgres
docker compose up -d

# 2. Configure environment
cp .env.example .env
# then set JWT_SECRET, and ADMIN_EMAIL / ADMIN_PASSWORD for the seeded admin account

# 3. Install, migrate, seed
npm install
npm run migrate
npm run db:seed

# 4. Run
npm run dev   # http://localhost:3000
```

The seed script creates the 4 router models, a starter set of WiFi symptom
categories, one fully-worked example diagnostic tree (Speedport Plus / "No
WiFi signal") so the app is demoable immediately, and the single admin
account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Using the admin panel

Log in at `/admin/login` with the seeded admin credentials. From there:

- **Router models** / **Symptom categories** — simple name+slug CRUD
- **Resolutions** — reusable fix write-ups (e.g. "Restart the router"),
  written once and referenced by any number of question paths
- **Diagnostic trees** — pick a model + symptom to view its tree as an
  outline, and add/edit/delete questions. Each question's answer options
  link either to another question or straight to a resolution. The very
  first question created for a given model+symptom pair automatically
  becomes that tree's starting question (root); any other question can be
  made the starting question later with "Make starting question".

### Tree integrity rules

Enforced server-side on every write (`src/lib/tree-rules.ts`), not just in
the admin UI:

- **No loops** — an option can't lead back to its own question, directly
  or through other questions (A → B → A). Checked with a recursive query
  inside the same transaction as the edit, which is rolled back on failure.
- **Same tree only** — an option can only link to a question of the same
  router model + symptom, and to a resolution that exists.
- **Always a starting point** — the starting question can't be deleted
  while other questions remain in its tree; pick a new one first. Questions
  that aren't reachable from the starting question are still listed (and
  flagged) in the tree outline instead of disappearing.
- Writes to one tree are serialized with a Postgres advisory lock, so two
  admins editing at once can't each add half of a loop.

In the public wizard, a question that fails to load shows an error with
**Retry** / **Start over** instead of an endless "Loading…".

## Data model

The core design problem: modeling a branching diagnostic tree as *data* so
it's editable without touching code, and so common steps can be reused
instead of duplicated. See `src/db/migrations/0001_init.sql` for the full
schema — in short:

- `nodes` — one question, scoped to a router model + symptom pair
- `node_options` — one answer choice per question, linking to exactly one
  of: another `node`, or a `resolution` (enforced by a `CHECK` constraint)
- `resolutions` — fix write-ups, reusable across many different paths

Walking the tree at runtime is just "fetch a node's options one step at a
time" (`GET /api/nodes/[id]`). The admin panel's tree outline is the one
place a recursive query is worth it — see `GET /api/admin/tree` for a
recursive CTE that walks the tree depth-first from its root, so the
outline reads in the same order a user actually experiences the wizard.

## Project layout

- `src/app/` — pages (public wizard + admin panel) and API route handlers
- `src/lib/` — database pool, auth (JWT in an httpOnly cookie, same
  approach as the [e-commerce project](https://github.com/kgiannopoulou/fullstack-ecommerce)),
  and shared query helpers
- `src/db/` — migration runner and seed script
- `docker-compose.yml` — local Postgres
