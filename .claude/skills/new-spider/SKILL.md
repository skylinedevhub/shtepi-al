---
name: new-spider
description: Scaffold a new Scrapy spider with tests and fixtures for an Albanian real estate site
user-invocable: true
disable-model-invocation: true
arguments:
  - name: domain
    description: The domain to scrape (e.g., indomio.al)
    required: true
---

# New Spider Scaffold

Create a new Scrapy spider for an Albanian real estate site, including test file, fixtures directory entries, and boilerplate matching existing spider patterns.

## Arguments

- `$ARGUMENTS` — the target domain (e.g., `indomio.al`, `propertyhub.al`)

## Step 1: Derive Names

From the domain, derive:
- **Spider name**: Domain without TLD, lowercase (e.g., `indomio.al` → `indomio`)
- **Class name**: PascalCase + "Spider" (e.g., `IndomioSpider`)
- **Image hostname**: The domain or CDN used for images (determine in step 2)

## Step 2: Explore the Target Site

Use WebFetch to explore the site's real estate pages:

1. **List page**: Find the main listing category URL. Identify:
   - Card selectors (links to detail pages)
   - Pagination pattern (next page link text, URL parameter)
   - Category/transaction URL structure

2. **Detail page**: Visit a listing detail page. Identify:
   - Title selector (usually h1)
   - Price + currency selectors
   - Image selectors (data-fancybox, carousel, img src/data-src)
   - Tags/attributes section (key-value pairs for rooms, area, floor, city)
   - Description selector
   - Seller info selectors (name, phone, type)
   - Transaction type indicator (sale vs rent)
   - Source ID extraction from URL

3. **Image domain**: Note the hostname used for listing images

Present findings to the user before proceeding.

## Step 3: Create Spider File

Create `scrapy_project/shtepi/spiders/{name}.py` following this structure:

```python
"""Spider for {domain} - {brief description}."""

import re

import scrapy

from shtepi.items import ListingItem
from shtepi.normalizers import parse_area, parse_floor, parse_price_text


class {ClassName}Spider(scrapy.Spider):
    """Crawl {domain} real estate listings."""

    name = "{name}"
    allowed_domains = ["{domain}"]

    BASE = "https://{base_url}"
    MAX_PAGES = 10

    # Property categories (Albanian labels → normalized types)
    PROPERTY_CATEGORIES = {
        # Map site-specific Albanian category slugs → standard types
        # "apartamente": "apartment",
    }

    TRANSACTION_TYPES = {
        # Map site-specific transaction slugs → "sale" / "rent"
    }

    def start_requests(self):
        """Generate start URLs for each property category + transaction type."""
        # TODO: Implement based on site URL structure
        pass

    def parse(self, response):
        """Parse a category listing page to extract detail links and pagination."""
        # TODO: Extract detail links from listing cards
        # TODO: Follow pagination
        pass

    def parse_detail(self, response):
        """Parse a listing detail page and yield a ListingItem."""
        item = ListingItem()

        # -- Identity --
        item["source"] = "{name}"
        item["source_url"] = response.url
        item["source_id"] = self._extract_id(response.url)

        # -- Title --
        # TODO: Extract title

        # -- Price --
        # TODO: Extract price, currency_original, price_period

        # -- Transaction type --
        # TODO: Detect sale vs rent

        # -- Property type --
        # TODO: Detect property type

        # -- Room config from title --
        if item.get("title"):
            room_match = re.search(r'(\d+\s*\+\s*\d+(?:\s*\+\s*\w+)?)', item["title"])
            if room_match:
                item["room_config"] = room_match.group(1).replace(" ", "")

        # -- Property attributes --
        # TODO: Extract rooms, area_sqm, floor, total_floors, city, neighborhood

        # -- Images --
        # TODO: Extract image URLs, filter placeholders/skeletons

        # -- Description --
        # TODO: Extract description text

        # -- Seller info --
        # TODO: Extract poster_name, poster_phone, poster_type

        yield item

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_id(url):
        """Extract the listing ID from the URL."""
        # TODO: Implement based on URL pattern
        match = re.search(r'(\d+)$', url.rstrip("/"))
        return match.group(1) if match else url.rstrip("/").split("/")[-1]

    @staticmethod
    def _safe_int(value):
        """Safely convert a value to int, returning None on failure."""
        if value is None:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
```

Fill in the TODOs based on the selectors discovered in Step 2. Ask the user for input on any ambiguous selectors.

## Step 4: Create Test Fixtures

Create HTML fixture files in `scrapy_project/tests/fixtures/`:
- `{name}_list.html` — A listing page with 2-3 cards + pagination link
- `{name}_listing.html` — A detail page with all extractable fields

Use the real HTML from Step 2, stripped to relevant elements.

## Step 5: Create Test File

Create `scrapy_project/tests/test_spider_{name}.py` with these test classes:

1. **TestParseListingPage** — yields correct detail requests, pagination works
2. **TestParseDetail** — all fields extracted correctly from fixture
3. **TestExtractId** — ID extraction from various URL formats
4. **TestDetectTransactionType** — sale/rent detection (if applicable)
5. **TestHandlesMissingPrice** — graceful handling of missing data
6. **TestParseDetailRentListing** — rent-specific fields
7. **TestPrivateSeller** — poster_type detection

Use the same `fake_response_from_file` helper pattern as existing tests.

## Step 6: Add Image Domain

If the site uses a different image hostname than the main domain, add it to `web/next.config.mjs` in the `remotePatterns` array:

```javascript
{
  protocol: "https",
  hostname: "{image_hostname}",
},
```

## Step 7: Run Tests

```bash
cd scrapy_project && python -m pytest tests/test_spider_{name}.py -v
```

Ensure all tests pass before finishing.

## Step 8: Update Memory

Update the Spider Status table in MEMORY.md to change the spider's status from EVALUATE to LIVE (or add a new entry).

## Albanian Parsing Reminders

- Room config: "2+1" = 2 bed + 1 living. "garsoniere" = studio (0 rooms)
- Price: Tirana typically EUR, rural/rent may be ALL. "Lekë" = "LEK" = ALL currency
- City: lowercase lookup, handle diacritics (ë → e, ç → c)
- Transaction: "Shitet" = sale, "Jepet me qira/qera" = rent
- Poster type: "Kompani" = agency, "Person fizik" = private
- Use `parse_area()`, `parse_floor()`, `parse_price_text()` from normalizers — don't reimplement
