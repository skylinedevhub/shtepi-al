# Supabase Migration Design

**Date:** 2026-02-13
**Goal:** Migrate from Neon PostgreSQL + NextAuth + Vercel Blob to full Supabase platform (DB + Auth + Storage + RLS) for handoff to Supabase-native backend team.
**Approach:** Keep Drizzle ORM for typed queries, use Supabase SDK for Auth and Storage.

---

## Current Architecture

| Component | Current | Target |
|-----------|---------|--------|
| Database | Neon PostgreSQL (HTTP driver) | Supabase PostgreSQL (postgres-js driver) |
| ORM | Drizzle ORM | Drizzle ORM (unchanged) |
| Auth | NextAuth v5 (JWT, Credentials + Google) | Supabase Auth (email/password + Google OAuth) |
| Storage | Vercel Blob | Supabase Storage |
| Access Control | Server-side checks only | Row Level Security (RLS) |
| Scrapy Pipeline | psycopg2 → Neon | psycopg2 → Supabase (service_role) |

## 1. Database Connection Layer

### Changes
- Remove `@neondatabase/serverless`
- Add `postgres` (pg driver)
- Swap `drizzle-orm/neon-http` to `drizzle-orm/postgres-js`

### `web/src/lib/db/drizzle.ts`
```typescript
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

function createDb() {
  if (!DATABASE_URL) return null;
  // prepare: false required for Supabase connection pooler (Transaction mode)
  const client = postgres(DATABASE_URL, { prepare: false });
  return drizzle(client, { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (_db === undefined) {
    _db = createDb();
  }
  return _db;
}

export type DrizzleDb = NonNullable<ReturnType<typeof createDb>>;
```

### `web/drizzle.config.ts`
No changes needed. Already uses `DATABASE_URL` with `dialect: "postgresql"`.

### Scrapy Pipeline
No code changes. `psycopg2` connects via standard PostgreSQL protocol. Only the `DATABASE_URL` value changes to Supabase's connection string. Use the **direct connection** (not pooler) for long-running spider sessions.

### Schema
`web/src/lib/db/schema.ts` uses pure `drizzle-orm/pg-core` — fully portable, no Neon-specific types. All 7 tables, 3 enums, 8 indexes (including partial unique) transfer as-is.

---

## 2. Auth Migration (NextAuth → Supabase Auth)

### Files Removed
- `web/src/lib/auth.ts` — NextAuth config with bcrypt + Credentials
- `web/src/lib/auth.config.ts` — Edge-safe auth config
- `web/src/app/api/auth/[...nextauth]/route.ts` — NextAuth API route

### Files Created
| File | Purpose |
|------|---------|
| `web/src/lib/supabase/server.ts` | Server-side Supabase client (cookie-based sessions) |
| `web/src/lib/supabase/client.ts` | Browser-side Supabase client |
| `web/src/lib/supabase/middleware.ts` | Session refresh helper for middleware |
| `web/src/app/auth/callback/route.ts` | OAuth callback handler |

### Schema Changes
Supabase Auth manages users in `auth.users` (protected schema). App-specific fields move to a `public.profiles` table:

```sql
-- Profiles table (replaces NextAuth users table)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  image TEXT,
  role user_role DEFAULT 'user',
  phone VARCHAR(50),
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, image)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Tables Removed from Drizzle Schema
- `accounts` — Supabase manages OAuth providers internally
- `sessions` — Supabase manages sessions internally
- `verificationTokens` — Supabase handles email verification
- `users` — Renamed to `profiles` (linked to `auth.users`)

### Auth Providers
- **Email/password**: Supabase's built-in email auth (no bcrypt — Supabase hashes internally)
- **Google OAuth**: Configure in Supabase Dashboard (Settings > Auth > Providers > Google)

### Middleware
```typescript
// web/src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Refresh session cookie on every request
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  await supabase.auth.getUser();
  return supabaseResponse;
}
```

---

## 3. Storage Migration (Vercel Blob → Supabase Storage)

### Bucket Setup
- Bucket name: `listing-images` (public)
- Path pattern: `{userId}/{listingId}/{filename}`
- Created via Supabase Dashboard or SQL migration

### Upload API Route
Replace Vercel Blob upload with Supabase Storage:

```typescript
// Simplified example
const supabase = createClient(url, serviceRoleKey);
const { data, error } = await supabase.storage
  .from("listing-images")
  .upload(`${userId}/${listingId}/${filename}`, file, {
    contentType: file.type,
    upsert: false,
  });
const publicUrl = supabase.storage
  .from("listing-images")
  .getPublicUrl(data.path).data.publicUrl;
```

### Image URL Changes
- Scraped images: **Unchanged** (external domain URLs)
- User uploads: `*.public.blob.vercel-storage.com` → `{project-ref}.supabase.co/storage/v1/object/public/listing-images/...`
- Update `next.config.mjs` remotePatterns accordingly

### `listingImages` Table
Unchanged in Drizzle. Stores new Supabase Storage URLs instead of Vercel Blob URLs. `blobPath` column maps naturally to Supabase storage paths.

---

## 4. Row Level Security (RLS)

### Policies

```sql
-- Enable RLS on all tables
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

-- Listings: public read for active
CREATE POLICY "Anyone can read active listings"
  ON listings FOR SELECT
  USING (is_active = true);

