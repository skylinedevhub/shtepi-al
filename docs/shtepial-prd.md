# ShtëpiAL — Albanian Housing Portal Aggregator

## PRD & Implementation Scope

**Version:** MVP v1
**Objective:** Aggregate all Albanian real estate listings into a single, fast, filterable interface that replaces the need to visit 8+ broken sites individually.

---

## Target Sources (Confirmed Live & Scrapable)

### Tier 1 — High Volume Classifieds (build first)

| Source | URL | Type | Volume | Structure |
|--------|-----|------|--------|-----------|
| **MerrJep** | merrjep.al | Classifieds | 800k+ total listings, largest in AL | Category-based URLs, paginated, structured cards |
| **Gazeta Çelësi** | gazetacelesi.al | Classifieds | ~5k+ daily active | Structured cards with price/m²/rooms/floor, paginated |
| **MirLir** | mirlir.com | Classifieds | Medium | Simple listing cards, city-based categories |
| **Njoftime** | njoftime.com | Forum (XenForo) | 89k+ sale threads, 91k+ rental threads | Forum threads with structured metadata in title + body |

### Tier 2 — Agency Portals (add after Tier 1 works)

| Source | URL | Type | Notes |
|--------|-----|------|-------|
| **Indomio** | indomio.al | Portal | Modern, has map view, likely has API/JSON endpoints |
| **Century 21 Albania** | century21albania.com | Franchise | 47 offices, 440+ agents, structured data |
| **RE/MAX Albania** | remax-albania.com | Franchise | International franchise format, clean data |
| **Future Home** | futurehome.al | Agency network | Largest Albanian agency, 250+ agents, 30 offices |
| **RealEstate.al** | realestate.al | Agency | Clean English/Albanian listings, smaller volume |
| **RealDeal** | realdeal.al | Agency | Clean data, English descriptions |

---

## Normalized Data Schema

Every listing from every source normalizes to this shape:

```
Listing {
  // Identity
  id:              string    // internal UUID
  source:          string    // "merrjep" | "celesi" | "mirlir" | "njoftime" | "indomio" | "century21" | "remax" | "futurehome" | "realestate" | "realdeal"
  source_url:      string    // original listing URL
  source_id:       string    // ID from source site (for dedup + update tracking)

  // Core
  title:           string
  description:     string    // raw description text
  price:           number    // normalized to EUR
  price_all:       number    // price in Albanian Lek
  currency_original: string  // "EUR" | "ALL" | "USD"
  price_period:    string    // "total" (sale) | "monthly" (rent)

  // Classification
  transaction_type: string   // "sale" | "rent"
  property_type:    string   // "apartment" | "house" | "villa" | "land" | "commercial" | "garage"
  room_config:      string   // raw Albanian format: "1+1", "2+1+2", "garsoniere", "3+1+BLK"

  // Dimensions
  area_sqm:        number | null   // total/gross m²
  area_net_sqm:    number | null   // net m² if available
  floor:           number | null
  total_floors:    number | null
  rooms:           number | null   // bedrooms
  bathrooms:       number | null

  // Location
  city:            string    // normalized: "Tiranë", "Durrës", "Vlorë", "Sarandë", etc.
  neighborhood:    string    // raw: "Astir", "Don Bosko", "Bllok", "Komuna e Parisit", etc.
  address_raw:     string    // whatever text the listing had

  // Media
  images:          string[]  // array of image URLs (from source, not re-hosted)
  image_count:     number

  // Metadata
  poster_name:     string | null   // seller/agent name
  poster_phone:    string | null   // contact phone
  poster_type:     string          // "private" | "agency"
  is_active:       boolean
  first_seen:      datetime
  last_seen:       datetime
  created_at:      datetime        // listing creation date if available

  // Features (parsed from description)
  has_elevator:    boolean | null
  has_parking:     boolean | null
  is_furnished:    boolean | null
  is_new_build:    boolean | null
}
```

