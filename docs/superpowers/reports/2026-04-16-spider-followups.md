# Spider Review Follow-ups

**Date:** 2026-04-16
**Source:** Phase 1 spider-reviewer report
**Status:** Actionable items for a future branch (not addressed in refactor/surgical-agents)

## Critical — Fix in next sprint

- [ ] **celesi: missing `price_period` field** — Add `item["price_period"] = "monthly" if item["transaction_type"] == "rent" else "total"` before yielding
- [ ] **njoftime: raw Albanian `transaction_type`** — Apply `normalize_transaction_type()` in `parse_thread` instead of storing raw "shitet"/"jepet me qira"
- [ ] **8 spiders return `"studio"` not in normalizer map** — Add `"studio": "apartment"` to `PROPERTY_TYPE_MAP` in normalizers.py (affects: century21, duashpi, futurehome, homezone, indomio, kerko360, propertyhub, realestate, shpi)

## Warning — Fix when touching these spiders

- [ ] **celesi: no MAX_PAGES guard** — Add `MAX_PAGES = 10` to prevent unbounded Playwright crawls
- [ ] **duashpi, njoftime, shpi: missing `poster_type`** — Default to `"private"` before yielding
- [ ] **century21, futurehome, homezone: dead EUR currency code** — Fix `_parse_price()` to detect ALL/Lek currency
- [ ] **mirlir: imports normalizers in spider** — Remove unused normalizer imports (double-normalization risk)
- [ ] **homezone: no `poster_type` default for private listings** — Add `item["poster_type"] = "private"` before agent check
