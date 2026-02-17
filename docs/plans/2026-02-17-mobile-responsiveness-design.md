# Mobile Responsiveness Design

## Problem
The ShtëpiAL site has responsive foundations (Tailwind breakpoints, mobile menu drawer, filter drawer) but several components have sizing, spacing, and layout issues on mobile screens (< 640px).

## Approach
Targeted Tailwind utility fixes. No new components or structural rewrites.

## Changes by Component

### 1. Homepage Hero (`app/page.tsx`)
- Heading: `text-3xl sm:text-5xl md:text-7xl` (was `text-5xl md:text-7xl`)
- Vertical padding: `py-16 sm:py-28` (was `py-28`)
- Subtitle margin: `mb-6 sm:mb-10` (was `mb-10`)

### 2. Listings Page (`app/listings/page.tsx`)
- Top bar: ensure search is full-width on its own row, controls wrap below
- Sort select: `text-xs sm:text-sm` to prevent horizontal overflow
- Map mode sidebar: show listings in a scrollable horizontal strip on mobile (below the map) instead of `hidden md:block`

### 3. Listing Detail (`app/listings/[city]/[slug]/page.tsx`)
- Header: `flex-col sm:flex-row` for title + share button stacking
- Details grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (smoother progression)
- Phone CTA: `w-full sm:w-auto` for full-width touch target

### 4. ListingForm (`components/ListingForm.tsx`)
- Price grid: `grid-cols-1 sm:grid-cols-3` (was `grid-cols-2 sm:grid-cols-3`)
- Details grid: `grid-cols-1 sm:grid-cols-3` (was `grid-cols-2 sm:grid-cols-3`)

### 5. Dashboard (`app/dashboard/page.tsx`)
- Header: `flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`
- "Posto njoftim" button: `w-full sm:w-auto`

### 6. FilterSidebar (`components/FilterSidebar.tsx`)
- Add `pb-[env(safe-area-inset-bottom)]` to mobile drawer for notch phones

### 7. MobileMenu (`components/MobileMenu.tsx`)
- Add `pb-[env(safe-area-inset-bottom)]` to drawer for notch phones

### 8. globals.css
- Add viewport-aware safe area support

## Non-Changes
- ImageGallery thumbnails (16x16 = 64px, already above 44px touch target)
- SearchBar (already `w-full max-w-2xl`, works well on mobile)
- ListingCard (already responsive with proper aspect ratios)
- Auth pages (already centered with `max-w-md`, mobile-friendly)
