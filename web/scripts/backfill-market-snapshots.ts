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
