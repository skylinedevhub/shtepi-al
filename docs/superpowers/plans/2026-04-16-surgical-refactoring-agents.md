# Surgical Refactoring Agents — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run 5 targeted agent types against the codebase's known hotspots in 3 phases (diagnose → refactor → validate) to produce focused, high-signal improvements.

**Architecture:** Phase 1 dispatches 4 read-only diagnostic agents in parallel. Their reports are synthesized into a concrete scope for Phase 2, where code-simplifier applies the refactoring. Phase 3 runs code-reviewer on all changed files as a quality gate.

**Tech Stack:** Claude Code subagents (pr-review-toolkit, feature-dev, code-simplifier), Vitest (frontend tests), pytest (Python tests)

---

## File Map

### Files analyzed (read-only, Phase 1)

| File | Lines | Agent |
|---|---|---|
| `web/src/lib/db/schema.ts` | 770 | type-design-analyzer |
| `web/src/lib/types.ts` | 280 | type-design-analyzer |
| `web/src/app/api/webhooks/stripe/route.ts` | 663 | silent-failure-hunter |
| `scrapy_project/shtepi/pipelines.py` | 810 | silent-failure-hunter |
| `web/src/lib/db/queries.ts` | 931 | code-architect |
| `web/src/app/listings/page.tsx` | 768 | code-architect |
| `scrapy_project/shtepi/spiders/*.py` (13 files) | 280-445 each | spider-reviewer |

### Files modified (Phase 2 — exact list determined by Phase 1 findings)

Likely splits based on known hotspots:
- `web/src/lib/db/queries.ts` → `listing-queries.ts`, `favorite-queries.ts`, `agency-queries.ts`, `admin-queries.ts` + barrel `queries.ts`
- `web/src/app/listings/page.tsx` → extract `ListingsToolbar`, `ListingsGrid`, `ListingsPagination` into `web/src/app/listings/_components/`

### Files NOT touched

- `web/src/lib/valuation/seed.ts` (data, not logic)
- `web/src/components/ListingForm.tsx` (single-purpose)
- All test files
- Spider implementation files (report only)

---

### Task 1: Create branch and verify clean state

**Files:**
- None modified

- [ ] **Step 1: Verify branch exists and is clean**

```bash
git branch --show-current
# Expected: refactor/surgical-agents

git status --short
# Expected: clean (no unstaged changes except untracked dirs)
```

- [ ] **Step 2: Run frontend tests to establish baseline**

```bash
cd web && npx vitest run 2>&1 | tail -5
# Expected: ~210 tests pass, 0 failures
```

- [ ] **Step 3: Run Python tests to establish baseline**

```bash
cd scrapy_project && python3 -m pytest tests/test_normalizers.py tests/test_city_coords.py -v 2>&1 | tail -5
# Expected: 132 tests pass
```

---

### Task 2: Phase 1a — Dispatch type-design-analyzer agent

**Files:**
- Read: `web/src/lib/db/schema.ts`, `web/src/lib/types.ts`

- [ ] **Step 1: Dispatch the agent**

Use the `Agent` tool with `subagent_type: "pr-review-toolkit:type-design-analyzer"` and this prompt:

```
Analyze the type design quality of the ShtëpiAL real estate platform.

Target files:
1. web/src/lib/db/schema.ts (770 lines) — Drizzle ORM schema with 20+ tables and 10+ enums all in one file.
2. web/src/lib/types.ts (280 lines) — All frontend interfaces in a single file.

Key types to evaluate:
- Listing (42 fields, many nullable) — the core domain object
- ListingFilters (17 fields) — query parameter bag
- MapPin (11 fields) — lightweight map projection of Listing
- Plan, Subscription, Invoice, AdCampaign — billing domain
- DeveloperProject — projects domain
- PriceAlert, SavedSearch — buyer-plus domain

Questions to answer:
1. Encapsulation: Are invariants expressed in the types? (e.g., should transaction_type be "sale" | "rent" instead of string?)
2. Should schema.ts split by domain? Candidate domains: core (listings, profiles, agencies), billing (plans, subscriptions, invoices), ads (campaigns, impressions, clicks), leads (inquiries, lead_credits), projects, buyer-plus (alerts, saved_searches).
3. Are there types that use string where a union literal would be safer?
4. Does the Listing interface expose too many nullable fields that could be grouped?

Provide ratings for: encapsulation, invariant expression, usefulness, enforcement.
Report in under 500 words. Be specific — reference field names and line numbers.
```