-- Listings: authenticated users can create their own
CREATE POLICY "Users can create own listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = user_id AND origin = 'user');

-- Listings: users can update their own
CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = user_id);

-- Profiles: public read
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

-- Profiles: users update own
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Favorites: users manage own
CREATE POLICY "Users manage own favorites"
  ON favorites FOR ALL
  USING (auth.uid() = user_id);

-- Agencies: public read
CREATE POLICY "Anyone can read agencies"
  ON agencies FOR SELECT
  USING (true);

-- Listing images: public read
CREATE POLICY "Anyone can read listing images"
  ON listing_images FOR SELECT
  USING (true);

-- Listing images: owner can manage
CREATE POLICY "Owner can manage listing images"
  ON listing_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.user_id = auth.uid()
    )
  );
```

### Server-side Access
- **Drizzle queries** (Next.js server): Use `service_role` key (bypasses RLS). Server components are trusted.
- **Scrapy pipeline**: Use direct connection with service_role credentials (bypasses RLS for scraped inserts).
- **Client-side** (future): `anon` key + RLS policies enforce access control.

---

## 5. Environment Variables

| Current | New | Notes |
|---------|-----|-------|
| `DATABASE_URL` (Neon) | `DATABASE_URL` (Supabase pooler) | Same name, new value |
| `NEXTAUTH_URL` | *removed* | |
| `NEXTAUTH_SECRET` | *removed* | |
| `GOOGLE_CLIENT_ID` | *configured in Supabase Dashboard* | |
| `GOOGLE_CLIENT_SECRET` | *configured in Supabase Dashboard* | |
| `BLOB_READ_WRITE_TOKEN` | *removed* | |
| — | `NEXT_PUBLIC_SUPABASE_URL` | **New** |
| — | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **New** |
| — | `SUPABASE_SERVICE_ROLE_KEY` | **New** (server-only) |

**Net: 5 vars → 3 vars.**

---

## 6. Package Changes

### Remove
```
@neondatabase/serverless
@auth/drizzle-adapter
next-auth
bcryptjs
@types/bcryptjs
```

### Add
```
@supabase/supabase-js
@supabase/ssr
postgres
```

### Keep
```
drizzle-orm (swap driver: neon-http → postgres-js)
drizzle-kit
```

---

## 7. File Changes Summary

| Action | File | What |
|--------|------|------|
| Modify | `web/src/lib/db/drizzle.ts` | Swap Neon → postgres-js driver |
| Modify | `web/src/lib/db/schema.ts` | Rename `users` → `profiles`, remove auth tables |
| Modify | `web/src/lib/db/queries.ts` | Update user-related queries |
| Delete | `web/src/lib/auth.ts` | Replaced by Supabase client |
| Delete | `web/src/lib/auth.config.ts` | No longer needed |
| Create | `web/src/lib/supabase/server.ts` | Server-side Supabase client |
| Create | `web/src/lib/supabase/client.ts` | Browser-side Supabase client |
| Create | `web/src/lib/supabase/middleware.ts` | Session refresh helper |
| Modify | `web/src/middleware.ts` | Use Supabase middleware |
| Delete | `web/src/app/api/auth/[...nextauth]/route.ts` | NextAuth route removed |
| Create | `web/src/app/auth/callback/route.ts` | Supabase OAuth callback |
| Modify | `web/src/app/api/upload/route.ts` | Vercel Blob → Supabase Storage |
| Modify | `web/next.config.mjs` | Update image domains |
| Modify | `web/package.json` | Remove/add packages |
| Modify | `web/.env.example` | New env var names |
| Create | SQL migration | RLS + profiles trigger + storage bucket |
| Modify | Auth components | `signIn`/`signOut`/`useSession` → Supabase methods |
| No change | `scrapy_project/shtepi/pipelines.py` | Just needs new DATABASE_URL |
| No change | `web/src/lib/db/seed.ts` | Fallback unchanged |
| No change | `web/data/seed-listings.json` | Seed data unchanged |

---

## 8. Data Migration Strategy

1. Create Supabase project
2. Run Drizzle schema push (`drizzle-kit push`) against Supabase
3. Apply RLS policies + profiles trigger via SQL migration
4. Export Neon data: `pg_dump` from Neon
5. Import to Supabase: `psql` or Supabase Dashboard SQL editor
6. Verify listing counts match
7. Run spider test crawl against Supabase
8. Update Vercel env vars
9. Deploy and verify

---

## 9. Tooling

| Tool | Type | Install | Purpose |
|------|------|---------|---------|
| Supabase Plugin | Claude Code Plugin | `/plugin install supabase` | 20+ tools: SQL, migrations, logs, types |
| context7 | MCP Server | *already installed* | SDK docs lookup |
| Playwright | MCP Server | *already installed* | E2E testing auth flows |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Auth session format changes | Test login/logout/OAuth flow end-to-end before deploy |
| Existing user data in Neon | Manual migration of users into `auth.users` via Supabase Admin API |
| Storage URL format change | Only affects user-uploaded images (few/none in prod currently) |
| RLS misconfiguration | Test with both anon and service_role keys before enabling |
| Scrapy connection string | Test psycopg2 with Supabase direct connection (port 5432, not pooler 6543) |
| Seed fallback | Unchanged — works when DATABASE_URL is missing |
