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
