# Mobile Responsiveness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all mobile UI issues so ShtëpiAL is fully responsive across phones (320px+), tablets, and desktop.

**Architecture:** Targeted Tailwind CSS utility changes only — no new components, no structural rewrites. Each task is a single file edit.

**Tech Stack:** Next.js 14, Tailwind CSS, existing component library

---

### Task 1: Safe area CSS support

**Files:**
- Modify: `web/src/app/globals.css`

**Step 1: Add safe area viewport support to globals.css**

At the end of `globals.css` (after the Leaflet overrides at line ~102), add:

```css
/* Safe area for notch phones */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

**Step 2: Verify build**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add web/src/app/globals.css
git commit -m "feat: add safe area CSS utility for notch phones"
```

---

### Task 2: Homepage hero mobile sizing

**Files:**
- Modify: `web/src/app/page.tsx`

**Step 1: Fix hero heading size**

In `web/src/app/page.tsx`, line 35, change:
```
text-5xl font-bold tracking-tight text-navy md:text-7xl
```
to:
```
text-3xl font-bold tracking-tight text-navy sm:text-5xl md:text-7xl
```

**Step 2: Fix hero vertical padding**

Line 27, change the section className:
```
flex flex-1 flex-col items-center justify-center px-4 py-28
```
to:
```
flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-28
```

**Step 3: Fix subtitle bottom margin**

Line 38, change:
```
mb-10 max-w-xl text-center text-lg leading-relaxed text-warm-gray
```
to:
```
mb-6 max-w-xl text-center text-base leading-relaxed text-warm-gray sm:mb-10 sm:text-lg
```

**Step 4: Verify build**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "feat: improve homepage hero sizing on mobile"
```

---

### Task 3: Listings page top bar and map mode

**Files:**
- Modify: `web/src/app/listings/page.tsx`

**Step 1: Fix top bar layout**

In `web/src/app/listings/page.tsx`, the top bar div at line 152 currently is:
```tsx
<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
```

This is already `flex-col` on mobile which is good. But the inner controls div (line 156) needs wrapping. Change line 156:
```tsx
<div className="flex items-center gap-2">
```
to:
```tsx
<div className="flex flex-wrap items-center gap-2">
```

**Step 2: Fix sort select sizing**

Line 183-187, change the select className:
```
rounded-btn border border-warm-gray-light bg-white px-3 py-2.5 text-sm text-navy focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20
```
to:
```
min-w-0 rounded-btn border border-warm-gray-light bg-white px-2 py-2.5 text-xs text-navy focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20 sm:px-3 sm:text-sm
```

**Step 3: Add mobile listing strip for map mode**

In the map mode section (line 267-301), the sidebar is `hidden md:block`. Below the map `<div>` (after line 299), add a mobile listing strip. Replace the entire map mode block (lines 267-301):

```tsx
<div className="flex flex-col gap-4" style={{ height: "calc(100vh - 200px)" }}>
  <div className="flex flex-1 gap-4">
    {/* Sidebar — desktop only */}
    <div className="hidden w-96 shrink-0 overflow-y-auto rounded-2xl border border-warm-gray-light/40 bg-white p-3 md:block">
      <p className="mb-3 px-1 text-sm font-medium text-warm-gray">
        {total > 0 ? `${total.toLocaleString()} njoftime` : "Duke ngarkuar..."}
      </p>
      {loading && listings.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} variant="compact" />
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full rounded-btn bg-terracotta px-4 py-2 text-sm font-medium text-white transition hover:bg-terracotta-dark disabled:opacity-50"
            >
              {loading ? "Duke ngarkuar..." : "Shfaq më shumë"}
            </button>
          )}
        </div>
      )}
    </div>

    {/* Map */}
    <div className="flex-1 overflow-hidden rounded-2xl border border-warm-gray-light/40">
      <MapView listings={listings} />
    </div>
  </div>

  {/* Mobile listing strip — below map */}
  <div className="flex gap-3 overflow-x-auto pb-2 md:hidden">
    {listings.slice(0, 10).map((listing) => (
      <div key={listing.id} className="w-64 shrink-0">
        <ListingCard listing={listing} variant="compact" />
      </div>
    ))}
  </div>
</div>
```

**Step 4: Verify build**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add web/src/app/listings/page.tsx
git commit -m "feat: fix listings page mobile layout and add map mode listing strip"
```

---

### Task 4: Listing detail page mobile layout

**Files:**
- Modify: `web/src/app/listings/[city]/[slug]/page.tsx`

**Step 1: Fix header stacking**

Line 102, change:
```tsx
<div className="mt-6 flex items-start justify-between gap-4">
```
to:
```tsx
<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
```

**Step 2: Fix details grid breakpoints**

Line 128, change:
```tsx
<div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-warm-gray-light/40 bg-cream-dark p-5 sm:grid-cols-4">
```
to:
```tsx
<div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-warm-gray-light/40 bg-cream-dark p-4 sm:grid-cols-3 sm:gap-4 sm:p-5 lg:grid-cols-4">
```