- [ ] **Step 2: Save the agent's report**

Save the output to `docs/superpowers/reports/2026-04-16-type-design-report.md`.

---

### Task 3: Phase 1b — Dispatch silent-failure-hunter agent

**Files:**
- Read: `web/src/app/api/webhooks/stripe/route.ts`, `scrapy_project/shtepi/pipelines.py`

- [ ] **Step 1: Dispatch the agent**

Use the `Agent` tool with `subagent_type: "pr-review-toolkit:silent-failure-hunter"` and this prompt:

```
Hunt for silent failures in two critical data-path files in the ShtëpiAL real estate platform.

Target files:
1. web/src/app/api/webhooks/stripe/route.ts (663 lines) — Stripe webhook handler processing checkout.session.completed, customer.subscription.updated/deleted, and invoice events. This is the money path — a swallowed error here means lost subscription state.

2. scrapy_project/shtepi/pipelines.py (810 lines) — Scrapy pipeline chain: ValidationPipeline → NormalizationPipeline → GeocodeEnrichmentPipeline → DedupPipeline → PostgreSQLPipeline (+ SQLitePipeline fallback). This is the data ingestion path — a silent failure means lost listings.

What to look for:
- catch/except blocks that swallow errors without logging or re-raising
- Fallback behavior that hides data loss (e.g., returning empty instead of erroring)
- try/except with bare `except:` or `except Exception` that catch too broadly
- In the webhook: are unrecognized event types logged? Is signature verification failure visible?
- In the pipeline: does GeocodeEnrichmentPipeline fail silently on HTTP errors? Does DedupPipeline log when it drops items?
- Missing error responses — does the webhook always return 200 even on internal errors?

Report findings by severity: Critical / Warning / Info.
For each finding: file, line number range, what's wrong, suggested fix.
Report in under 600 words.
```

- [ ] **Step 2: Save the agent's report**

Save the output to `docs/superpowers/reports/2026-04-16-silent-failure-report.md`.

---

### Task 4: Phase 1c — Dispatch code-architect agent

**Files:**
- Read: `web/src/lib/db/queries.ts`, `web/src/app/listings/page.tsx`

- [ ] **Step 1: Dispatch the agent**

Use the `Agent` tool with `subagent_type: "feature-dev:code-architect"` and this prompt:

```
Design decomposition blueprints for two god-modules in the ShtëpiAL real estate platform.

TARGET 1: web/src/lib/db/queries.ts (931 lines, 21 exports)

This file contains ALL database queries for the entire application:
- Listing CRUD: getListings, getListingById, getListingByShortId, searchListings, getMapListings, getAllActiveListingSlugs, getNeighborhoods, getListingGroupInfo, getPriceHistory, getPendingListings, updateListingStatus
- Favorites: getUserFavorites, isFavorited, toggleFavorite, getUserFavoriteIds
- Agencies: getAgencies, getAgencyBySlug, getAgencyListings
- Admin: getAdminStats, getUserProfile
- Shared: dbRowToListing (row mapper), buildFilterConditions (filter builder)

All queries follow the same pattern: check if getDb() returns null, fall back to seed data if so.

Question: How should this split into domain modules? Propose file names, which exports go where, and how shared utilities (dbRowToListing, buildFilterConditions, seed fallback pattern) are handled. The current file is imported by 29 consumers.

TARGET 2: web/src/app/listings/page.tsx (768 lines, "use client")

This file contains the main listings search page with:
- ListingsContent (main component, ~650 lines): search params, fetch logic, filter state, map state, pagination, sorting, responsive breakpoint detection, bbox filtering, geolocation
- SkeletonCard, EmptyState, GridIcon, MapIcon (utility components)
- useIsDesktop (custom hook using useSyncExternalStore)
- SORT_OPTIONS constant

Question: What components should be extracted? Propose: file names (use _components/ convention for route-colocated components), props interfaces for each extracted component, data flow between them.

Constraints:
- Barrel re-export from queries.ts so existing 29 import sites don't break
- listings/page.tsx must remain "use client" — extracted components can be too
- Follow existing project patterns (Albanian UI text, brand palette, FilterSidebar/SearchBar/MapView already extracted)

Provide a proposed file tree and migration path. Report in under 600 words.
```

