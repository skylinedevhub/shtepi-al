# Market Intel Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a separate B2B data-intel product (`data-portal/`) on its own Vercel project + domain, backed by a daily market-snapshot pipeline shared with the public `web/` app via a new `@repo/analytics` workspace package.

**Architecture:** Convert `shtepi-al` into an npm-workspaces monorepo. Add `@repo/analytics` containing pure TS for geocoord→city assignment, snapshot computation, and trend queries. `web/` runs the snapshot cron and a one-shot backfill. `data-portal/` is a new Next.js app with Supabase-auth-gated middleware reading from `market_snapshots`. Remove `/data`, `/data/dashboard`, and `/api/analytics/*` from `web/` once `data-portal/` is live.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM, PostgreSQL (Supabase), Vitest, Vercel Cron, Supabase Auth, Recharts (charts), npm workspaces.

**Spec:** [`docs/superpowers/specs/2026-05-16-market-intel-portal-design.md`](../specs/2026-05-16-market-intel-portal-design.md)

---

## File Structure

### Created

```
package.json                                                   # workspace root
packages/analytics/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts
    geocoords/
      cities.ts                  # 22-city centroid table (imported from web/)
      nearest-city.ts            # getCityFromCoords + haversine
      nearest-city.test.ts
    snapshots/
      types.ts                   # Snapshot, SnapshotInputs types
      compute.ts                 # pure aggregation
      compute.test.ts
      persist.ts                 # Drizzle upsert wrapper
      backfill.ts                # iterate day range
      daily.ts                   # today-only wrapper
    queries/
      trends.ts                  # getPriceTrends
      trends.test.ts
      overview.ts                # getMarketOverview (moved from web/)
data-portal/
  package.json
  tsconfig.json
  next.config.js
  vercel.json
  vitest.config.ts
  postcss.config.mjs
  tailwind.config.ts
  middleware.ts
  middleware.test.ts
  public/robots.txt
  src/
    app/
      layout.tsx
      page.tsx                   # redirect: /login or /dashboard
      login/page.tsx
      dashboard/
        page.tsx                 # server component, reads trends
        PriceChart.tsx           # client component, Recharts
        DashboardControls.tsx    # city dropdown + sale/rent toggle
      api/v1/
        trends/route.ts
        cities/route.ts
    lib/
      supabase/server.ts
      supabase/client.ts
      db.ts                      # Drizzle client init
      api-key-auth.ts
      b2b-user.ts                # getB2bUser helper
web/scripts/backfill-market-snapshots.ts
web/src/app/api/cron/market-snapshot/route.ts
web/src/app/api/cron/market-snapshot/route.test.ts
web/src/lib/db/migrations/0014_market_snapshots.sql
```

### Modified

```
web/package.json                                # name: @shtepial/web, add @repo/analytics dep
web/src/lib/db/schema.ts                        # add marketSnapshots + b2bUsers tables
web/vercel.json                                 # add crons entry
web/src/lib/city-coords.ts                      # re-export from @repo/analytics
```

### Deleted (after data-portal is live)

```
web/src/app/data/                               # public landing + dashboard
web/src/app/api/analytics/                      # public analytics API
web/src/lib/analytics/market.ts                 # moved to @repo/analytics
```

---

## Task 1: Monorepo conversion — root `package.json`

**Files:**
- Create: `package.json` (root)
- Create: `.gitignore` (already exists, leave alone)

- [ ] **Step 1: Create the root `package.json`**

```json
{
  "name": "shtepi-al",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["web", "data-portal", "packages/*"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  }
}
```

- [ ] **Step 2: Move `web/package-lock.json` to root**

```bash
mv web/package-lock.json package-lock.json
```

- [ ] **Step 3: Rename `web` package to `@shtepial/web`**

Open `web/package.json`. Change the `name` field:

```json
"name": "@shtepial/web",
```

- [ ] **Step 4: Reinstall to verify workspace linking**

Run: `npm install`
Expected: completes without error; `node_modules/@shtepial/web` exists as a workspace symlink (or hoisted).

- [ ] **Step 5: Verify the web app still builds and tests pass**

Run from repo root: `npm run -w @shtepial/web build`
Expected: Next.js build completes successfully.

Run: `npm run -w @shtepial/web test -- --run`
Expected: existing test suite passes.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json web/package.json
git commit -m "$(cat <<'EOF'
chore: convert repo to npm workspaces