**Step 3: Fix phone CTA width**

Line 205-208, change the phone link:
```tsx
<a
  href={`tel:${listing.poster_phone}`}
  className="mt-3 inline-flex items-center gap-2 rounded-btn bg-terracotta px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark hover:shadow-md"
>
```
to:
```tsx
<a
  href={`tel:${listing.poster_phone}`}
  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-btn bg-terracotta px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark hover:shadow-md sm:w-auto sm:justify-start sm:py-2.5"
>
```

**Step 4: Verify build**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add web/src/app/listings/\[city\]/\[slug\]/page.tsx
git commit -m "feat: fix listing detail page mobile layout"
```

---

### Task 5: ListingForm mobile grids

**Files:**
- Modify: `web/src/components/ListingForm.tsx`

**Step 1: Fix price grid**

Line 272, change:
```tsx
<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
```
to:
```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
```

**Step 2: Fix details grid**

Line 325, change:
```tsx
<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
```
to:
```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
```

Note: Keep details grid at 2 cols on mobile (rooms, bathrooms, area work fine in pairs) but tighten gap.

**Step 3: Fix submit buttons stacking**

Line 538, change:
```tsx
<div className="flex items-center gap-4 border-t border-warm-gray-light pt-6">
```
to:
```tsx
<div className="flex flex-col gap-3 border-t border-warm-gray-light pt-6 sm:flex-row sm:items-center sm:gap-4">
```

And line 540-548, add `w-full sm:w-auto` to submit button:
```tsx
className="w-full rounded-btn bg-terracotta px-8 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark hover:shadow-md disabled:opacity-50 sm:w-auto"
```

And line 550-553, add `w-full sm:w-auto` to cancel button:
```tsx
className="w-full rounded-btn border border-warm-gray-light px-6 py-3 text-sm font-medium text-navy transition hover:bg-cream-dark sm:w-auto"
```

**Step 4: Verify build**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add web/src/components/ListingForm.tsx
git commit -m "feat: fix listing form mobile layout"
```

---

### Task 6: Dashboard header mobile stacking

**Files:**
- Modify: `web/src/app/dashboard/page.tsx`

**Step 1: Fix header layout**

Line 62, change:
```tsx
<div className="mb-8 flex items-center justify-between">
```
to:
```tsx
<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
```

**Step 2: Fix "Posto njoftim" button width**

Line 71-74, change the Link className:
```tsx
className="inline-flex items-center gap-2 rounded-btn bg-terracotta px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark hover:shadow-md"
```
to:
```tsx
className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-terracotta px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark hover:shadow-md sm:w-auto"
```

**Step 3: Verify build**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add web/src/app/dashboard/page.tsx
git commit -m "feat: fix dashboard header mobile stacking"
```

---

### Task 7: Mobile drawers safe area padding

**Files:**
- Modify: `web/src/components/FilterSidebar.tsx`
- Modify: `web/src/components/MobileMenu.tsx`

**Step 1: Add safe area to FilterSidebar mobile drawer**

In `web/src/components/FilterSidebar.tsx`, line 266, change:
```tsx
className={`fixed right-0 top-0 z-50 h-full w-80 overflow-y-auto bg-cream p-5 shadow-xl transition-transform duration-300 md:hidden ${
```
to:
```tsx
className={`fixed right-0 top-0 z-50 h-full w-80 overflow-y-auto bg-cream p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl transition-transform duration-300 md:hidden ${
```

**Step 2: Add safe area to MobileMenu drawer**

In `web/src/components/MobileMenu.tsx`, line 31, change:
```tsx
className={`fixed right-0 top-0 z-50 h-full w-72 bg-white shadow-xl transition-transform duration-300 ${
```
to:
```tsx
className={`fixed right-0 top-0 z-50 h-full w-72 bg-white pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-300 ${
```

**Step 3: Verify build**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add web/src/components/FilterSidebar.tsx web/src/components/MobileMenu.tsx
git commit -m "feat: add safe area padding to mobile drawers for notch phones"
```

---

### Task 8: Visual verification

**Step 1: Start dev server**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npm run dev`

**Step 2: Test in browser**

Open browser DevTools, toggle device toolbar, test at these widths:
- 320px (iPhone SE)
- 375px (iPhone 12/13)
- 390px (iPhone 14)
- 768px (iPad)
- 1024px (Desktop)

Check each page:
- [ ] Homepage: hero text fits, no horizontal overflow
- [ ] Listings: controls don't overflow, map mode shows strip on mobile
- [ ] Listing detail: title/share stack, phone button full-width
- [ ] Dashboard: header stacks, button full-width
- [ ] Create listing form: fields stack properly, buttons full-width
- [ ] Mobile menu: opens/closes, safe area padding
- [ ] Filter drawer: opens/closes, safe area padding

**Step 3: Final commit if any touch-ups needed**
