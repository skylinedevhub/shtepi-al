---
name: db-migrate
description: Run Drizzle Kit migration workflow — generate, review, and optionally push to Neon
user-invocable: true
disable-model-invocation: true
---

# Database Migration

Streamlines the Drizzle Kit migration workflow for the ShtëpiAL Neon PostgreSQL database.

## Prerequisites

- `DATABASE_URL` must be set (Neon connection string)
- Schema changes should already be made in `web/src/lib/db/schema.ts`

## Step 1: Check for Schema Changes

Read `web/src/lib/db/schema.ts` and compare with the current migration state:

```bash
cd /home/yb97/src/projects/shtepi-al/web && npx drizzle-kit generate 2>&1
```

If no changes detected, inform the user and stop.

## Step 2: Review Generated SQL

List and display the generated migration file(s):

```bash
ls -la /home/yb97/src/projects/shtepi-al/web/drizzle/
```

Read and present the generated SQL migration file to the user. Highlight:
- New tables/columns being created
- Columns being dropped (data loss risk)
- Index changes
- Any ALTER TABLE operations

**Ask the user to confirm** before proceeding to push.

## Step 3: Push Migration

After user confirmation:

```bash
cd /home/yb97/src/projects/shtepi-al/web && npx drizzle-kit push 2>&1
```

## Step 4: Verify

Run a quick verification query to confirm the migration applied:

```bash
cd /home/yb97/src/projects/shtepi-al/web && npx drizzle-kit studio 2>&1 &
```

Or verify with a build:

```bash
cd /home/yb97/src/projects/shtepi-al/web && npx next build 2>&1 | tail -5
```

## Important Notes

- **Always review SQL** before pushing — Drizzle Kit can generate destructive migrations
- **Backup first** for destructive changes (column drops, type changes)
- Schema file: `web/src/lib/db/schema.ts` (Drizzle ORM)
- Config file: `web/drizzle.config.ts` (points to schema + Neon)
- Migrations dir: `web/drizzle/` (generated SQL files)
- The seed fallback (`web/data/seed-listings.json`) is unaffected by DB migrations
