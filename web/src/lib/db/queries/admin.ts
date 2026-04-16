import { eq, sql } from "drizzle-orm";
import { getDb } from "../drizzle";
import { profiles } from "../schema";

export async function getUserProfile(userId: string) {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId));

  return row ?? null;
}

export interface AdminStats {
  pending_count: number;
  active_user_listings: number;
  total_users: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const db = getDb();
  if (!db)
    return { pending_count: 0, active_user_listings: 0, total_users: 0 };

  const result = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM listings WHERE origin = 'user' AND status = 'pending')::int AS pending_count,
      (SELECT count(*) FROM listings WHERE origin = 'user' AND status = 'active')::int AS active_user_listings,
      (SELECT count(*) FROM profiles)::int AS total_users
  `);

  const row = (result as unknown as Record<string, unknown>[])[0] as {
    pending_count: number;
    active_user_listings: number;
    total_users: number;
  };

  return {
    pending_count: row.pending_count,
    active_user_listings: row.active_user_listings,
    total_users: row.total_users,
  };
}
