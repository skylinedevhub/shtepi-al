# Codemaps

Navigable architecture maps for sub-systems of ShtëpiAL. Each codemap is keyed
to file paths and line numbers so a reader can jump from "what is this layer"
straight into the code.

## When to write one

After reviewing or building out a coherent slice of the platform (analytics,
billing, ad serving, scraping pipeline, valuation, etc.). Codemaps capture
*where things live and how they fit together* — they are not a substitute for
`CLAUDE.md` (project-wide conventions), `docs/plans/` (forward-looking design
documents), or in-code comments.

## Structure

One file per sub-system: `docs/codemaps/<area>.md`. Each codemap should cover:

1. **Purpose** — one paragraph on what this slice is for
2. **Files** — engine / API / UI / schema / external writers, each with
   `path:line` anchors
3. **Data flow** — how data moves from source to surface
4. **What's implemented** — concrete capabilities, observable behavior
5. **Gaps** — known missing pieces, with enough context that someone picking
   this up later can act on them
6. **Extension points** — where new functionality plugs in cleanly

Keep codemaps short. If a section grows past a screen, it probably wants its
own codemap or a plan in `docs/plans/`.

## Index

- [market-analytics.md](./market-analytics.md) — aggregated price/inventory
  insight surfaced through `/data/dashboard` and `/api/analytics/market`
