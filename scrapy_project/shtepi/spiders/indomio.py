"""Spider for indomio.al - Albania's largest real estate aggregator.

Indomio.al is a property portal powered by the Spitogatos network (~35K sale
listings). It features agency-heavy listings with detailed property features.
Behind Reese Security bot protection — requires browser impersonation.

URL patterns:
  List:   /en/for-sale/property/{region}?page={N}
  Rent:   /en/to-rent/property/{region}?page={N}
  Detail: /en/{numeric_id}
"""

import re

import scrapy

from shtepi.items import ListingItem


# Major Albanian regions on indomio.al
REGIONS = [
    "tirana-city",
    "tirana-suburbs",
    "durres-perfecture",
    "vlora-perfecture",
    "shkodra-perfecture",
    "korca-perfecture",
    "fieri-perfecture",
    "elbasan-perfecture",
    "berat-perfecture",
    "lezha-perfecture",
    "gjirokaster-perfecture",
]


class IndomioSpider(scrapy.Spider):
    name = "indomio"
    allowed_domains = ["indomio.al", "www.indomio.al"]

    # Playwright needed to bypass Reese Security JS challenge.
    # robots.txt disabled because the protection blocks robots.txt fetches too.
    custom_settings = {
        "DOWNLOAD_HANDLERS": {
            "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
        },
        "PLAYWRIGHT_BROWSER_TYPE": "chromium",
        "ROBOTSTXT_OBEY": False,
        "TWISTED_REACTOR": "twisted.internet.asyncioreactor.AsyncioSelectorReactor",
    }

    def start_requests(self):
        for region in REGIONS:
            for txn, path in [("sale", "for-sale"), ("rent", "to-rent")]:
                url = f"https://www.indomio.al/en/{path}/property/{region}"
                yield scrapy.Request(
                    url,
                    callback=self.parse,
                    meta={"transaction_type": txn, "playwright": True},
                )

    def parse(self, response):
        """Parse search results page with property cards."""
        txn_type = response.meta.get("transaction_type", "sale")

        for card in response.css("div.property"):
            detail_url = card.attrib.get("data-targeturl")
            if not detail_url:
                link = card.css("h3.property__title a::attr(href)").get()
                if link:
                    # Remove ?position=N
                    detail_url = re.sub(r'\?position=\d+', '', link)
            if detail_url:
                yield scrapy.Request(
                    response.urljoin(detail_url),
                    callback=self.parse_detail,
                    meta={"transaction_type": txn_type, "playwright": True},
                )

        # Pagination: follow "next" link
        next_link = response.css(
            '.pagination a, .mobile-listing-pagination a'
        )
        for link in next_link:
            text = link.css("::text").get("").strip().lower()
            if text == "next" or "angle-right" in (link.attrib.get("class", "")):
                href = link.attrib.get("href")
                if href and "page=" in href:
                    yield scrapy.Request(
                        response.urljoin(href),
                        callback=self.parse,
                        meta={"transaction_type": txn_type, "playwright": True},
                    )
                    break

    def parse_detail(self, response):
        """Parse a listing detail page."""
        item = ListingItem()

        item["source"] = "indomio"
        item["source_url"] = response.url
        item["source_id"] = self._extract_id(response.url)

        # Title
        title = response.css("h1::text").get("")
        item["title"] = title.strip() or None

        # Extract features table
        features = self._extract_features_table(response)

        # Price
        price_text = features.get("Price", "")
        if not price_text:
            price_text = response.css(".price-value::text").get("")
        item["price"], item["currency_original"] = self._parse_price(price_text)

        # Transaction type
        txn = response.meta.get("transaction_type", "sale")
        if item.get("title"):
            title_lower = item["title"].lower()
            if "for rent" in title_lower or "to rent" in title_lower:
                txn = "rent"
            elif "for sale" in title_lower:
                txn = "sale"
        item["transaction_type"] = txn
        item["price_period"] = "monthly" if txn == "rent" else "total"

        # Location from Neighborhood field: "Harry Fultz (Tirana - city)"
        neighborhood_raw = features.get("Neighborhood", "")
        city, neighborhood = self._parse_neighborhood(neighborhood_raw)
        item["city"] = city
        item["neighborhood"] = neighborhood

        # Property type from title
        item["property_type"] = self._detect_property_type(
            item.get("title") or ""
        )

        # Area from summary
        area_text = response.css("ul.listing-summary li strong::text").get("")
        area_match = re.search(r'(\d+(?:\.\d+)?)', area_text)
        if area_match:
            item["area_sqm"] = float(area_match.group(1))

        # Bedrooms from summary
        for li in response.css("ul.listing-summary li::text").getall():
            bed_match = re.search(r'Bedrooms:\s*(\d+)', li)
            if bed_match:
                item["rooms"] = int(bed_match.group(1))
            bath_match = re.search(r'Bathrooms:\s*(\d+)', li)
            if bath_match:
                item["bathrooms"] = int(bath_match.group(1))

        # Bathrooms from features table (fallback)
        if not item.get("bathrooms"):
            bath_val = features.get("Bathrooms")
            if bath_val:
                try:
                    item["bathrooms"] = int(bath_val.strip())
                except ValueError:
                    pass

        # Floor from features table
        floor_text = features.get("Floor", "")
        floor_match = re.search(r'(\d+)', floor_text)
        if floor_match:
            item["floor"] = int(floor_match.group(1))

        # Parking
        parking_val = features.get("Parking", "").lower()
        if parking_val == "yes":
            item["has_parking"] = True
        elif parking_val == "no":
            item["has_parking"] = False

        # Room config from description
        desc_parts = response.css(".description-text p::text").getall()
        description = "\n".join(p.strip() for p in desc_parts if p.strip())
        if description:
            item["description"] = description
            room_match = re.search(r'(\d+\+\d+)', description)
            if room_match:
                item["room_config"] = room_match.group(1)

        # More info features
        more_info = response.css(".listing-more-info li::text").getall()
        more_info_text = " ".join(more_info).lower()
        if "elevator" in more_info_text:
            item["has_elevator"] = True
        if "parking" in more_info_text:
            item["has_parking"] = True
        if "furnished" in (features.get("Status", "").lower()):
            item["is_furnished"] = True

        # Images — Spitogatos network hosts images on m{1,2,3}.spitogatos.gr
        images = response.css('a[href*="spitogatos"]::attr(href)').getall()
        if not images:
            images = response.css('img[src*="spitogatos"]::attr(src)').getall()
        item["images"] = images
        item["image_count"] = len(images)

        # Agent info
        agent_name = response.css(".agent-details h3 a::text").get()
        if agent_name:
            item["poster_name"] = agent_name.strip()
            item["poster_type"] = "agency"

        yield item

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_id(url):
        """Extract numeric listing ID from URL like /en/13231793."""
        match = re.search(r'/en/(\d{7,})', url)
        if match:
            return match.group(1)
        return url.rstrip("/").split("/")[-1]

    @staticmethod
    def _parse_price(text):
        """Parse price like '€ 265,000' or '139,800'."""
        if not text:
            return None, None
        num_match = re.search(r'([\d,]+)', text)
        if not num_match:
            return None, None
        price_str = num_match.group(1).replace(",", "")
        try:
            price = float(price_str)
            if price <= 0:
                return None, None
        except ValueError:
            return None, None

        currency = "EUR" if "€" in text else "EUR"
        return price, currency

    @staticmethod
    def _parse_neighborhood(text):
        """Parse 'Harry Fultz (Tirana - city)' into city and neighborhood."""
        if not text:
            return None, None
        match = re.match(r'^(.+?)\s*\((.+?)\)\s*$', text)
        if match:
            neighborhood = match.group(1).strip()
            city_raw = match.group(2).strip()
            # "Tirana - city" -> "Tirana"
            city = re.sub(r'\s*-\s*city$', '', city_raw)
            return city, neighborhood
        return text.strip(), None

    @staticmethod
    def _detect_property_type(title):
        """Detect property type from English title."""
        title_lower = title.lower()
        if "apartment" in title_lower or "flat" in title_lower:
            return "apartment"
        if "detached house" in title_lower or "house" in title_lower:
            return "house"
        if "villa" in title_lower:
            return "villa"
        if "land" in title_lower or "plot" in title_lower:
            return "land"
        if "studio" in title_lower:
            return "studio"
        if "office" in title_lower or "shop" in title_lower or "commercial" in title_lower:
            return "commercial"
        if "garage" in title_lower or "parking" in title_lower:
            return "garage"
        return "apartment"

    @staticmethod
    def _extract_features_table(response):
        """Extract key-value pairs from the features table."""
        features = {}
        for row in response.css(".listing-features table tr"):
            key = row.css("th::text").get("")
            val = row.css("td::text").get("")
            if key and val:
                features[key.strip()] = val.strip()
        return features