Adds a root package.json with the npm workspaces field listing web,
data-portal, and packages/*. Existing web/ app renamed to @shtepial/web.
Lockfile hoisted to root.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Scaffold `@repo/analytics` package

**Files:**
- Create: `packages/analytics/package.json`
- Create: `packages/analytics/tsconfig.json`
- Create: `packages/analytics/vitest.config.ts`
- Create: `packages/analytics/src/index.ts`

- [ ] **Step 1: Create `packages/analytics/package.json`**

```json
{
  "name": "@repo/analytics",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8"
  },
  "peerDependencies": {
    "postgres": "^3.4.8"
  }
}
```

- [ ] **Step 2: Create `packages/analytics/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "noEmit": false,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "dist", "node_modules"]
}
```

- [ ] **Step 3: Create `packages/analytics/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create `packages/analytics/src/index.ts`**

```ts
export * from "./geocoords/nearest-city";
export * from "./snapshots/types";
export * from "./snapshots/compute";
export * from "./snapshots/persist";
export * from "./snapshots/backfill";
export * from "./snapshots/daily";
export * from "./queries/trends";
export * from "./queries/overview";
```

- [ ] **Step 5: Install the new workspace**

Run: `npm install`
Expected: `@repo/analytics` linked into workspace.

- [ ] **Step 6: Commit**

```bash
git add packages/analytics package-lock.json
git commit -m "$(cat <<'EOF'
chore(analytics): scaffold @repo/analytics package

Adds an empty TypeScript package shared between web/ and data-portal/.
Vitest configured for node environment, drizzle-orm dependency declared.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: City centroid table moved into `@repo/analytics`

**Files:**
- Create: `packages/analytics/src/geocoords/cities.ts`
- Modify: `web/src/lib/city-coords.ts:1-30` (re-export from package)

- [ ] **Step 1: Create `packages/analytics/src/geocoords/cities.ts`**

```ts
export const ALBANIAN_CITY_COORDS: Record<string, [number, number]> = {
  "Tiranë": [41.3275, 19.8187],
  "Durrës": [41.3246, 19.4565],
  "Vlorë": [40.4660, 19.4913],
  "Sarandë": [39.8661, 20.0050],
  "Shkodër": [42.0693, 19.5126],
  "Korçë": [40.6186, 20.7808],
  "Elbasan": [41.1125, 20.0822],
  "Fier": [40.7239, 19.5563],
  "Berat": [40.7058, 19.9522],
  "Lushnjë": [40.9419, 19.7050],
  "Kamëz": [41.3817, 19.7600],
  "Pogradec": [40.9025, 20.6525],
  "Kavajë": [41.1856, 19.5569],
  "Lezhë": [41.7836, 19.6436],
  "Gjirokastër": [40.0758, 20.1389],
  "Vorë": [41.3939, 19.6522],
  "Golem": [41.2514, 19.4756],
  "Himarë": [40.1008, 19.7453],
  "Ksamil": [39.7831, 20.0003],
  "Dhërmi": [40.1525, 19.6097],
  "Përmet": [40.2336, 20.3517],
  "Prishtinë": [42.6629, 21.1655],
};
```

- [ ] **Step 2: Update `web/src/lib/city-coords.ts` to re-export**

Replace lines 1-25 (the `ALBANIAN_CITY_COORDS` constant) with:

```ts
export { ALBANIAN_CITY_COORDS } from "@repo/analytics";
```

Keep the rest of the file (`ALBANIA_CENTER`, `ALBANIA_DEFAULT_ZOOM`, `CITY_ZOOM`, plus any other exports) intact.

- [ ] **Step 3: Add `@repo/analytics` as a dependency of `@shtepial/web`**

Edit `web/package.json` dependencies section:

```json
"@repo/analytics": "*",
```

Run: `npm install`

- [ ] **Step 4: Run existing web tests to verify nothing broke**

Run: `npm run -w @shtepial/web test -- --run`
Expected: all tests pass; the existing `city-sync.test.ts` still validates the constant.

- [ ] **Step 5: Commit**

```bash
git add packages/analytics/src/geocoords/cities.ts web/src/lib/city-coords.ts web/package.json package-lock.json
git commit -m "$(cat <<'EOF'
refactor(analytics): move ALBANIAN_CITY_COORDS into @repo/analytics

Centralises the 22-city centroid table in the shared package. web/ now
re-exports from @repo/analytics so existing call sites are unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `getCityFromCoords` — haversine nearest-centroid (TDD)

**Files:**
- Create: `packages/analytics/src/geocoords/nearest-city.ts`
- Create: `packages/analytics/src/geocoords/nearest-city.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/analytics/src/geocoords/nearest-city.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getCityFromCoords, haversineKm } from "./nearest-city";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm(41.3275, 19.8187, 41.3275, 19.8187)).toBeCloseTo(0, 3);
  });

  it("computes Tiranë → Durrës distance ~33 km", () => {
    const d = haversineKm(41.3275, 19.8187, 41.3246, 19.4565);
    expect(d).toBeGreaterThan(28);
    expect(d).toBeLessThan(38);
  });
});

describe("getCityFromCoords", () => {
  it("returns Tiranë for Tiranë centre coords", () => {
    const result = getCityFromCoords(41.3275, 19.8187);
    expect(result?.city).toBe("Tiranë");
    expect(result?.distanceKm).toBeLessThan(1);
  });

  it("returns Durrës for a coord near Durrës", () => {
    const result = getCityFromCoords(41.32, 19.46);
    expect(result?.city).toBe("Durrës");
  });

  it("returns null when coords are far from any Albanian city (Rome)", () => {
    const result = getCityFromCoords(41.9028, 12.4964);
    expect(result).toBeNull();
  });

  it("returns null when coords are 0,0", () => {
    const result = getCityFromCoords(0, 0);
    expect(result).toBeNull();
  });

  it("respects custom maxKm threshold", () => {
    // A point ~10 km from Tiranë should match with maxKm=15 but not maxKm=5.
    const lat = 41.4175;
    const lng = 19.8187;
    expect(getCityFromCoords(lat, lng, 15)?.city).toBe("Tiranë");
    expect(getCityFromCoords(lat, lng, 5)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run -w @repo/analytics test`
Expected: FAIL — `nearest-city` module does not exist.

- [ ] **Step 3: Write the implementation**

Create `packages/analytics/src/geocoords/nearest-city.ts`:

```ts
import { ALBANIAN_CITY_COORDS } from "./cities";

const EARTH_RADIUS_KM = 6371;
const DEFAULT_MAX_KM = 25;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface NearestCity {
  city: string;
  distanceKm: number;
}

export function getCityFromCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
  maxKm: number = DEFAULT_MAX_KM,
): NearestCity | null {
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;

  let best: NearestCity | null = null;
  for (const [city, [cLat, cLng]] of Object.entries(ALBANIAN_CITY_COORDS)) {
    const d = haversineKm(lat, lng, cLat, cLng);
    if (d <= maxKm && (best === null || d < best.distanceKm)) {
      best = { city, distanceKm: d };
    }
  }
  return best;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run -w @repo/analytics test`
Expected: all 7 cases PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/analytics/src/geocoords
git commit -m "$(cat <<'EOF'
feat(analytics): add getCityFromCoords haversine assignment

Pure-TS nearest-centroid city resolver with configurable max distance
(default 25km). Returns null for out-of-Albania coords, (0,0), and
non-finite inputs. Tested against Tiranë, Durrës, Rome, and a custom
threshold case.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Drizzle schema — `marketSnapshots` and `b2bUsers`

**Files:**
- Modify: `web/src/lib/db/schema.ts` (append at end)

- [ ] **Step 1: Append the new tables to `web/src/lib/db/schema.ts`**

Add this at the bottom of the file (after the last existing table):

```ts
export const marketSnapshots = pgTable(
  "market_snapshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    snapshotDate: date("snapshot_date").notNull(),
    city: text("city"),
    transactionType: text("transaction_type").notNull(),
    propertyType: text("property_type"),
    listingCount: integer("listing_count").notNull(),
    avgPriceEur: numeric("avg_price_eur", { precision: 12, scale: 2 }),
    medianPriceEur: numeric("median_price_eur", { precision: 12, scale: 2 }),
    avgPriceSqmEur: numeric("avg_price_sqm_eur", { precision: 10, scale: 2 }),
    medianPriceSqmEur: numeric("median_price_sqm_eur", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_market_snapshots_lookup").on(
      table.city,
      table.transactionType,
      table.snapshotDate,
    ),
  ],
);

export const b2bUsers = pgTable("b2b_users", {
  userId: uuid("user_id").primaryKey(),
  organization: text("organization").notNull(),
  role: text("role").notNull().default("viewer"),
  planSlug: text("plan_slug"),
  invitedBy: uuid("invited_by"),
  invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});
```

- [ ] **Step 2: Ensure required imports are present at the top of `schema.ts`**

Verify `pgTable`, `bigserial`, `date`, `text`, `integer`, `numeric`, `timestamp`, `uuid`, and `index` are all imported from `drizzle-orm/pg-core`. Add any missing imports to the existing import statement.

- [ ] **Step 3: Type-check**

Run: `npm run -w @shtepial/web build`
Expected: build succeeds (this also runs `tsc` via Next).

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/db/schema.ts
git commit -m "$(cat <<'EOF'
feat(db): add market_snapshots and b2b_users tables to schema

Drizzle definitions only. Migration SQL follows in the next commit.
market_snapshots holds daily aggregated price metrics keyed by date +
city + transaction_type + property_type, with NULLs encoding rollups.
b2b_users gates access to the new data-portal app.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Migration SQL `0014_market_snapshots.sql`

**Files:**
- Create: `web/src/lib/db/migrations/0014_market_snapshots.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Migration 0014: market_snapshots + b2b_users

CREATE TABLE IF NOT EXISTS market_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  city TEXT NULL,
  transaction_type TEXT NOT NULL,
  property_type TEXT NULL,
  listing_count INTEGER NOT NULL,
  avg_price_eur NUMERIC(12, 2),
  median_price_eur NUMERIC(12, 2),
  avg_price_sqm_eur NUMERIC(10, 2),
  median_price_sqm_eur NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_snapshots_unique
  ON market_snapshots (
    snapshot_date,
    COALESCE(city, ''),
    transaction_type,
    COALESCE(property_type, '')
  );

CREATE INDEX IF NOT EXISTS idx_market_snapshots_lookup
  ON market_snapshots (city, transaction_type, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS b2b_users (
  user_id UUID PRIMARY KEY,
  organization TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  plan_slug TEXT,
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_b2b_users_org ON b2b_users (organization);
```

- [ ] **Step 2: Commit**

```bash
git add web/src/lib/db/migrations/0014_market_snapshots.sql
git commit -m "$(cat <<'EOF'
feat(db): migration 0014 — market_snapshots + b2b_users

Idempotent (IF NOT EXISTS). The unique index uses COALESCE on the
nullable columns so a (date, NULL, sale, NULL) national rollup row
collides correctly with itself on re-run.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Snapshot types + pure compute (TDD)

**Files:**
- Create: `packages/analytics/src/snapshots/types.ts`
- Create: `packages/analytics/src/snapshots/compute.ts`
- Create: `packages/analytics/src/snapshots/compute.test.ts`

- [ ] **Step 1: Write the types module**

Create `packages/analytics/src/snapshots/types.ts`:

```ts
export interface ListingForSnapshot {
  id: string;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
  areaSqm: number | null;
  transactionType: "sale" | "rent";
  propertyType: string | null;
}

export interface SnapshotRow {
  snapshotDate: string;
  city: string | null;
  transactionType: "sale" | "rent";
  propertyType: string | null;
  listingCount: number;
  avgPriceEur: number | null;
  medianPriceEur: number | null;
  avgPriceSqmEur: number | null;
  medianPriceSqmEur: number | null;
}
```

- [ ] **Step 2: Write the failing test**

Create `packages/analytics/src/snapshots/compute.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeSnapshotRows } from "./compute";
import type { ListingForSnapshot } from "./types";

const tiranaSale = (price: number, area: number): ListingForSnapshot => ({
  id: crypto.randomUUID(),
  latitude: 41.3275,
  longitude: 19.8187,
  price,
  areaSqm: area,
  transactionType: "sale",
  propertyType: "apartment",
});

describe("computeSnapshotRows", () => {
  it("returns empty when listings is empty", () => {
    expect(computeSnapshotRows("2026-05-16", [])).toEqual([]);
  });

  it("computes per-city + national rollup rows", () => {
    const rows = computeSnapshotRows("2026-05-16", [
      tiranaSale(100_000, 100),
      tiranaSale(200_000, 100),
    ]);
    const tirana = rows.find((r) => r.city === "Tiranë" && r.propertyType === "apartment");
    const national = rows.find((r) => r.city === null && r.propertyType === null);
    expect(tirana?.listingCount).toBe(2);
    expect(tirana?.avgPriceEur).toBe(150_000);
    expect(tirana?.medianPriceEur).toBe(150_000);
    expect(tirana?.avgPriceSqmEur).toBe(1_500);
    expect(national?.listingCount).toBe(2);
  });

  it("excludes listings with no coords from city series but keeps them in national", () => {
    const rows = computeSnapshotRows("2026-05-16", [
      tiranaSale(100_000, 100),
      {
        id: "no-coords",
        latitude: null,
        longitude: null,
        price: 200_000,
        areaSqm: 100,
        transactionType: "sale",
        propertyType: "apartment",
      },
    ]);
    const tirana = rows.find((r) => r.city === "Tiranë" && r.propertyType === "apartment");
    const nationalAll = rows.find(
      (r) => r.city === null && r.transactionType === "sale" && r.propertyType === null,
    );
    expect(tirana?.listingCount).toBe(1);
    expect(nationalAll?.listingCount).toBe(2);
    expect(nationalAll?.avgPriceEur).toBe(150_000);
  });

  it("computes median for odd-count groups", () => {
    const rows = computeSnapshotRows("2026-05-16", [
      tiranaSale(100_000, 100),
      tiranaSale(150_000, 100),
      tiranaSale(300_000, 100),
    ]);
    const tirana = rows.find(
      (r) => r.city === "Tiranë" && r.propertyType === "apartment",
    );
    expect(tirana?.medianPriceEur).toBe(150_000);
  });

  it("produces sale and rent rows independently", () => {
    const rows = computeSnapshotRows("2026-05-16", [
      tiranaSale(100_000, 100),
      {
        id: crypto.randomUUID(),
        latitude: 41.3275,
        longitude: 19.8187,
        price: 500,
        areaSqm: 50,
        transactionType: "rent",
        propertyType: "apartment",
      },
    ]);
    expect(
      rows.find((r) => r.city === "Tiranë" && r.transactionType === "sale")?.listingCount,
    ).toBe(1);
    expect(
      rows.find((r) => r.city === "Tiranë" && r.transactionType === "rent")?.listingCount,
    ).toBe(1);
  });
});
```

- [ ] **Step 3: Run the test, expect failure**

Run: `npm run -w @repo/analytics test`
Expected: FAIL — `compute` module does not exist.

- [ ] **Step 4: Implement `compute.ts`**

Create `packages/analytics/src/snapshots/compute.ts`:

```ts
import { getCityFromCoords } from "../geocoords/nearest-city";
import type { ListingForSnapshot, SnapshotRow } from "./types";

type GroupKey = string;

interface Group {
  city: string | null;
  transactionType: "sale" | "rent";
  propertyType: string | null;
  prices: number[];
  pricesPerSqm: number[];
}

function key(g: Pick<Group, "city" | "transactionType" | "propertyType">): GroupKey {
  return `${g.city ?? ""}|${g.transactionType}|${g.propertyType ?? ""}`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function round2(n: number | null): number | null {
  return n === null ? null : Math.round(n * 100) / 100;
}

export function computeSnapshotRows(
  snapshotDate: string,
  listings: ListingForSnapshot[],
): SnapshotRow[] {
  const groups = new Map<GroupKey, Group>();

  const recordTo = (g: Group, price: number, pricePerSqm: number | null) => {
    g.prices.push(price);
    if (pricePerSqm !== null) g.pricesPerSqm.push(pricePerSqm);
  };

  for (const l of listings) {
    if (l.price === null || l.price <= 0) continue;
    const cityResult = getCityFromCoords(l.latitude, l.longitude);
    const cityName = cityResult?.city ?? null;
    const pricePerSqm =
      l.areaSqm && l.areaSqm > 0 ? l.price / l.areaSqm : null;

    const facets: Array<{
      city: string | null;
      propertyType: string | null;
    }> = [
      { city: null, propertyType: null },                     // national, all types
      { city: null, propertyType: l.propertyType ?? null },   // national, this type
    ];
    if (cityName !== null) {
      facets.push({ city: cityName, propertyType: null });    // city, all types
      facets.push({ city: cityName, propertyType: l.propertyType ?? null });
    }

    for (const f of facets) {
      const k = key({ ...f, transactionType: l.transactionType });
      const g = groups.get(k) ?? {
        ...f,
        transactionType: l.transactionType,
        prices: [],
        pricesPerSqm: [],
      };
      recordTo(g, l.price, pricePerSqm);
      groups.set(k, g);
    }
  }

  return [...groups.values()].map((g) => ({
    snapshotDate,
    city: g.city,
    transactionType: g.transactionType,
    propertyType: g.propertyType,
    listingCount: g.prices.length,
    avgPriceEur: round2(average(g.prices)),
    medianPriceEur: round2(median(g.prices)),
    avgPriceSqmEur: round2(average(g.pricesPerSqm)),
    medianPriceSqmEur: round2(median(g.pricesPerSqm)),
  }));
}
```

- [ ] **Step 5: Run the test, expect pass**

Run: `npm run -w @repo/analytics test`
Expected: all cases PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/analytics/src/snapshots
git commit -m "$(cat <<'EOF'
feat(analytics): pure snapshot computation with facet rollups

computeSnapshotRows produces a row per (city, transaction_type,
property_type) facet plus national (city=NULL) rollups. Listings without
coords are excluded from city series but folded into national totals.
Median computed exactly; per-sqm metrics skip area<=0 listings.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Snapshot persistence + backfill + daily wrappers

**Files:**
- Create: `packages/analytics/src/snapshots/persist.ts`
- Create: `packages/analytics/src/snapshots/backfill.ts`
- Create: `packages/analytics/src/snapshots/daily.ts`

- [ ] **Step 1: Create `persist.ts` — idempotent upsert**

```ts
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SnapshotRow } from "./types";

export async function upsertSnapshotRows(
  // The DB type is flexible; web/ passes its drizzle instance.
  db: { execute: (q: any) => Promise<any> },
  rows: SnapshotRow[],
): Promise<void> {
  if (rows.length === 0) return;

  for (const r of rows) {
    await db.execute(sql`
      INSERT INTO market_snapshots (
        snapshot_date, city, transaction_type, property_type,
        listing_count, avg_price_eur, median_price_eur,
        avg_price_sqm_eur, median_price_sqm_eur
      ) VALUES (
        ${r.snapshotDate}, ${r.city}, ${r.transactionType}, ${r.propertyType},
        ${r.listingCount}, ${r.avgPriceEur}, ${r.medianPriceEur},
        ${r.avgPriceSqmEur}, ${r.medianPriceSqmEur}
      )
      ON CONFLICT (snapshot_date, COALESCE(city, ''), transaction_type, COALESCE(property_type, ''))
      DO UPDATE SET
        listing_count = EXCLUDED.listing_count,
        avg_price_eur = EXCLUDED.avg_price_eur,
        median_price_eur = EXCLUDED.median_price_eur,
        avg_price_sqm_eur = EXCLUDED.avg_price_sqm_eur,
        median_price_sqm_eur = EXCLUDED.median_price_sqm_eur
    `);
  }
}
```

- [ ] **Step 2: Create `daily.ts` — today-only wrapper**

```ts
import { sql } from "drizzle-orm";
import { computeSnapshotRows } from "./compute";
import { upsertSnapshotRows } from "./persist";
import type { ListingForSnapshot } from "./types";

export async function writeDailySnapshot(
  db: { execute: (q: any) => Promise<any> },
  today: string = new Date().toISOString().slice(0, 10),
): Promise<{ rowsWritten: number }> {
  const result: any = await db.execute(sql`
    SELECT
      id::text AS id,
      latitude::float AS latitude,
      longitude::float AS longitude,
      price::float AS price,
      area_sqm::float AS "areaSqm",
      transaction_type AS "transactionType",
      property_type AS "propertyType"
    FROM listings
    WHERE is_active = true
      AND price IS NOT NULL
      AND transaction_type IN ('sale', 'rent')
  `);

  const listings: ListingForSnapshot[] = (result.rows ?? result) as ListingForSnapshot[];
  const rows = computeSnapshotRows(today, listings);
  await upsertSnapshotRows(db, rows);
  return { rowsWritten: rows.length };
}
```

- [ ] **Step 3: Create `backfill.ts` — historical day iteration**

```ts
import { sql } from "drizzle-orm";
import { computeSnapshotRows } from "./compute";
import { upsertSnapshotRows } from "./persist";
import type { ListingForSnapshot } from "./types";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

export async function backfillSnapshots(
  db: { execute: (q: any) => Promise<any> },
  opts: { startDate?: string; endDate?: string; onDay?: (day: string, rows: number) => void } = {},
): Promise<{ daysProcessed: number; rowsWritten: number }> {
  const bounds: any = await db.execute(sql`
    SELECT MIN(first_seen)::date AS start_date FROM listings
  `);
  const startStr =
    opts.startDate ??
    (bounds.rows?.[0]?.start_date ?? bounds[0]?.start_date ?? null);
  if (!startStr) return { daysProcessed: 0, rowsWritten: 0 };

  const endStr = opts.endDate ?? new Date().toISOString().slice(0, 10);
  let day = new Date(startStr);
  const endDay = new Date(endStr);

  let daysProcessed = 0;
  let rowsWritten = 0;
  while (day <= endDay) {
    const D = ymd(day);
    const result: any = await db.execute(sql`
      SELECT
        l.id::text AS id,
        l.latitude::float AS latitude,
        l.longitude::float AS longitude,
        COALESCE(
          (
            SELECT ph.price::float
            FROM price_history ph
            WHERE ph.listing_id = l.id AND ph.recorded_at::date <= ${D}
            ORDER BY ph.recorded_at DESC
            LIMIT 1
          ),
          l.price::float
        ) AS price,
        l.area_sqm::float AS "areaSqm",
        l.transaction_type AS "transactionType",
        l.property_type AS "propertyType"
      FROM listings l
      WHERE l.first_seen::date <= ${D}
        AND (l.last_seen IS NULL OR l.last_seen::date >= ${D})
        AND l.transaction_type IN ('sale', 'rent')
    `);
    const listings: ListingForSnapshot[] = (result.rows ?? result) as ListingForSnapshot[];
    const rows = computeSnapshotRows(D, listings);
    await upsertSnapshotRows(db, rows);
    opts.onDay?.(D, rows.length);
    daysProcessed++;
    rowsWritten += rows.length;
    day = addDays(day, 1);
  }
  return { daysProcessed, rowsWritten };
}
```

- [ ] **Step 4: Type-check the package**

Run: `npm run -w @repo/analytics test`
Expected: still 12 PASS (no new tests yet — added in Task 13). The TS compile happens via vitest's loader.

If you want a stricter check, run: `npx tsc --noEmit -p packages/analytics`

- [ ] **Step 5: Commit**

```bash
git add packages/analytics/src/snapshots/persist.ts packages/analytics/src/snapshots/backfill.ts packages/analytics/src/snapshots/daily.ts
git commit -m "$(cat <<'EOF'
feat(analytics): snapshot persist, daily, and backfill helpers

persist.upsertSnapshotRows performs ON CONFLICT DO UPDATE keyed by the
COALESCE-based unique index. daily.writeDailySnapshot reads currently
active listings and writes today's row set. backfill.backfillSnapshots
walks from MIN(first_seen) to today, using price_history to recover
each listing's price as of each historical day.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: `getPriceTrends` query (TDD)

**Files:**
- Create: `packages/analytics/src/queries/trends.ts`
- Create: `packages/analytics/src/queries/trends.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/analytics/src/queries/trends.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getPriceTrends } from "./trends";

describe("getPriceTrends", () => {
  it("returns empty trend when db is null", async () => {
    const trend = await getPriceTrends(null, {
      city: "Tiranë",
      transactionType: "sale",
      days: 30,
    });
    expect(trend.points).toEqual([]);
    expect(trend.city).toBe("Tiranë");
    expect(trend.transactionType).toBe("sale");
  });

  it("maps DB rows into points", async () => {
    const fakeDb = {
      execute: async () => ({
        rows: [
          {
            snapshot_date: "2026-05-14",
            avg_price_sqm_eur: "1500.00",
            median_price_eur: "120000.00",
            listing_count: 42,
          },
          {
            snapshot_date: "2026-05-15",
            avg_price_sqm_eur: "1510.50",
            median_price_eur: "121000.00",
            listing_count: 45,
          },
        ],
      }),
    };
    const trend = await getPriceTrends(fakeDb as any, {
      city: "Tiranë",
      transactionType: "sale",
      days: 30,
    });
    expect(trend.points).toHaveLength(2);
    expect(trend.points[0]).toEqual({
      period: "2026-05-14",
      avgPriceSqmEur: 1500,
      medianPriceEur: 120000,
      listingCount: 42,
    });
    expect(trend.points[1].avgPriceSqmEur).toBe(1510.5);
  });

  it("queries national rollup when city is null", async () => {
    let capturedSql = "";
    const fakeDb = {
      execute: async (q: any) => {
        capturedSql = q.sql ?? q.queryChunks?.map((c: any) => c?.value ?? "").join(" ") ?? "";
        return { rows: [] };
      },
    };
    await getPriceTrends(fakeDb as any, {
      city: null,
      transactionType: "rent",
      days: 30,
    });
    // The query should reference "city IS NULL" rather than equality.
    expect(capturedSql.toLowerCase()).toContain("city is null");
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npm run -w @repo/analytics test`
Expected: FAIL — `trends` module does not exist.

- [ ] **Step 3: Implement `trends.ts`**

```ts
import { sql } from "drizzle-orm";

export interface TrendPoint {
  period: string;
  avgPriceSqmEur: number | null;
  medianPriceEur: number | null;
  listingCount: number;
}

export interface PriceTrend {
  city: string | null;
  transactionType: "sale" | "rent";
  propertyType: string | null;
  days: number;
  points: TrendPoint[];
}

export interface TrendQuery {
  city: string | null;
  transactionType: "sale" | "rent";
  propertyType?: string | null;
  days: number;
}

export async function getPriceTrends(
  db: { execute: (q: any) => Promise<any> } | null,
  q: TrendQuery,
): Promise<PriceTrend> {
  const empty: PriceTrend = {
    city: q.city,
    transactionType: q.transactionType,
    propertyType: q.propertyType ?? null,
    days: q.days,
    points: [],
  };
  if (!db) return empty;

  const propertyType = q.propertyType ?? null;
  const result: any = await db.execute(sql`
    SELECT
      snapshot_date::text AS snapshot_date,
      avg_price_sqm_eur,
      median_price_eur,
      listing_count
    FROM market_snapshots
    WHERE ${q.city === null ? sql`city IS NULL` : sql`city = ${q.city}`}
      AND transaction_type = ${q.transactionType}
      AND ${propertyType === null ? sql`property_type IS NULL` : sql`property_type = ${propertyType}`}
      AND snapshot_date >= CURRENT_DATE - INTERVAL '1 day' * ${q.days}
    ORDER BY snapshot_date ASC
  `);

  const rows = (result.rows ?? result) as Array<{
    snapshot_date: string;
    avg_price_sqm_eur: string | number | null;
    median_price_eur: string | number | null;
    listing_count: number;
  }>;

  return {
    ...empty,
    points: rows.map((r) => ({
      period: r.snapshot_date,
      avgPriceSqmEur: r.avg_price_sqm_eur === null ? null : Number(r.avg_price_sqm_eur),
      medianPriceEur: r.median_price_eur === null ? null : Number(r.median_price_eur),
      listingCount: Number(r.listing_count),
    })),
  };
}
```

- [ ] **Step 4: Run the test, expect pass**

Run: `npm run -w @repo/analytics test`
Expected: all 3 trends cases PASS along with previous cases.

- [ ] **Step 5: Commit**

```bash
git add packages/analytics/src/queries
git commit -m "$(cat <<'EOF'
feat(analytics): getPriceTrends query reads market_snapshots

Returns a PriceTrend with a chronological list of TrendPoints for the
requested city + transaction type + property type slice over N days.
Null city → national rollup (uses IS NULL, not equality). Seed fallback:
returns empty points array when db is null.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Move `getMarketOverview` from `web/` into the package

**Files:**
- Create: `packages/analytics/src/queries/overview.ts`
- Delete: `web/src/lib/analytics/market.ts` (whole file)
- Modify: any file importing from `web/src/lib/analytics/market.ts` to import from `@repo/analytics`

- [ ] **Step 1: Copy current `web/src/lib/analytics/market.ts` into the package**

Create `packages/analytics/src/queries/overview.ts` with the **same code** as the current `web/src/lib/analytics/market.ts`, with these changes:
- Replace `import { listings } from "../db/schema";` with a local schema import path that won't apply — instead, take `db` as a parameter and use raw SQL. Use the same SQL the existing file uses, but execute via `db.execute(sql\`...\`)` so the package doesn't import `web/`'s schema.

Here is the full content:

```ts
import { sql } from "drizzle-orm";

export interface CityMetrics {
  city: string;
  avg_price_sqm: number | null;
  median_price: number | null;
  total_listings: number;
  sale_count: number;
  rent_count: number;
  avg_rent_sqm: number | null;
  rent_yield: number | null;
}

export interface MarketOverview {
  cities: CityMetrics[];
  total_listings: number;
  national_avg_price_sqm: number | null;
  generated_at: string;
}

export async function getMarketOverview(
  db: { execute: (q: any) => Promise<any> } | null,
): Promise<MarketOverview> {
  if (!db) {
    return {
      cities: [],
      total_listings: 0,
      national_avg_price_sqm: null,
      generated_at: new Date().toISOString(),
    };
  }

  const result: any = await db.execute(sql`
    SELECT
      city,
      AVG(CASE WHEN area_sqm > 0 AND transaction_type = 'sale' THEN price / area_sqm END) AS avg_price_sqm,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) FILTER (WHERE price IS NOT NULL) AS median_price,
      COUNT(*) AS total_listings,
      COUNT(*) FILTER (WHERE transaction_type = 'sale') AS sale_count,
      COUNT(*) FILTER (WHERE transaction_type = 'rent') AS rent_count,
      AVG(CASE WHEN area_sqm > 0 AND transaction_type = 'rent' THEN price / area_sqm END) AS avg_rent_sqm
    FROM listings
    WHERE is_active = true
    GROUP BY city
    ORDER BY COUNT(*) DESC
  `);

  const rows = (result.rows ?? result) as any[];

  const cities: CityMetrics[] = rows
    .filter((r) => r.city != null)
    .map((r) => {
      const avgSale = r.avg_price_sqm ? Number(r.avg_price_sqm) : null;
      const avgRent = r.avg_rent_sqm ? Number(r.avg_rent_sqm) : null;
      let rentYield: number | null = null;
      if (avgSale && avgRent && avgSale > 0) {
        rentYield = Math.round(((avgRent * 12) / avgSale) * 1000) / 10;
      }
      return {
        city: r.city as string,
        avg_price_sqm: avgSale ? Math.round(avgSale) : null,
        median_price: r.median_price ? Math.round(Number(r.median_price)) : null,
        total_listings: Number(r.total_listings),
        sale_count: Number(r.sale_count),
        rent_count: Number(r.rent_count),
        avg_rent_sqm: avgRent ? Math.round(avgRent * 100) / 100 : null,
        rent_yield: rentYield,
      };
    });

  const totalResult: any = await db.execute(sql`
    SELECT COUNT(*) AS count FROM listings WHERE is_active = true
  `);
  const totalCount = Number(
    (totalResult.rows ?? totalResult)[0]?.count ?? 0,
  );

  const nationalAvg =
    cities.length > 0
      ? Math.round(
          cities.reduce((sum, c) => sum + (c.avg_price_sqm ?? 0) * c.sale_count, 0) /
            Math.max(1, cities.reduce((sum, c) => sum + (c.avg_price_sqm ? c.sale_count : 0), 0)),
        )
      : null;

  return {
    cities,
    total_listings: totalCount,
    national_avg_price_sqm: nationalAvg || null,
    generated_at: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Find all imports of the old path in `web/`**

Run: `grep -rn "lib/analytics/market" web/src`
Expected: one file — the API route `web/src/app/api/analytics/market/route.ts`.

That route will be deleted in Task 17 along with the `/data` UI. Leave it alone for now; it still imports from the old path. The plan deletes the entire `web/src/lib/analytics/` directory in Task 17.

- [ ] **Step 3: Verify the package still type-checks**

Run: `npm run -w @repo/analytics test`
Expected: all tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/analytics/src/queries/overview.ts
git commit -m "$(cat <<'EOF'
refactor(analytics): port getMarketOverview into @repo/analytics

Identical SQL to the previous web/src/lib/analytics/market.ts. Now takes
a db parameter and uses raw sql tags so the package has no dependency on
web/'s schema module.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Snapshot cron route on `web/`

**Files:**
- Create: `web/src/app/api/cron/market-snapshot/route.ts`
- Create: `web/src/app/api/cron/market-snapshot/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/app/api/cron/market-snapshot/route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/drizzle", () => ({
  getDb: vi.fn(() => null),
}));

vi.mock("@repo/analytics", () => ({
  writeDailySnapshot: vi.fn(async () => ({ rowsWritten: 0 })),
}));

import { GET } from "./route";

describe("GET /api/cron/market-snapshot", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without authorization", async () => {
    const req = new Request("http://x/api/cron/market-snapshot");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("rejects wrong bearer token", async () => {
    const req = new Request("http://x/api/cron/market-snapshot", {
      headers: { authorization: "Bearer wrong" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("accepts correct bearer token and returns 200", async () => {
    const req = new Request("http://x/api/cron/market-snapshot", {
      headers: { authorization: "Bearer test-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("rowsWritten");
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm run -w @shtepial/web test -- --run src/app/api/cron/market-snapshot`
Expected: FAIL — route module does not exist.

- [ ] **Step 3: Implement the route**

```ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/drizzle";
import { writeDailySnapshot } from "@repo/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ rowsWritten: 0, skipped: "no-db" });
  }

  const { rowsWritten } = await writeDailySnapshot(db);
  return NextResponse.json({ rowsWritten });
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm run -w @shtepial/web test -- --run src/app/api/cron/market-snapshot`
Expected: all 3 cases PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/api/cron/market-snapshot
git commit -m "$(cat <<'EOF'
feat(cron): add /api/cron/market-snapshot route

Vercel-cron-secured (Authorization: Bearer \$CRON_SECRET) endpoint that
writes today's market_snapshots rows by computing aggregates over active
listings. Returns the row count for observability.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Wire Vercel Cron in `web/vercel.json`

**Files:**
- Modify: `web/vercel.json`

- [ ] **Step 1: Update `web/vercel.json`**

Replace the file contents with:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/market-snapshot",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add web/vercel.json
git commit -m "$(cat <<'EOF'
chore(cron): schedule daily market snapshot at 02:00 UTC

Runs 1h after the daily scrape (01:00 UTC, CLOSESPIDER_TIMEOUT=780s so
~13min worst case). CRON_SECRET must be set in Vercel env.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Backfill script + npm script

**Files:**
- Create: `web/scripts/backfill-market-snapshots.ts`
- Modify: `web/package.json` (add npm script)

- [ ] **Step 1: Create the backfill script**

```ts
/**
 * Run with: npm run -w @shtepial/web backfill:snapshots
 *
 * Idempotent: re-running will UPSERT existing rows. Safe to run repeatedly.
 */
