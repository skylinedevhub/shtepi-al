import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Performance indexes", () => {
  const migrationPath = resolve(
    __dirname,
    "../migrations/0002_add_performance_indexes.sql"
  );

  it("migration file exists", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toBeDefined();
  });

  it("creates partial index on is_active for city queries", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("idx_listings_active_city");
    expect(sql).toContain("WHERE is_active = true");
  });

  it("creates partial index for transaction_type + first_seen", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("idx_listings_active_transaction_date");
  });

  it("creates geo index for latitude/longitude", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("idx_listings_geo");
    expect(sql).toContain("latitude");
    expect(sql).toContain("longitude");
  });

  it("creates index for short-id prefix lookup", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("idx_listings_id_text_pattern");
  });
});