- [ ] **Step 2: Save the agent's report**

Save the output to `docs/superpowers/reports/2026-04-16-code-architect-report.md`.

---

### Task 5: Phase 1d — Dispatch spider-reviewer agent

**Files:**
- Read: All 13 spider files in `scrapy_project/shtepi/spiders/`

- [ ] **Step 1: Dispatch the agent**

Use the `Agent` tool with `subagent_type: "general-purpose"` and this prompt (the spider-reviewer is a custom agent definition, not a registered subagent type, so we use general-purpose with the full review criteria):

```
You are a specialized code reviewer for ShtëpiAL Scrapy spiders that scrape Albanian real estate sites.

Review ALL 13 spider files in scrapy_project/shtepi/spiders/ for correctness, completeness, and adherence to project patterns. The spiders are:
celesi, century21, duashpi, futurehome, homezone, indomio, kerko360, merrjep, mirlir, njoftime, propertyhub, realestate, shpi

For each spider, check:

1. Albanian-Specific Parsing:
   - Room config extraction: "2+1", "garsoniere" patterns via regex
   - Price handling: both EUR and ALL ("Lekë"/"LEK" = ALL)
   - Transaction type: "Shitet" → sale, "Jepet me qira/qera" → rent
   - Poster type: "Kompani" = agency, "Person fizik" = private

2. Required Fields (source, source_url, source_id, title, transaction_type)

3. Field Types:
   - price: float or None (never string)
   - area_sqm: float or None (use parse_area())
   - floor/total_floors: int or None (use parse_floor())
   - images: list of strings (never None)
   - price_period: "total" or "monthly" (never None)

4. Normalizer Usage — spiders should use shared normalizers from shtepi/normalizers.py:
   - parse_area(), parse_floor(), parse_price_text()
   - Do NOT normalize city or room_config in spider — pipeline does this

5. Pagination — MAX_PAGES set, meta propagates property_type and transaction_type

6. Test Coverage — check corresponding test_spider_{name}.py exists with required test cases

Also read scrapy_project/shtepi/normalizers.py and scrapy_project/shtepi/items.py for reference.

Output: Organize findings by severity (Critical / Warning / Info).
For each finding: spider name, line number, what's wrong, suggested fix.
Group findings that apply to multiple spiders.
Report in under 800 words. Focus on Critical and Warning — limit Info items to the top 5.
```

- [ ] **Step 2: Save the agent's report**

Save the output to `docs/superpowers/reports/2026-04-16-spider-review-report.md`.

---

### Task 6: Synthesize Phase 1 reports

**Files:**
- Read: All 4 reports from `docs/superpowers/reports/2026-04-16-*-report.md`

- [ ] **Step 1: Read all 4 Phase 1 reports**

Read each report file:
```
docs/superpowers/reports/2026-04-16-type-design-report.md
docs/superpowers/reports/2026-04-16-silent-failure-report.md
docs/superpowers/reports/2026-04-16-code-architect-report.md
docs/superpowers/reports/2026-04-16-spider-review-report.md
```

- [ ] **Step 2: Build Phase 2 scope document**

Create `docs/superpowers/reports/2026-04-16-phase2-scope.md` listing:

