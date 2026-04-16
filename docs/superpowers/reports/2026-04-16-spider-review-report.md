# Spider Reviewer Report

**Date:** 2026-04-16
**Files analyzed:** All 13 spiders in `scrapy_project/shtepi/spiders/`

## CRITICAL

### C1. `celesi` — missing `price_period` field (line 117-230)
Never sets `item["price_period"]`. Required to be "total" or "monthly", never None. Every other spider sets it.
**Fix:** Add `item["price_period"] = "monthly" if item["transaction_type"] == "rent" else "total"` before yielding.

### C2. `njoftime` — `transaction_type` from title regex not normalized (line 195-198)
Stores raw Albanian text like `"shitet"` or `"jepet me qira"` rather than canonical `"sale"`/`"rent"`. Pipeline's `normalize_transaction_type()` catches this, but `ValidationPipeline` runs first — if any downstream code before normalization compares `== "rent"`, it would fail.
**Fix:** Apply `normalize_transaction_type()` to `parsed.get("transaction_type")` in `parse_thread`.

### C3. Multiple spiders return `"studio"` as property_type — not in normalizer map
Eight spiders return `"studio"` from `_detect_property_type()`. `PROPERTY_TYPE_MAP` in `normalizers.py` has no mapping for `"studio"` — falls through to default `"apartment"` silently.
**Affected:** century21, duashpi, futurehome, homezone, indomio, kerko360, propertyhub, realestate, shpi
**Fix:** Add `"studio": "apartment"` to `PROPERTY_TYPE_MAP` in normalizers.py.

## WARNING

### W1. `celesi` — no pagination limit / MAX_PAGES guard (line 99-115)
Follows all pagination links without limit. Uses Playwright with 2s delay, making it especially slow.
**Fix:** Add `MAX_PAGES = 10` guard.

### W2. `duashpi`, `njoftime`, `shpi` — missing `poster_type` field
Never set `item["poster_type"]`. Should default to `"private"`.

### W3. `century21`, `futurehome`, `homezone` — `_parse_price()` hardcodes EUR
Dead code condition: `currency = "EUR" if "€" in text else "EUR"`. No ALL (Lek) detection.
**Fix:** Add proper ALL detection: `elif "Lek" in text: currency = "ALL"`.

### W4. `mirlir` — imports normalizers in spider (line 24-31)
Per CLAUDE.md: "Do NOT normalize city or room_config in spider — pipeline does this." Creates double-normalization risk.
**Fix:** Remove unused normalizer imports.

### W5. `homezone` — no `poster_type` default for non-agent listings (line 160-169)
`poster_type` only set when agent name found. Private listings get no `poster_type`.
**Fix:** Add `item["poster_type"] = "private"` as default.

## INFO

1. Only `merrjep` implements `MAX_PAGES` with `from_crawler` override. Others rely on `CLOSESPIDER_TIMEOUT`.
2. `celesi` and `njoftime` set `item["is_active"] = True` explicitly; others don't.
3. `realestate` spider only crawls Tirana categories (by design — single agency).
4. `mirlir` imports `urljoin` from `urllib.parse` but uses `response.urljoin()` everywhere — unused import.
5. All 13 spiders have corresponding test files — full test coverage at file level confirmed.
