# Silent Failure Hunter Report

**Date:** 2026-04-16
**Files analyzed:** `web/src/app/api/webhooks/stripe/route.ts`, `scrapy_project/shtepi/pipelines.py`

## CRITICAL

### 1. Webhook returns 200 on all processing errors -- Stripe never retries
**File:** `stripe/route.ts:611-660`
Outer try/catch catches every exception from every handler, logs it, then returns `json(200, { received: true })`. If the database is momentarily unreachable, a checkout.session.completed event is swallowed permanently. The customer paid but gets no access.
**Fix:** Distinguish transient errors (DB connection, timeout) from permanent errors (bad data). Return 500 for transient so Stripe retries. Return 200 only for permanent/idempotent failures.

### 2. Silent `getDb()` null returns discard paid events with no trace
**File:** `stripe/route.ts:83-84, 183-184, 275-276, 348-349, 388-389, 492-493`
Every handler starts with `if (!db) return;` -- bare return with zero logging. If `DATABASE_URL` is unset or pool is exhausted, all webhook events silently succeed (200) while doing nothing.
**Fix:** Log an error with event type and ID, then return 500 so Stripe retries.

### 3. GeocodingPipeline bare `except Exception` swallows all errors silently
**File:** `pipelines.py:182-184`
Catches `ConnectionError`, `Timeout`, `JSONDecodeError`, `KeyError`, `ValueError`, and any other exception without logging anything. Permanently caches failures as `None`.
**Fix:** Log at WARNING level. Catch only `requests.RequestException` and `(KeyError, ValueError)` separately.

### 4. GeocodingPipeline non-200 HTTP responses silently cached as None
**File:** `pipelines.py:172-179`
When Nominatim returns 429 (rate limited) or 503, response is silently cached as `None`, permanently preventing geocoding for that address.
**Fix:** Log non-200 status codes. Do not cache 429/5xx responses.

## WARNING

### 5. PostgreSQLPipeline reconnect swallows close() errors silently
**File:** `pipelines.py:428-430`
Bare `except Exception: pass` during reconnect.
**Fix:** Log at DEBUG level before passing.

### 6. PostgreSQLPipeline connection-check swallows errors without logging
**File:** `pipelines.py:438-444`
`SELECT 1` health check catches all exceptions to trigger reconnect, but does not log what failed.
**Fix:** Log the connection error. Wrap full flush in try/except that preserves buffer on failure.

### 7. `_maybe_log_price_change` catches all exceptions, masks DB schema errors
**File:** `pipelines.py:634-635`
Broad `except Exception` with only a warning log means a missing `price_history` table is silently downgraded.
**Fix:** Catch only `psycopg2.Error`. Let programming errors propagate.

### 8. `_cross_source_dedup` connection check is a silent bare except
**File:** `pipelines.py:688-690`
Same pattern as finding 6.

## INFO

### 9. Unhandled webhook event types only get `console.log`, not `console.warn`
**File:** `stripe/route.ts:649`
**Fix:** Use `console.warn` so it surfaces in error monitoring.

### 10. DedupPipeline drops items without logging which item was dropped
**File:** `pipelines.py:196`
**Fix:** Add `logger.debug` call with item details.

## Summary

The two most dangerous patterns: (1) webhook always returning 200 even when DB writes fail — paid customers silently lose subscription state with no retry; (2) geocoding pipeline's bare `except Exception` that permanently caches failures without any log output.