import { getDb } from "@/lib/db/drizzle";
import { backfillSnapshots } from "@repo/analytics";

async function main() {
  const db = getDb();
  if (!db) {
    console.error("No DATABASE_URL — refusing to run backfill against seed fallback.");
    process.exit(1);
  }
  console.log("Starting market snapshot backfill...");
  const result = await backfillSnapshots(db, {
    onDay: (day, rows) => console.log(`  ${day}: ${rows} rows`),
  });
  console.log(`Done. ${result.daysProcessed} days, ${result.rowsWritten} rows total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

Edit `web/package.json` `scripts` section, add:

```json
"backfill:snapshots": "tsx scripts/backfill-market-snapshots.ts",
```

If `tsx` is not in devDependencies, add it: `npm install -w @shtepial/web -D tsx`

- [ ] **Step 3: Commit (do NOT run the backfill yet — that happens after the data-portal is ready)**

```bash
git add web/scripts/backfill-market-snapshots.ts web/package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat(scripts): add backfill-market-snapshots one-shot

Walks history from MIN(listings.first_seen) to today, computing each
day's market_snapshots rows from listings + price_history. Idempotent
(ON CONFLICT DO UPDATE). To be run once manually against prod after the
data-portal goes live.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Scaffold `data-portal/` Next.js app

**Files:**
- Create: `data-portal/package.json`, `tsconfig.json`, `next.config.js`, `vercel.json`, `vitest.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`
- Create: `data-portal/src/app/layout.tsx`, `globals.css`
- Create: `data-portal/public/robots.txt`

- [ ] **Step 1: Create `data-portal/package.json`**

```json
{
  "name": "@shtepial/data-portal",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "@repo/analytics": "*",
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.95.3",
    "drizzle-orm": "^0.45.1",
    "next": "14.2.35",
    "postgres": "^3.4.8",
    "react": "^18",
    "react-dom": "^18",
    "recharts": "^2.13.3"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `data-portal/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `data-portal/next.config.js`**

```js
/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@repo/analytics"],
};
```

- [ ] **Step 4: Create `data-portal/vercel.json`**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

- [ ] **Step 5: Create `data-portal/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
});
```

- [ ] **Step 6: Create `data-portal/public/robots.txt`**

```
User-agent: *
Disallow: /
```

- [ ] **Step 7: Create `data-portal/postcss.config.mjs` and `data-portal/tailwind.config.ts`**

`postcss.config.mjs`:

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

`tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1B2A4A",
        cream: "#FDF8F0",
        terracotta: "#C75B39",
        gold: "#D4A843",
        warmgray: "#8B8178",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 8: Create `data-portal/src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Create `data-portal/src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShtëpiAL Intel",
  description: "Të dhëna proprietare të tregut të pasurive të paluajtshme në Shqipëri.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq">
      <body className="bg-cream text-navy">{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Install**

Run: `npm install`
Expected: `data-portal` workspace linked, recharts and Supabase deps installed.

- [ ] **Step 11: Verify it boots**

Run: `npm run -w @shtepial/data-portal build`
Expected: Next.js build completes (even with no pages yet beyond layout — Next will warn about empty app but won't fail; if it does fail, create a stub `src/app/page.tsx` returning `<div>Intel</div>` and rebuild).

- [ ] **Step 12: Commit**

```bash
git add data-portal package-lock.json
git commit -m "$(cat <<'EOF'
feat(data-portal): scaffold B2B Next.js app

New workspace @shtepial/data-portal on port 3001. Tailwind, Vitest, and
Recharts wired. robots.txt blocks all crawling. Transpiles @repo/analytics
via Next config. Empty app shell only; routes added in subsequent commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Supabase client + b2b user gating + middleware (TDD)

**Files:**
- Create: `data-portal/src/lib/supabase/server.ts`
- Create: `data-portal/src/lib/supabase/client.ts`
- Create: `data-portal/src/lib/db.ts`
- Create: `data-portal/src/lib/b2b-user.ts`
- Create: `data-portal/middleware.ts`
- Create: `data-portal/middleware.test.ts`

- [ ] **Step 1: Create `data-portal/src/lib/supabase/server.ts`**

```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions),
            );
          } catch {
            // Server component context — ignore (handled by middleware).
          }
        },
      },
    },
  );
}
```

- [ ] **Step 2: Create `data-portal/src/lib/supabase/client.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
  );
}
```

- [ ] **Step 3: Create `data-portal/src/lib/db.ts`**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const client = postgres(url, { prepare: false });
  _db = drizzle(client);
  return _db;
}
```

- [ ] **Step 4: Create `data-portal/src/lib/b2b-user.ts`**

```ts
import { sql } from "drizzle-orm";
import { getDb } from "./db";

export interface B2bUser {
  userId: string;
  organization: string;
  role: "viewer" | "admin";
  planSlug: string | null;
}

export async function getB2bUser(userId: string): Promise<B2bUser | null> {
  const db = getDb();
  if (!db) return null;
  const result: any = await db.execute(sql`
    SELECT user_id, organization, role, plan_slug
    FROM b2b_users
    WHERE user_id = ${userId}
  `);
  const row = (result.rows ?? result)[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    organization: row.organization,
    role: row.role,
    planSlug: row.plan_slug,
  };
}
```

- [ ] **Step 5: Write the failing middleware test**

Create `data-portal/middleware.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockGetB2bUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/b2b-user", () => ({
  getB2bUser: (id: string) => mockGetB2bUser(id),
}));

