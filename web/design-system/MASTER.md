# ShtëpiAL Design System

Single source of truth for all visual design decisions. Tokens live in `tailwind.config.ts` and `globals.css` — this document explains the _why_.

---

## Color Palette

### Primary

| Token | Hex | Usage |
|-------|-----|-------|
| `navy` | `#1B2A4A` | Headings, header bg, primary text, dark overlays |
| `navy-light` | `#2D3F63` | Borders on dark bg, subtle navy tints |
| `cream` | `#FDF8F0` | Page background (`--background`), card bg on dark |
| `cream-dark` | `#F5EDE0` | Skeleton shimmer, inactive button bg, scrollbar track |

### Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `terracotta` | `#C75B39` | CTAs, focus rings, active filters, "Shitje" badge |
| `terracotta-dark` | `#A8462A` | Hover state for terracotta buttons |
| `terracotta-light` | `#F4E0D8` | Light tint for terracotta badges/cards |
| `gold` | `#D4A843` | Brand accent (logo "Shtëpi"), footer headings, "Qira" badge |
| `gold-light` | `#F5EDD4` | Light tint for gold badges |

### Neutral

| Token | Hex | Usage |
|-------|-----|-------|
| `warm-gray` | `#8B8178` | Secondary text, metadata, scrollbar hover |
| `warm-gray-light` | `#D5CFC7` | Borders, dividers, scrollbar thumb, disabled states |
| `foreground` | `#374151` | Body text (`--foreground`) |

### WCAG Contrast Ratios (on cream #FDF8F0)

| Pair | Ratio | Level |
|------|-------|-------|
| navy on cream | 10.2:1 | AAA |
| terracotta on cream | 4.6:1 | AA |
| warm-gray on cream | 3.5:1 | AA (large text only) |
| gold on cream | 2.8:1 | Decorative only — never for body text |
| white on terracotta | 4.5:1 | AA |
| white on navy | 10.2:1 | AAA |

### Rules

- **Never** use `gold` for body text — insufficient contrast
- **Always** use `navy` for headings
- Terracotta for CTAs and interactive highlights only
- Use `warm-gray` for metadata/secondary info (large text) — pair with `navy` for small text
- CSS custom properties (`--background`, `--foreground`) for page-level colors

---

## Typography

### Font Stack

| Role | Family | Tailwind class | Fallback |
|------|--------|---------------|----------|
| Display / Headings | Playfair Display | `font-display` | Georgia, serif |
| Body / UI | DM Sans | `font-sans` | system-ui, sans-serif |

### Scale

| Element | Class | Size |
|---------|-------|------|
| Page title (h1) | `text-3xl md:text-4xl font-display font-bold` | 30/36px |
| Section heading (h2) | `text-2xl font-display font-semibold` | 24px |
| Card heading (h3) | `text-sm font-medium` | 14px |
| Body text | `text-sm` or `text-base` | 14/16px |
| Badge / meta | `text-xs` | 12px |
| Small caption | `text-[10px]` | 10px (compact cards only) |

### Rules

- Headings: **always** `font-display` (Playfair)
- Body: **always** `font-sans` (DM Sans) — the default
- Use `text-wrap: balance` on headings (set in globals.css)
- Use `text-wrap: pretty` on paragraphs (set in globals.css)

---

## Spacing & Border Radius

### Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-btn` | `0.625rem` (10px) | All buttons, inputs, selects |
| `rounded-card` | `1rem` (16px) | Cards, popups, modals |
| `rounded-input` | `0.5rem` (8px) | Reserved (currently prefer `rounded-btn`) |

### Spacing Patterns

- Page padding: `px-4` (16px)
- Max width container: `max-w-7xl mx-auto`
- Card padding: `p-4` (default), `p-3` (compact)
- Section gaps: `space-y-6` for filter groups
- Grid gaps: `gap-4 sm:gap-6`

---

## Component Patterns

### Buttons

```
Primary:     bg-terracotta text-white hover:bg-terracotta-dark rounded-btn btn-press
Secondary:   bg-cream-dark text-navy hover:bg-warm-gray-light/50 rounded-btn
Ghost:       text-navy hover:bg-cream-dark rounded-btn
Active:      bg-terracotta text-white shadow-sm (filter buttons)
```

All buttons: `cursor-pointer font-medium transition`

### Cards (ListingCard)

```
Container:   bg-white rounded-2xl border border-warm-gray-light/50 shadow-sm
Hover:       -translate-y-1.5 shadow-[0_12px_32px_-8px_rgba(27,42,74,0.12)]
Image:       aspect-[4/3] (default), aspect-[3/2] (compact)
```

### Inputs

```
Base:        rounded-btn border border-warm-gray-light px-3 py-2 text-sm
Focus:       focus:border-terracotta focus:ring-2 focus:ring-terracotta/20
```

### Badges (Source)

```
merrjep:     bg-terracotta-light text-terracotta ring-1 ring-terracotta/20
celesi:      bg-gold-light text-navy ring-1 ring-gold/30
mirlir:      bg-navy/5 text-navy ring-1 ring-navy/10
njoftime:    bg-cream-dark text-warm-gray ring-1 ring-warm-gray-light
```

### Badges (Transaction)

```
Sale:        bg-terracotta text-white
Rent:        bg-gold text-navy
```

---

## Animation Tokens

### Durations

| Token | Value | Usage |
|-------|-------|-------|
| Standard transition | `duration-200` | Color/opacity transitions |
| Card transition | `duration-300` | Card hover (translate + shadow) |
| Entrance | `0.5s–0.6s` | fade-up, fade-in |
| Skeleton shimmer | `1.5s` infinite | Loading placeholders |

### Easings

| Name | Value | Usage |
|------|-------|-------|
| Entrance | `cubic-bezier(0.22, 1, 0.36, 1)` | fade-up animations |
| Standard | `ease` / default | fade-in, transitions |
| Shimmer | `ease-in-out` | Skeleton loading |

### Stagger Pattern

Cards in grids use `.stagger-children` (60ms per child, capped at 12 children).

### Reduced Motion

Global safety net in `globals.css` — `prefers-reduced-motion: reduce` zeroes all animation/transition durations.

---

## Accessibility

### Focus Rings

All interactive elements: `2px solid #C75B39` with `2px offset` and `4px radius` (set in globals.css `*:focus-visible`).

### Touch Targets

Minimum 44x44px for mobile interactive elements. Room buttons use `size-10` (40px) — acceptable with spacing gap.

### Skip Link

`.skip-to-content` link at top of body, visible on focus: terracotta bg, white text.

### Screen Reader

- All decorative SVGs: `aria-hidden="true"`
- All buttons: explicit `aria-label` in Albanian
- Filter drawer: `role="dialog"` + `aria-modal="true"` + `aria-label`

---

## Anti-Patterns

- **No raw hex values** in components — use Tailwind tokens (`text-navy`, `bg-terracotta`, etc.)
- **No `bg-blue-*` / `bg-gray-*`** — use brand palette equivalents
- **No `gold` for text** on light backgrounds (fails WCAG)
- **No animation without reduced-motion fallback** (handled globally)
- **No fixed positioning inside header** (backdrop-filter creates containing block — use `createPortal`)
- **No `<img>` for user-uploaded images** — use `next/image`. Scraped URLs exempt.