### Albanian-specific parsing rules

**Room config normalization:** Albanian listings use `X+Y` format where X = bedrooms, Y = living spaces. "1+1" = 1 bedroom + 1 living room. "2+1+2" = 2 bed + 1 living + 2 bathrooms. "Garsoniere" = studio. Parse these into the `room_config` string AND extract `rooms` count.

**Price normalization:** Use Bank of Albania EUR/ALL rate. Most Tirana listings are in EUR. Rental listings outside Tirana often in ALL. Some listings use "Lekë" or "ALL" interchangeably.

**City normalization map:**
```
Tirane/Tirana/Tiranë → Tiranë
Durres/Durrës → Durrës  
Vlore/Vlorë → Vlorë
Sarande/Sarandë → Sarandë
Shkoder/Shkodër → Shkodër
Korce/Korçë → Korçë
Elbasan → Elbasan
Fier → Fier
Berat → Berat
Lushnje/Lushnjë → Lushnjë
Pogradec → Pogradec
Kamez/Kamëz → Kamëz
Vore/Vorë → Vorë
Golem → Golem
Dhërmi/Dhermi → Dhërmi
Himare/Himarë → Himarë
Ksamil → Ksamil
```

**Neighborhood normalization (Tirana — most common):**
```
Don Bosko, Astir, Bllok, Komuna e Parisit, Fresku/Fresk,
Yzberisht, 21 Dhjetori, Kodra e Diellit, Ali Demi,
Myslym Shyri, Liqeni i Thatë, Ish Fusha e Aviacionit,
Mine Peza, Laprake/Laprakë, Kinostudio, Porcelan,
Pazari i Ri, Bulevardi i Ri, Unaza e Re, Sauk,
Kombinat, Paskuqan, Oxhaku, Vasil Shanto, Medreseja,
5 Maji/Rruga 5 Maji, Rruga e Kavajës, Rruga e Durrësit,
Rruga e Elbasanit, Kopshti Botanik, Brryli, Selvia,
Stacioni i Trenit, Xhamlliku, Delijorgji
```

---

## Tech Stack

### Scraping: Scrapy (Python)
- One spider per source
- All spiders output normalized `Listing` dicts
- Scrapy items pipeline handles validation + DB insert
- Run via cron: Tier 1 every 6h, Tier 2 every 12h
- Respect crawl delays (1-2s between requests)
- Rotate User-Agent strings

### Database: SQLite (MVP) → PostgreSQL (when needed)
- SQLite is fine for <100k listings
- Single `listings` table matching schema above
- Indexes on: `source + source_id` (unique), `city`, `transaction_type`, `property_type`, `price`, `area_sqm`, `neighborhood`
- `raw_json` column stores original scraped data for reprocessing

### Search: SQLite FTS5 (MVP) → Meilisearch (when needed)
- FTS5 on `title + description + neighborhood + city`
- Faceted filtering via SQL WHERE clauses
- Albanian-language search is fine without stemming for MVP — users search by neighborhood name

### Frontend: Next.js (App Router)
- SSR for SEO (capture Google traffic)
- Responsive — mobile-first (most Albanians browse on phone)
- Albanian language UI with English toggle

### Deployment: Single VPS
- Hetzner or similar EU VPS (€5-10/mo)
- Docker Compose: scrapy workers + next.js + SQLite
- Caddy for HTTPS + reverse proxy
- Data volume: ~50-100MB total for all listings

---

## MVP Features (Build in this order)

### Phase 1: Scraping Pipeline
1. Scrapy project with Tier 1 spiders (merrjep, celesi, mirlir, njoftime)
2. Item pipeline: validate → normalize → dedup → store
3. Dedup: match on `source + source_id` for same-source. Cross-source dedup deferred.
4. CLI to run spiders manually, verify data, check counts
5. Cron schedule setup

