# Crawl: Run production spiders against Neon PostgreSQL

Run the 4 production spiders (merrjep, mirlir, njoftime, duashpi) to scrape real estate listings into the Neon PostgreSQL database.

## Prerequisites

- `DATABASE_URL` must be set in the environment (Neon PostgreSQL connection string)
- `psycopg2-binary` must be installed in the Python environment (`pip install -r scrapy_project/requirements.txt`)

## Steps

1. Verify DATABASE_URL is available. If not set, check for it in `web/.env.local` and read it from there. If still not found, ask the user to provide it.

2. Verify dependencies are installed:
   ```
   cd scrapy_project && pip install -r requirements.txt
   ```

3. Run each spider sequentially, reporting results after each:
   ```
   DATABASE_URL="$DATABASE_URL" scrapy crawl merrjep
   DATABASE_URL="$DATABASE_URL" scrapy crawl mirlir
   DATABASE_URL="$DATABASE_URL" scrapy crawl njoftime
   DATABASE_URL="$DATABASE_URL" scrapy crawl duashpi
   ```

   **Do NOT run celesi** — it's blocked by Cloudflare and needs Playwright integration.

4. After all spiders complete, report a summary:
   - Items scraped per spider
   - Any errors or dropped items
   - Total new + updated listings

5. Optionally, if the user passes `$ARGUMENTS` containing a specific spider name (e.g., `/crawl merrjep`), run only that spider instead of all four.

## Spider Reference

| Spider | Domain | Expected Listings |
|--------|--------|-------------------|
| merrjep | merrjep.al | ~20 per run |
| mirlir | mirlir.com | ~20 per run |
| njoftime | njoftime.com | ~15 per run |
| duashpi | duashpi.al | ~18 per run |

## Notes

- The pipeline chain is: Validate → Normalize → Dedup → PostgreSQLPipeline
- Upserts are safe — re-running updates existing listings (matched by source + source_id) and inserts new ones
- Boolean fields (has_elevator, etc.) are cast via `_to_bool()` for PostgreSQL compatibility
- Each spider respects `CONCURRENT_REQUESTS_PER_DOMAIN = 2` for politeness
