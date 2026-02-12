import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

function createDb() {
  if (!DATABASE_URL) return null;
  const sql = neon(DATABASE_URL, { fetchOptions: { cache: "no-store" } });
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (_db === undefined) {
    _db = createDb();
  }
  return _db;
}

export type DrizzleDb = NonNullable<ReturnType<typeof createDb>>;