### Phase 2: API Layer
1. Next.js API routes (or standalone FastAPI if preferred)
2. `GET /api/listings` — paginated, filterable
   - Filters: `city`, `transaction_type`, `property_type`, `price_min`, `price_max`, `rooms_min`, `rooms_max`, `area_min`, `area_max`, `neighborhood`, `source`
   - Sort: `newest`, `price_asc`, `price_desc`, `area_desc`
   - Pagination: cursor-based or offset
3. `GET /api/listings/[id]` — single listing detail
4. `GET /api/stats` — counts by city, type, source (for UI)
5. `GET /api/search?q=` — FTS5 text search

### Phase 3: Frontend
1. **Homepage:** Search bar + quick filters (Buy/Rent toggle, City dropdown, Room config). Count badges ("12,345 listings from 8 sources")
2. **Listing grid:** Card layout showing: first image, price, room config, area, neighborhood, city, source badge. Infinite scroll or pagination.
3. **Listing detail page:** All images (gallery), full description, all metadata, "View on original site" link, contact info if available
4. **Filter sidebar:** Transaction type, property type, price range (slider), area range, rooms, city, neighborhood (dynamic based on city), source checkboxes
5. **Mobile layout:** Bottom sheet filters, swipeable image gallery

### Phase 4: Polish
1. SEO: Meta tags, structured data (JSON-LD for RealEstateListing), sitemap.xml
2. Price alerts: Email notification when new listing matches saved search (simple — store searches, run against new listings on each scrape)
3. Favorites: Local storage bookmarking (no auth needed for MVP)

---

## Spider Architecture (per source)

### MerrJep Spider
```
Entry URLs:
  merrjep.al/njoftime/imobiliare-vendbanime/apartamente/{city}
  merrjep.al/njoftime/imobiliare-vendbanime/shtepi/{city}
  merrjep.al/njoftime/imobiliare-vendbanime/vila/{city}
  merrjep.al/njoftime/imobiliare-vendbanime/trual/{city}
  
Pagination: ?Page=N (crawl until no more results)
Per-listing: Follow link → scrape detail page
Data points from listing cards: title, price, location, thumbnail
Data points from detail page: description, all images, seller info, metadata fields
```

### Gazeta Çelësi Spider
```
Entry URLs:
  gazetacelesi.al/en/shtepi-ne-shitje/apartament?page=N
  gazetacelesi.al/en/shtepi-me-qera/apartament?page=N
  gazetacelesi.al/en/shtepi-ne-shitje/shtepi-private?page=N
  gazetacelesi.al/en/shtepi-ne-shitje/vila?page=N
  gazetacelesi.al/en/shtepi/pjese-vile?page=N
  
Listing cards include: price, area, rooms, floor, city, neighborhood
Detail pages: full description, images, contact
```

### MirLir Spider  
```
Entry URLs:
  mirlir.com/shpallje/k-apartment-banesa/v-{city}/
  mirlir.com/shpallje/k-apartamente-banesa-me-qira/v-{city}/

Pagination: standard page params
Detail pages: description, price, images, contact
Note: Has both Albanian (mirlir.com) and English (en.mirlir.com) versions
```

### Njoftime Spider
```
Entry URLs:
  njoftime.com/categories/apartamente-prona-imobiliare.41/
  Sub-forums for sale vs rent

NOTE: XenForo forum. Thread titles contain structured data:
  "{City}, shitet apartament {rooms}+{config} Kati {floor}, {area} m² {price} € ({neighborhood})"
  
Parse strategy: 
  1. Extract metadata from thread title (regex)
  2. Scrape thread body for description + images
  3. Thread metadata gives posting date
```

---

## Dedup Strategy (MVP — simple)

### Same-source dedup
Match on `source + source_id`. On re-scrape, update `last_seen` and any changed fields (price changes are interesting data).

### Cross-source dedup (Phase 2)
Simple heuristic: match listings where ALL of these are true:
- Same `city`
- Same `room_config` 
- `area_sqm` within ±5%
- `price` within ±15%

