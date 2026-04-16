# Surgical Refactoring Agents — Design Spec

**Date:** 2026-04-16
**Branch:** `refactor/surgical-agents`
**Base:** `main` at `fd49a04`

## Goal

Identify and run the 5 best-matched existing agent types against the codebase's known hotspots to produce targeted refactoring recommendations, then apply them.

## Codebase Hotspots

| File | Lines | Problem |
|---|---|---|
| `web/src/lib/db/queries.ts` | 931 | God-module — 21 exports spanning listings, favorites, agencies, admin |
| `web/src/app/listings/page.tsx` | 768 | God-component — search, filters, map, pagination, sorting, skeletons |
| `web/src/lib/db/schema.ts` | 770 | Monolithic schema — 20+ tables, all enums in one file |
| `web/src/lib/types.ts` | 280 | All interfaces in a single file, no domain grouping |
| `web/src/app/api/webhooks/stripe/route.ts` | 663 | Single webhook handler with all Stripe event cases |
| `scrapy_project/shtepi/pipelines.py` | 810 | Monolith pipeline — validate + normalize + dedup + store |
| 13 Scrapy spiders | 280-445 each | Need adherence review against project conventions |

## Excluded From Scope

- `web/src/lib/valuation/seed.ts` (9310 lines) — data file, not logic
- `web/src/components/ListingForm.tsx` (549 lines) — single-purpose form, not a god-component
- Test files — no test refactoring in this pass
- Spider implementations — spider-reviewer reports only, does not modify

## Agent Mapping

### Phase 1: Diagnostic (read-only, all 4 run in parallel)

#### 1. `pr-review-toolkit:type-design-analyzer`

- **Target files:** `web/src/lib/db/schema.ts`, `web/src/lib/types.ts`
- **Questions to answer:**
  - Are `Listing`, `ListingFilters`, `MapPin` well-encapsulated with proper invariants?
  - Should schema split by domain (core, billing, ads, leads)?
  - Are there types that should be narrowed (e.g., `string` → union literals)?
  - Encapsulation and invariant expression ratings

#### 2. `pr-review-toolkit:silent-failure-hunter`

- **Target files:** `web/src/app/api/webhooks/stripe/route.ts`, `scrapy_project/shtepi/pipelines.py`
- **Questions to answer:**
  - Any catch blocks that swallow errors silently?
  - Any fallback behavior that hides data loss?
  - Inadequate error handling in webhook event dispatch?
  - Silent failures in pipeline validate/normalize/dedup/store stages?

#### 3. `feature-dev:code-architect`

- **Target files:** `web/src/lib/db/queries.ts`, `web/src/app/listings/page.tsx`
- **Questions to answer:**
  - How should the 21-export queries module split? Proposed domain modules?
  - Which sub-components should extract from the listings page?
  - Data flow between extracted components?
  - Proposed file tree after decomposition

#### 4. Custom `spider-reviewer` agent (via general-purpose with custom prompt from `.claude/agents/spider-reviewer.md`)

- **Target:** All 13 spider files in `scrapy_project/shtepi/spiders/`
- **Checks:** Albanian parsing, required fields, normalizer usage, boolean fields, pagination, test coverage
- **Output:** Findings by severity (Critical / Warning / Info)

### Phase 2: Refactor (sequential, writes code)

#### 5. `code-simplifier:code-simplifier`

- Runs after Phase 1 completes
- Targets files identified by Phase 1 findings
- Primary tasks informed by architect/analyzer reports:
  - Split `queries.ts` into domain modules
  - Extract components from `listings/page.tsx`
  - Split `schema.ts` by domain if type-design-analyzer recommends it
- Does NOT touch files where Phase 1 found no actionable issues

### Phase 3: Validate (read-only)

#### 6. `pr-review-toolkit:code-reviewer`

- Runs on all files changed in Phase 2
- Validates against CLAUDE.md project conventions
- Checks for regressions, style violations, broken imports

## Execution Order

```
Phase 1 (parallel)
├── type-design-analyzer  → schema.ts, types.ts
├── silent-failure-hunter → stripe/route.ts, pipelines.py
├── code-architect        → queries.ts, listings/page.tsx
└── spider-reviewer       → 13 spiders
         │
         ▼
    Review Phase 1 reports
    Synthesize findings into Phase 2 scope
         │
         ▼
Phase 2 (sequential)
└── code-simplifier → targeted files from Phase 1
         │
         ▼
Phase 3 (validation)
└── code-reviewer → all changed files
         │
         ▼
    Commit & ready for PR
```

## Commit Strategy

Each phase gets its own commit on `refactor/surgical-agents`:

1. `docs: add surgical refactoring agents spec` (this document)
2. Phase 2 refactoring changes (may be multiple commits if splitting is large)
3. Phase 3 fixes from code-reviewer findings

## Success Criteria

- No file over 400 lines in the refactored set (except data files)
- All 210 frontend tests still pass (`cd web && npx vitest run`)
- All 701 Python tests still pass (`cd scrapy_project && python -m pytest`)
- No new lint errors introduced
- `queries.ts` split into 3+ domain modules
- `listings/page.tsx` decomposed into parent + 2+ extracted components
- Spider reviewer findings documented (actionable items become follow-up tickets)