import { middleware } from "./middleware";

function makeReq(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "http://localhost"), { headers });
}

describe("data-portal middleware", () => {
  it("allows /login through anonymous", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await middleware(makeReq("/login"));
    expect(res.status).not.toBe(403);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated user from / to /login", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await middleware(makeReq("/"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("returns 403 for authenticated user not in b2b_users", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    mockGetB2bUser.mockResolvedValueOnce(null);
    const res = await middleware(makeReq("/dashboard"));
    expect(res.status).toBe(403);
  });

  it("passes through authenticated b2b user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    mockGetB2bUser.mockResolvedValueOnce({
      userId: "u1",
      organization: "Bank of Albania",
      role: "viewer",
      planSlug: "intel-dashboard",
    });
    const res = await middleware(makeReq("/dashboard"));
    expect(res.status).not.toBe(403);
    expect(res.headers.get("location")).toBeNull();
  });
});
```

- [ ] **Step 6: Run test, expect failure**

Run: `npm run -w @shtepial/data-portal test`
Expected: FAIL — middleware.ts does not exist.

- [ ] **Step 7: Implement `data-portal/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getB2bUser } from "@/lib/b2b-user";

const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API key paths use a separate auth flow (see /api/v1/* routes).
  if (pathname.startsWith("/api/v1/")) return NextResponse.next();

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const b2bUser = await getB2bUser(data.user.id);
  if (!b2bUser) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|public/).*)"],
};
```

- [ ] **Step 8: Run test, expect pass**

Run: `npm run -w @shtepial/data-portal test`
Expected: all 4 middleware cases PASS.

- [ ] **Step 9: Commit**

```bash
git add data-portal/src/lib data-portal/middleware.ts data-portal/middleware.test.ts
git commit -m "$(cat <<'EOF'
feat(data-portal): Supabase auth + b2b_users middleware gate

Anonymous → /login redirect. Authenticated user not present in
b2b_users → 403 Forbidden. /login and /api/v1/* (API-key auth) are the
only routes accessible without a b2b session. Drizzle client uses
postgres-js with prepare:false (Supabase transaction pooler safe).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Login page + home redirect + dashboard UI

**Files:**
- Create: `data-portal/src/app/page.tsx`
- Create: `data-portal/src/app/login/page.tsx`
- Create: `data-portal/src/app/login/LoginForm.tsx`
- Create: `data-portal/src/app/dashboard/page.tsx`
- Create: `data-portal/src/app/dashboard/DashboardControls.tsx`
- Create: `data-portal/src/app/dashboard/PriceChart.tsx`

- [ ] **Step 1: Create `data-portal/src/app/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  redirect(data.user ? "/dashboard" : "/login");
}
```

- [ ] **Step 2: Create `data-portal/src/app/login/page.tsx`**

```tsx
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-sm border border-warmgray/20">
        <h1 className="text-2xl font-semibold mb-1 text-navy">ShtëpiAL Intel</h1>
        <p className="text-sm text-warmgray mb-6">Hyni në llogarinë tuaj.</p>
        <LoginForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create `data-portal/src/app/login/LoginForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email ose fjalëkalim i pasaktë.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="block text-sm mb-1">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-warmgray/30 rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="block text-sm mb-1">Fjalëkalimi</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-warmgray/30 rounded px-3 py-2"
        />
      </label>
      {error && <p className="text-terracotta text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-navy text-cream py-2 rounded hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Duke hyrë..." : "Hyni"}
      </button>
      <p className="text-xs text-warmgray text-center pt-2">
        Llogaritë krijohen vetëm me ftesë.
      </p>
    </form>
  );
}
```

- [ ] **Step 4: Create `data-portal/src/app/dashboard/page.tsx`**

```tsx
import { getDb } from "@/lib/db";
import { getPriceTrends, getMarketOverview, ALBANIAN_CITY_COORDS } from "@repo/analytics";
import DashboardControls from "./DashboardControls";
import PriceChart from "./PriceChart";

export const dynamic = "force-dynamic";

interface SearchParams {
  city?: string;
  tx?: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { city: rawCity = "", tx = "sale" } = await searchParams;
  const city = rawCity === "" ? null : rawCity;
  const transactionType = (tx === "rent" ? "rent" : "sale") as "sale" | "rent";

  const db = getDb();
  const [trend, overview] = await Promise.all([
    getPriceTrends(db, { city, transactionType, days: 180 }),
    getMarketOverview(db),
  ]);

  const cityList = Object.keys(ALBANIAN_CITY_COORDS);
  const cityMetrics = city ? overview.cities.find((c) => c.city === city) ?? null : null;

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-navy">Lëvizja e Çmimeve</h1>
        <p className="text-warmgray">Të dhëna ditore për tregun shqiptar të pasurive të paluajtshme.</p>
      </header>

      <DashboardControls cities={cityList} city={city} transactionType={transactionType} />

      <section className="mt-8 bg-white rounded-lg border border-warmgray/20 p-6">
        <h2 className="text-xl font-medium mb-4">
          {city ?? "Mesatare kombëtare"} — {transactionType === "sale" ? "Shitje" : "Qira"}
        </h2>
        {trend.points.length === 0 ? (
          <p className="text-warmgray py-12 text-center">
            Të dhëna të pamjaftueshme për këtë periudhë.
          </p>
        ) : (
          <PriceChart points={trend.points} />
        )}
      </section>

      {cityMetrics && (
        <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Çmim mesatar / m²" value={cityMetrics.avg_price_sqm} unit="€" />
          <Metric label="Mediana e çmimit" value={cityMetrics.median_price} unit="€" />
          <Metric label="Numri i listave" value={cityMetrics.total_listings} />
          <Metric label="Renta vjetore" value={cityMetrics.rent_yield} unit="%" />
        </section>
      )}
    </main>
  );
}

function Metric({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="bg-white rounded border border-warmgray/20 p-4">
      <p className="text-xs text-warmgray uppercase tracking-wide">{label}</p>
      <p className="text-xl font-medium text-navy mt-1">
        {value === null ? "—" : `${value.toLocaleString("sq-AL")}${unit ?? ""}`}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Create `data-portal/src/app/dashboard/DashboardControls.tsx`**

```tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function DashboardControls({
  cities,
  city,
  transactionType,
}: {
  cities: string[];
  city: string | null;
  transactionType: "sale" | "rent";
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    router.push(`/dashboard?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <label className="block">
        <span className="block text-xs text-warmgray mb-1">Qyteti</span>
        <select
          value={city ?? ""}
          onChange={(e) => setParam("city", e.target.value)}
          className="border border-warmgray/30 rounded px-3 py-2 bg-white"
        >
          <option value="">Të gjitha (mesatare kombëtare)</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-1 border border-warmgray/30 rounded overflow-hidden">
        <button
          onClick={() => setParam("tx", "sale")}
          className={`px-4 py-2 ${transactionType === "sale" ? "bg-navy text-cream" : "bg-white text-navy"}`}
        >
          Shitje
        </button>
        <button
          onClick={() => setParam("tx", "rent")}
          className={`px-4 py-2 ${transactionType === "rent" ? "bg-navy text-cream" : "bg-white text-navy"}`}
        >
          Qira
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `data-portal/src/app/dashboard/PriceChart.tsx`**

```tsx
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { TrendPoint } from "@repo/analytics";

export default function PriceChart({ points }: { points: TrendPoint[] }) {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#8B817822" />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => `€${v.toLocaleString("sq-AL")}`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(v: number) => [`€${Math.round(v).toLocaleString("sq-AL")} / m²`, "Mesatarja"]}
            labelFormatter={(label: string) => `Data: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="avgPriceSqmEur"
            stroke="#C75B39"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 7: Build and verify**

Run: `npm run -w @shtepial/data-portal build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add data-portal/src/app
git commit -m "$(cat <<'EOF'
feat(data-portal): login + dashboard with price-movement chart

/login: Supabase email+password form, no signup, Albanian copy.
/: redirects to /login or /dashboard based on session.
/dashboard: server component reads trends + overview, renders city
dropdown, sale/rent toggle, 180-day Recharts line chart of avg €/m²,
and a 4-tile metrics row.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: API v1 — `/api/v1/trends` and `/api/v1/cities`

**Files:**
- Create: `data-portal/src/lib/api-key-auth.ts`
- Create: `data-portal/src/app/api/v1/trends/route.ts`
- Create: `data-portal/src/app/api/v1/cities/route.ts`

- [ ] **Step 1: Create the API-key auth helper**

```ts
// data-portal/src/lib/api-key-auth.ts
import { sql } from "drizzle-orm";
import { getDb } from "./db";

export interface ApiKeyContext {
  keyId: string;
  ownerId: string;
  scope: string | null;
}

export async function authenticateApiKey(req: Request): Promise<ApiKeyContext | null> {
  const header = req.headers.get("x-api-key") ?? req.headers.get("authorization");
  if (!header) return null;
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : header;
  if (!token) return null;

  const db = getDb();
  if (!db) return null;

  const result: any = await db.execute(sql`
    SELECT id::text, owner_id::text, scope, revoked_at, expires_at
    FROM api_keys
    WHERE key_hash = encode(digest(${token}, 'sha256'), 'hex')
    LIMIT 1
  `);
  const row = (result.rows ?? result)[0];
  if (!row) return null;
  if (row.revoked_at) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
  return { keyId: row.id, ownerId: row.owner_id, scope: row.scope };
}
```

> **Note on hash function:** `digest(..., 'sha256')` requires the `pgcrypto` extension. If it isn't enabled in production, change the comparison to a plain `key = ${token}` against a plaintext column, or enable pgcrypto via `CREATE EXTENSION IF NOT EXISTS pgcrypto;`. Check migration 0013 to confirm which column shape was chosen — verify with: `grep -n "key_hash\|key_plaintext" web/src/lib/db/migrations/0013_add_api_keys.sql` before running.

- [ ] **Step 2: Create `/api/v1/trends/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { getPriceTrends } from "@repo/analytics";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const cityParam = url.searchParams.get("city");
  const tx = url.searchParams.get("transaction_type") === "rent" ? "rent" : "sale";
  const daysRaw = Number(url.searchParams.get("days") ?? 180);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 730 ? Math.floor(daysRaw) : 180;

  const trend = await getPriceTrends(getDb(), {
    city: cityParam && cityParam.length > 0 ? cityParam : null,
    transactionType: tx,
    days,
  });

  return NextResponse.json(trend, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
```

- [ ] **Step 3: Create `/api/v1/cities/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { getMarketOverview } from "@repo/analytics";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const overview = await getMarketOverview(getDb());
  return NextResponse.json(overview, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
```

- [ ] **Step 4: Build to verify**

Run: `npm run -w @shtepial/data-portal build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add data-portal/src/lib/api-key-auth.ts data-portal/src/app/api
git commit -m "$(cat <<'EOF'
feat(data-portal): API v1 — /trends and /cities, API-key authed

Both endpoints check x-api-key or Authorization: Bearer, hash-compare
against api_keys.key_hash (requires pgcrypto). Trend supports city,
transaction_type, days (1..730, default 180). Cache-Control:
s-maxage=300, stale-while-revalidate=600.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Remove leak surface from `web/`

**Files:**
- Delete: `web/src/app/data/` (entire directory)
- Delete: `web/src/app/api/analytics/` (entire directory)
- Delete: `web/src/lib/analytics/market.ts` (now in `@repo/analytics`)
- Search and remove: any nav/sitemap links to `/data`

- [ ] **Step 1: Find all references to `/data` in the public site**

Run: `grep -rn "/data" web/src --include="*.tsx" --include="*.ts" | grep -v "/api/" | grep -v node_modules`
Inspect each hit. Any literal href to `/data` or `/data/dashboard` in nav, footer, sitemap, JSON-LD, or metadata routes — delete or replace.

- [ ] **Step 2: Delete the routes and lib file**

```bash
rm -rf web/src/app/data
rm -rf web/src/app/api/analytics
rm -f web/src/lib/analytics/market.ts
rmdir web/src/lib/analytics 2>/dev/null || true
```

- [ ] **Step 3: Verify build still passes**

Run: `npm run -w @shtepial/web build`
Expected: build completes with no broken imports.

- [ ] **Step 4: Run web tests**

Run: `npm run -w @shtepial/web test -- --run`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(web): remove /data and /api/analytics public surface

The market analytics product now lives at the B2B data-portal app. The
public site no longer exposes /data, /data/dashboard, or
/api/analytics/*. The analytics computation library moved to
@repo/analytics in an earlier commit; web/src/lib/analytics/market.ts
is removed here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: End-to-end verification & rollout notes

**No files changed in this task — verification only. Update `docs/superpowers/specs/2026-05-16-market-intel-portal-design.md` "Status" header to "Implemented" once green.**

- [ ] **Step 1: Full repo build**

Run from root: `npm run build`
Expected: both `@shtepial/web` and `@shtepial/data-portal` build successfully.

- [ ] **Step 2: Full repo test**

Run: `npm run test`
Expected: every workspace's test suite passes.

- [ ] **Step 3: Production rollout checklist (manual, document only)**

Document the following in the PR description (do not execute here):

```
PRE-MERGE
- [ ] Run migration 0014 against Supabase prod (via your usual migration flow)
- [ ] CREATE EXTENSION IF NOT EXISTS pgcrypto;  (if api_keys uses key_hash)
- [ ] Verify CRON_SECRET is set on the web Vercel project
- [ ] Create new Vercel project "shtepial-intel", root directory: data-portal/
- [ ] Set env vars on intel project: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
- [ ] Attach domain (e.g. intel.shtepial.al) to the intel project

POST-MERGE
- [ ] Run backfill once: `npm run -w @shtepial/web backfill:snapshots`
      (against prod DATABASE_URL — use prod env)
- [ ] Insert your first b2b user manually:
      INSERT INTO b2b_users (user_id, organization, role, plan_slug)
      VALUES ('<auth-user-uuid>', 'Internal Test', 'admin', 'intel-dashboard');
- [ ] Verify https://intel.shtepial.al/login works
- [ ] Verify chart renders with backfilled data after login
- [ ] Verify https://shtepial.al/data returns 404 (route deleted)
- [ ] Verify daily cron fires the next morning (check Vercel cron logs)
- [ ] Issue a test API key, hit /api/v1/trends, verify JSON response
```

- [ ] **Step 4: Update spec status and commit**

Edit `docs/superpowers/specs/2026-05-16-market-intel-portal-design.md`:
Change `**Status:** Approved (high-level), pending spec review` to `**Status:** Implemented (pending production rollout)`.

```bash
git add docs/superpowers/specs/2026-05-16-market-intel-portal-design.md
git commit -m "$(cat <<'EOF'
docs(intel-portal): mark spec implemented

Implementation complete on feat/market-intel-portal. Production rollout
checklist documented in the implementation plan task 19.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

**Spec coverage check:** every section of the spec maps to a task:
- Monorepo conversion → Task 1
- `@repo/analytics` scaffold → Task 2-3
- `getCityFromCoords` → Task 4
- `market_snapshots` + `b2b_users` schema → Task 5-6
- Snapshot compute / persist / backfill / daily → Task 7-8
- `getPriceTrends` → Task 9
- `getMarketOverview` move → Task 10
- Cron route → Task 11-12
- Backfill script → Task 13
- `data-portal/` scaffold → Task 14
- Supabase auth + middleware → Task 15
- Login + dashboard UI → Task 16
- API v1 → Task 17
- Leak-surface removal → Task 18
- Verification + rollout → Task 19

**Known caveats baked into the plan:**
- API-key auth depends on the `pgcrypto` extension and the shape of `api_keys.key_hash`. Task 17 calls out to verify migration 0013 before running.
- Backfill assumes price stability for listings with no `price_history` entries — documented in spec.
- Nearest-centroid miscategorisation tolerated for v1 — documented in spec.
- Recharts is installed only in `data-portal/`; `web/` is untouched.