1. **Refactoring actions** — concrete file splits/extractions from code-architect report
2. **Type improvements** — union literal narrowing, domain grouping from type-design report
3. **Error handling fixes** — critical/warning items from silent-failure-hunter report
4. **Spider follow-ups** — critical items from spider review (these become TODOs, not Phase 2 work since we don't modify spiders)

Each action should specify: source file, target file(s), what moves, what stays.

- [ ] **Step 3: Commit Phase 1 reports**

```bash
git add docs/superpowers/reports/
git commit -m "docs: Phase 1 diagnostic agent reports

Reports from 4 parallel diagnostic agents:
- type-design-analyzer: schema.ts + types.ts quality audit
- silent-failure-hunter: stripe webhook + pipeline error handling
- code-architect: queries.ts + listings page decomposition blueprint
- spider-reviewer: 13 spider adherence review

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Phase 2 — Run code-simplifier on queries.ts

**Files:**
- Modify: `web/src/lib/db/queries.ts` (split into domain modules)
- Create: domain module files as recommended by code-architect report

- [ ] **Step 1: Dispatch code-simplifier agent**

Use the `Agent` tool with `subagent_type: "code-simplifier:code-simplifier"` and a prompt that:

1. References the code-architect report's proposed split for queries.ts
2. Specifies the exact exports that move to each new file
3. Requires a barrel re-export in `queries.ts` so existing 29 import sites don't break
4. Requires `dbRowToListing` and `buildFilterConditions` to move to a shared `query-utils.ts`

The exact prompt depends on Task 6 synthesis — the code-architect report will propose the file names and groupings. Use those, not a guess.

- [ ] **Step 2: Verify no import breakage**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
# Expected: no errors (barrel re-export keeps all imports valid)
```

- [ ] **Step 3: Run frontend tests**

```bash
cd web && npx vitest run 2>&1 | tail -10
# Expected: ~210 tests pass, 0 failures
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/db/
git commit -m "refactor: split queries.ts into domain modules

Split 931-line god-module into focused domain files:
- listing-queries.ts: listing CRUD, search, map pins
- favorite-queries.ts: favorites toggle, check, list
- agency-queries.ts: agency list, detail, listings
- admin-queries.ts: admin stats, pending, moderation
- query-utils.ts: shared dbRowToListing, buildFilterConditions
Barrel re-export from queries.ts preserves all 29 import sites.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Phase 2 — Run code-simplifier on listings/page.tsx

**Files:**
- Modify: `web/src/app/listings/page.tsx` (extract components)
- Create: component files in `web/src/app/listings/_components/`

- [ ] **Step 1: Dispatch code-simplifier agent**

Use the `Agent` tool with `subagent_type: "code-simplifier:code-simplifier"` and a prompt that:

1. References the code-architect report's proposed extraction for listings/page.tsx
2. Specifies which components extract and their props interfaces
3. All extracted components are "use client"
4. Albanian UI text stays in place (no i18n extraction)
5. SORT_OPTIONS, SkeletonCard, EmptyState, GridIcon, MapIcon, useIsDesktop move to extracted files

The exact prompt depends on Task 6 synthesis.

- [ ] **Step 2: Verify no import breakage**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
# Expected: no errors
```

- [ ] **Step 3: Run frontend tests**

```bash
cd web && npx vitest run 2>&1 | tail -10
# Expected: ~210 tests pass, 0 failures
```

- [ ] **Step 4: Commit**

```bash
git add web/src/app/listings/
git commit -m "refactor: extract components from listings page

Decompose 768-line god-component into focused pieces:
- _components/ListingsToolbar.tsx: sort, view toggle, result count
- _components/ListingsGrid.tsx: grid + skeleton + empty state
- _components/ListingsPagination.tsx: load more button
- _components/use-is-desktop.ts: responsive breakpoint hook
Parent page.tsx now orchestrates state and delegates rendering.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Phase 2 — Apply silent-failure fixes

**Files:**
- Modify: `web/src/app/api/webhooks/stripe/route.ts`
- Modify: `scrapy_project/shtepi/pipelines.py` (only if Critical findings)

- [ ] **Step 1: Apply Critical and Warning fixes from silent-failure-hunter report**

For each Critical/Warning finding in the report:
- Fix the specific error handling issue at the referenced line
- Do NOT restructure the file — only fix the error handling

Common fixes expected:
- Add logging to bare catch blocks
- Return appropriate HTTP status codes instead of always 200
- Add error logging to pipeline stages that catch broadly

- [ ] **Step 2: Run frontend tests**

```bash
cd web && npx vitest run 2>&1 | tail -10
# Expected: ~210 tests pass, 0 failures
```

- [ ] **Step 3: Run Python tests (if pipelines.py was modified)**

```bash
cd scrapy_project && python3 -m pytest tests/test_normalizers.py tests/test_city_coords.py -v 2>&1 | tail -5
# Expected: 132 tests pass
```

- [ ] **Step 4: Commit**

```bash
git add web/src/app/api/webhooks/stripe/route.ts scrapy_project/shtepi/pipelines.py
git commit -m "fix: address silent failure findings in webhook and pipeline

Fix error handling issues identified by silent-failure-hunter:
- [specific fixes listed based on report findings]

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Phase 3 — Run code-reviewer validation

**Files:**
- Read: All files changed in Tasks 7-9

- [ ] **Step 1: Get list of changed files**

```bash
git diff --name-only main...HEAD
```

- [ ] **Step 2: Dispatch code-reviewer agent**

Use the `Agent` tool with `subagent_type: "pr-review-toolkit:code-reviewer"` and this prompt:

```
Review the unstaged and staged changes on the refactor/surgical-agents branch for adherence to the ShtëpiAL project guidelines in CLAUDE.md.

Focus on:
1. All UI text must be in Albanian
2. All new mutation endpoints must include validateCsrf(), rate limiter, auth check
3. parseNumericParam() used for all numeric query params (never raw Number())
4. CITIES/QUICK_CITIES constants used (never hardcoded city arrays)
5. No jest-dom matchers (use toBeTruthy() etc.)
6. No import breakage — all barrel re-exports must cover prior consumers
7. Brand palette colors used correctly (navy, cream, terracotta, gold, warm-gray)

Run: git diff main...HEAD
Review every changed file. Report issues by severity.
```

- [ ] **Step 3: Fix any Critical/Warning issues found**

Apply fixes for any issues the reviewer identifies.

- [ ] **Step 4: Run full test suite one final time**

```bash
cd web && npx vitest run 2>&1 | tail -10
cd scrapy_project && python3 -m pytest tests/test_normalizers.py tests/test_city_coords.py -v 2>&1 | tail -5
```

Both must pass with 0 failures.

- [ ] **Step 5: Final commit (if fixes were needed)**

```bash
git add -A
git commit -m "fix: address code-reviewer findings

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Verify success criteria

- [ ] **Step 1: Check file sizes**

```bash
wc -l web/src/lib/db/queries.ts web/src/lib/db/listing-queries.ts web/src/lib/db/favorite-queries.ts web/src/lib/db/agency-queries.ts web/src/lib/db/admin-queries.ts web/src/app/listings/page.tsx
```

No file should exceed 400 lines (except data files and unchanged files).

- [ ] **Step 2: Verify queries.ts split into 3+ modules**

```bash
ls web/src/lib/db/*-queries.ts | wc -l
# Expected: 3 or more
```

- [ ] **Step 3: Verify listings page decomposition**

```bash
ls web/src/app/listings/_components/
# Expected: 2+ component files
```

- [ ] **Step 4: Verify all tests pass**

```bash
cd web && npx vitest run 2>&1 | tail -5
cd scrapy_project && python3 -m pytest tests/test_normalizers.py tests/test_city_coords.py -v 2>&1 | tail -5
```

- [ ] **Step 5: Summarize spider-reviewer findings as follow-up TODOs**

Create `docs/superpowers/reports/2026-04-16-spider-followups.md` with Critical/Warning findings from the spider review as actionable items for a future branch.

- [ ] **Step 6: Final commit**

```bash
git add docs/
git commit -m "docs: add spider review follow-up TODOs and verify success criteria

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Execution Notes

- **Tasks 2-5 run in parallel** — they are all Phase 1 diagnostic agents with no dependencies between them. Dispatch all 4 agents in a single message.
- **Task 6 depends on Tasks 2-5** — must wait for all reports before synthesizing.
- **Tasks 7-9 are sequential** — each modifies different files but code-simplifier should run one at a time.
- **Task 10 depends on Tasks 7-9** — reviews all changes from Phase 2.
- **Task 11 depends on Task 10** — final verification.
