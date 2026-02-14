"""Spider for duashpi.al - Albania's largest dedicated real estate portal.

Duashpi.al is a modern real estate marketplace with ~100k listings.
Server-rendered HTML with Alpine.js for interactivity. Behind Cloudflare.

The spider extracts:
- List pages: listing card links + pagination
- Detail pages: structured metadata (price, area, rooms, floor, location),
  images, description, and contact info.
"""

import re

import scrapy

from shtepi.items import ListingItem
from shtepi.normalizers import parse_area, parse_floor


class DuashpiSpider(scrapy.Spider):
    name = "duashpi"
    allowed_domains = ["duashpi.al"]

    # Chrome impersonation needed to bypass Cloudflare TLS fingerprinting.
    custom_settings = {
        "DOWNLOAD_HANDLERS": {"https": "scrapy_impersonate.ImpersonateDownloadHandler"},
        "IMPERSONATE_BROWSER": "chrome",
        "ROBOTSTXT_OBEY": False,
    }

    START_URLS = [
        "https://duashpi.al/shtepi-ne-shitje",
        "https://duashpi.al/shtepi-me-qera",
    ]

    def start_requests(self):
        for url in self.START_URLS:
            yield scrapy.Request(url, meta={"impersonate": "chrome"})

    def parse(self, response):
        """Parse a category listing page.

        Yields:
            Request for each listing detail page (callback=parse_listing).
            Request for the next pagination page (callback=parse).
        """
        # Determine transaction type from URL
        txn_type = "rent" if "qera" in response.url else "sale"

        for card in response.css('a[href*="/prona/"]'):
            detail_url = card.attrib.get("href")
            if detail_url:
                yield scrapy.Request(
                    response.urljoin(detail_url),
                    callback=self.parse_listing,
                    meta={"transaction_type": txn_type, "impersonate": "chrome"},
                )

        # Follow pagination
        next_page = response.css(
            'a[rel="next"]::attr(href)'
        ).get()
        if not next_page:
            # Fallback: look for page=N+1 link
            current_page = self._current_page(response.url)
            for link in response.css('a[href*="page="]'):
                href = link.attrib.get("href", "")
                page_num = self._extract_page_num(href)
                if page_num and page_num == current_page + 1:
                    next_page = href
                    break

        if next_page:
            meta = response.meta.copy()
            meta["impersonate"] = "chrome"
            yield scrapy.Request(
                response.urljoin(next_page),
                callback=self.parse,
                meta=meta,
            )

    def parse_listing(self, response):
        """Parse a listing detail page and yield a ListingItem."""
        item = ListingItem()

        # -- Identity --
        item["source"] = "duashpi"
        item["source_url"] = response.url
        item["source_id"] = self._extract_id(response.url)

        # -- Title --
        title = response.css("h1::text").get("")
        item["title"] = title.strip() or None

        # -- Location --
        # h3 with class containing "pt-3" holds "Neighborhood, City"
        location_text = response.css(
            "h3.flex.items-center::text"
        ).getall()
        location_text = " ".join(t.strip() for t in location_text if t.strip())
        city, neighborhood = self._parse_location(location_text)
        item["city"] = city
        item["neighborhood"] = neighborhood

        # -- Price --
        price_text = response.css(
            "span.text-2xl::text"
        ).get("")
        if not price_text:
            price_text = response.css(
                "span.font-semibold::text"
            ).get("")
        item["price"], item["currency_original"] = self._parse_price(price_text)

        # -- Price period --
        if "muaj" in price_text.lower() or "muaj" in response.text[:5000].lower():
            item["price_period"] = "monthly"
        else:
            item["price_period"] = "total"

        # -- Transaction type --
        # From badge or meta
        badge_text = response.css(
            "span.rounded-full::text"
        ).get("")
        item["transaction_type"] = self._detect_transaction(
            badge_text, response.meta.get("transaction_type", "sale")
        )

        # -- Metadata from list items --
        metadata = self._extract_metadata(response)
        item["area_sqm"] = metadata.get("area_sqm")
        item["rooms"] = metadata.get("rooms")
        item["bathrooms"] = metadata.get("bathrooms")
        item["floor"] = metadata.get("floor")
        item["total_floors"] = metadata.get("total_floors")

        # -- Property type from title --
        item["property_type"] = self._detect_property_type(
            item.get("title") or ""
        )

        # -- Room config from title --
        if item.get("title"):
            room_match = re.search(
                r'(\d+\s*\+\s*\d+(?:\s*\+\s*\d+)?)', item["title"]
            )
            if room_match:
                item["room_config"] = room_match.group(1).replace(" ", "")

        # -- Images --
        # Primary: CDN images (crm-cdn.ams3.cdn.digitaloceanspaces.com)
        images = response.css(
            'img[src*="crm-cdn"]::attr(src)'
        ).getall()
        # Fallback: old-style uploads/images/main
        if not images:
            images = response.css(
                'img[src*="uploads/images/main"]::attr(src)'
            ).getall()
        if not images:
            images = response.css(
                'img[src*="uploads/images"]::attr(src)'
            ).getall()
        # Filter out thumbnails and deduplicate
        seen = set()
        unique_images = []
        for img in images:
            if img not in seen and "thumbnail" not in img:
                seen.add(img)
                unique_images.append(img)
        item["images"] = unique_images
        item["image_count"] = len(unique_images)

        # -- Description --
        desc_parts = response.css(
            "p.text-slate-700::text"
        ).getall()
        if desc_parts:
            description = " ".join(
                part.strip() for part in desc_parts if part.strip()
            )
            item["description"] = description if description else None
        else:
            item["description"] = None

        # -- Contact info --
        phone_link = response.css('a[href^="tel:"]::attr(href)').get()
        if phone_link:
            item["poster_phone"] = phone_link.replace("tel:", "").strip()

        yield item

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_id(url):
        """Extract the hex listing ID from duashpi.al URL.

        URLs: /prona/{hex_id}/{slug}.html
        """
        match = re.search(r'/prona/([a-f0-9]+)/', url)
        if match:
            return match.group(1)
        return url.rstrip("/").split("/")[-1]

    @staticmethod
    def _parse_location(text):
        """Parse 'Neighborhood, City' text into components."""
        if not text:
            return None, None
        parts = [p.strip() for p in text.split(",")]
        if len(parts) >= 2:
            return parts[-1], ", ".join(parts[:-1])
        return parts[0], None

    @staticmethod
    def _parse_price(text):
        """Parse price text like '255,000 €' or '700 € / në muaj'."""
        if not text:
            return None, None
        # Remove non-numeric except comma and dot
        price_match = re.search(r'([\d.,]+)', text)
        if not price_match:
            return None, None
        price_str = price_match.group(1).replace(",", "")
        try:
            price = float(price_str)
        except ValueError:
            return None, None
        if price <= 0:
            return None, None

        # Detect currency
        if "€" in text or "EUR" in text.upper():
            currency = "EUR"
        elif "Lek" in text or "ALL" in text.upper():
            currency = "ALL"
        elif "$" in text or "USD" in text.upper():
            currency = "USD"
        else:
            currency = "EUR"  # default for Albania

        return price, currency

    @staticmethod
    def _detect_transaction(badge_text, fallback):
        """Detect transaction type from badge text."""
        if not badge_text:
            return fallback
        text = badge_text.lower().strip()
        if "shitje" in text or "shitet" in text:
            return "sale"
        if "qera" in text or "qira" in text:
            return "rent"
        return fallback

    @staticmethod
    def _detect_property_type(title):
        """Detect property type from title text."""
        title_lower = title.lower()
        if "apartament" in title_lower:
            return "apartment"
        if "vilë" in title_lower or "vile" in title_lower or "villa" in title_lower:
            return "villa"
        if "shtëpi" in title_lower or "shtepi" in title_lower:
            return "house"
        if "tokë" in title_lower or "toke" in title_lower:
            return "land"
        if "garsoniere" in title_lower or "studio" in title_lower:
            return "studio"
        if "garazh" in title_lower or "parking" in title_lower:
            return "garage"
        if "dyqan" in title_lower or "lokal" in title_lower or "biznes" in title_lower:
            return "commercial"
        return "apartment"  # most common default

    @staticmethod
    def _extract_metadata(response):
        """Extract structured metadata from the detail page list items.

        Parses items like "101 m2", "2 Dhoma gjumi", "1 Tualet", "Kati 11".
        """
        result = {
            "area_sqm": None,
            "rooms": None,
            "bathrooms": None,
            "floor": None,
            "total_floors": None,
        }

        # Target the main metadata list (not related listings)
        items = response.css(
            "ul.flex.items-center.list-none li.flex.items-center"
        )
        if not items:
            items = response.css(
                "li.flex.items-center.pb-2"
            )

        for li in items:
            text = li.css("::text").getall()
            text = " ".join(t.strip() for t in text if t.strip())

            # Area: "101 m2", "101 m²", or "101 m 2" (from <sup>2</sup>)
            area_match = re.search(r'(\d+(?:\.\d+)?)\s*m\s*[²2]', text)
            if area_match and not result["area_sqm"]:
                result["area_sqm"] = float(area_match.group(1))
                continue

            # Rooms: "2 Dhoma gjumi"
            rooms_match = re.search(r'(\d+)\s*Dhoma', text, re.IGNORECASE)
            if rooms_match:
                result["rooms"] = int(rooms_match.group(1))
                continue

            # Bathrooms: "1 Tualet" or "2 Tualete"
            bath_match = re.search(r'(\d+)\s*Tualet', text, re.IGNORECASE)
            if bath_match:
                result["bathrooms"] = int(bath_match.group(1))
                continue

            # Floor: "Kati 11" or "Kati 3/5"
            floor_match = re.search(
                r'Kati\s+(\d+)(?:/(\d+))?', text, re.IGNORECASE
            )
            if floor_match:
                result["floor"] = int(floor_match.group(1))
                if floor_match.group(2):
                    result["total_floors"] = int(floor_match.group(2))
                continue

        return result

    @staticmethod
    def _current_page(url):
        """Extract current page number from URL."""
        match = re.search(r'page=(\d+)', url)
        return int(match.group(1)) if match else 1

    @staticmethod
    def _extract_page_num(url):
        """Extract page number from a pagination URL."""
        match = re.search(r'page=(\d+)', url)
        return int(match.group(1)) if match else None
