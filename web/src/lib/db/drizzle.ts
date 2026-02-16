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