When matched, keep both records but link them via a `listing_group_id`. Display as single card with "Listed on 3 sites" badge and show price range.

Image-based dedup (perceptual hash) is a nice-to-have but not needed for MVP — the field matching above catches 80%+ of duplicates in Albanian market because sellers rarely change the room config or exact area.

---

## Development Order (Sprint Plan)

### Week 1: Foundation
- [ ] Scrapy project scaffold
- [ ] SQLite schema + migrations
- [ ] MerrJep spider (highest volume, most structured)
- [ ] Test scrape → verify 100+ listings parse correctly
- [ ] Normalization pipeline (prices, cities, room configs)

### Week 2: More Spiders + API
- [ ] Gazeta Çelësi spider
- [ ] Njoftime spider (forum parser)
- [ ] MirLir spider
- [ ] API routes (listings, search, filters)
- [ ] Full test scrape of all 4 Tier 1 sources

### Week 3: Frontend
- [ ] Next.js app scaffold
- [ ] Listing grid with filters
- [ ] Detail page
- [ ] Search
- [ ] Mobile responsive pass

### Week 4: Deploy + Tier 2
- [ ] Docker Compose config
- [ ] VPS deploy with Caddy
- [ ] Cron schedules
- [ ] Tier 2 spiders (indomio, century21, remax, futurehome)
- [ ] SEO basics (sitemap, meta tags, JSON-LD)

---

## Project Structure

```
shtepi-al/
├── scrapy_project/
│   ├── shtepi/
│   │   ├── spiders/
│   │   │   ├── merrjep.py
│   │   │   ├── celesi.py
│   │   │   ├── mirlir.py
│   │   │   ├── njoftime.py
│   │   │   ├── indomio.py
│   │   │   ├── century21.py
│   │   │   ├── remax.py
│   │   │   └── futurehome.py
│   │   ├── items.py          # Listing item definition
│   │   ├── pipelines.py      # Validate → normalize → dedup → store
│   │   ├── normalizers.py    # Price, city, room_config normalization
│   │   └── settings.py
│   └── scrapy.cfg
├── web/
│   ├── app/
│   │   ├── page.tsx          # Homepage
│   │   ├── listings/
│   │   │   ├── page.tsx      # Grid/search results
│   │   │   └── [id]/page.tsx # Detail
│   │   └── api/
│   │       ├── listings/route.ts
│   │       ├── search/route.ts
│   │       └── stats/route.ts
│   ├── components/
│   │   ├── ListingCard.tsx
│   │   ├── FilterSidebar.tsx
│   │   ├── SearchBar.tsx
│   │   └── ImageGallery.tsx
│   ├── lib/
│   │   └── db.ts             # SQLite connection + queries
│   └── package.json
├── db/
│   ├── schema.sql
│   └── shtepi.db
├── scripts/
│   ├── run_spiders.sh        # Cron entry point
│   └── seed_neighborhoods.py # Populate lookup tables
├── docker-compose.yml
├── Caddyfile
└── README.md
```

---

## Success Metrics (MVP)

- **Coverage:** >80% of active listings from Tier 1 sources successfully scraped and normalized
- **Freshness:** Listings updated within 12 hours of appearing on source sites
- **Parse accuracy:** >90% of listings have correct price, city, room_config, area
- **Load time:** <2s for listing grid, <1s for detail page
- **SEO:** Indexed by Google within 2 weeks of launch

---

## Out of Scope for MVP

- User accounts / authentication
- Map view (add in v2 with Leaflet + neighborhood centroids)
- Agent profiles / dashboards
- Direct messaging between buyers/sellers
- Price history / market analytics
- Mobile app (responsive web is sufficient)
- Re-hosting images (proxy from source)
- Machine translation (Albanian-only is fine, English descriptions where source provides them)
- Geocoding / lat-lng coordinates
- Complex cross-source deduplication
