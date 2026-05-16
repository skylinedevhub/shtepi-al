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

  // api_keys schema (migration 0013):
  //   id UUID, user_id UUID, key_hash TEXT, key_prefix VARCHAR(12),
  //   name, scopes JSONB, rate_limit_per_minute, last_used_at,
  //   is_active BOOLEAN, created_at, expires_at
  // Tokens are stored as SHA-256 hex digests via pgcrypto (gen_random_uuid()
  // is already in widespread use → pgcrypto is enabled).
  const result: any = await db.execute(sql`
    SELECT
      id::text AS id,
      user_id::text AS user_id,
      scopes,
      is_active,
      expires_at
    FROM api_keys
    WHERE key_hash = encode(digest(${token}, 'sha256'), 'hex')
    LIMIT 1
  `);
  const row = (result.rows ?? result)[0];
  if (!row) return null;
  if (row.is_active === false) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;

  // scopes is a JSONB array; surface it as a comma-joined string for the
  // ApiKeyContext.scope contract. null when empty/missing.
  let scope: string | null = null;
  const raw = row.scopes;
  if (Array.isArray(raw) && raw.length > 0) {
    scope = raw.join(",");
  } else if (typeof raw === "string" && raw.length > 0) {
    scope = raw;
  }

  return { keyId: row.id, ownerId: row.user_id, scope };
}
