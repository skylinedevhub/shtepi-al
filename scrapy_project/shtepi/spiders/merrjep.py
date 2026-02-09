"""Spider for merrjep.al - Albanian classifieds site.

Crawls real estate listings (apartments, houses, villas, land)
across major Albanian cities.
"""

import re
from urllib.parse import urljoin

import scrapy

from shtepi.items import ListingItem
from shtepi.normalizers import parse_area, parse_floor, parse_price_text


class MerrjepSpider(scrapy.Spider):
    """Crawl merrjep.al real estate listings."""

    name = "merrjep"
    allowed_domains = ["www.merrjep.al", "merrjep.al"]

    # Category URL patterns:
    # /njoftime/imobiliare-vendbanime/{property_type}/{transaction}/{city}
    BASE = "https://www.merrjep.al/njoftime/imobiliare-vendbanime"

    # Property categories on merrjep.al
    PROPERTY_CATEGORIES = {
        "apartamente": "apartment",
        "shtepi": "house",
        "vila": "villa",
        "toka-fusha": "land",
    }

    # Transaction type URL segments
    TRANSACTIONS = {
        "ne-shitje": "sale",
        "me-qera": "rent",
    }

    # Major cities to crawl
    CITIES = [
        "tirane",
        "durres",
        "vlore",
        "sarande",
        "shkoder",
        "elbasan",
        "fier",
        "korce",
    ]

    def start_requests(self):
        """Generate start URLs for all property/transaction/city combos."""
        for category, prop_type in self.PROPERTY_CATEGORIES.items():
            for tx_segment, tx_type in self.TRANSACTIONS.items():
                for city in self.CITIES:
                    url = f"{self.BASE}/{category}/{tx_segment}/{city}"
                    yield scrapy.Request(
                        url,
                        callback=self.parse,
                        meta={
                            "property_type": prop_type,
                            "transaction_type": tx_type,
                        },
                    )

    def parse(self, response):
        """Parse a category listing page to extract detail links and pagination.

        Yields:
            Request for each listing detail page (callback=parse_detail).
            Request for the next pagination page (callback=parse).
        """
        # Extract listing links from product cards
        for card in response.css("div.product-item"):
            link = card.css("a.product-item-link::attr(href)").get()
            if link:
                detail_url = response.urljoin(link)
                yield scrapy.Request(
                    detail_url,
                    callback=self.parse_detail,
                    meta=response.meta.copy(),
                )

        # Follow pagination -- look for 'next' page link
        next_page = response.css("span.page-item.next a::attr(href)").get()
        if next_page:
            yield scrapy.Request(
                response.urljoin(next_page),
                callback=self.parse,
                meta=response.meta.copy(),
            )

    def parse_detail(self, response):
        """Parse a listing detail page and yield a ListingItem.

        Extracts all available fields: title, price, images, property
        attributes, description, seller info, and location.
        """
        item = ListingItem()

        # -- Identity --
        item["source"] = "merrjep"
        item["source_url"] = response.url
        item["source_id"] = self._extract_id(response.url)

        # -- Title --
        item["title"] = response.css("h1.listing-title::text").get("").strip() or None

        # -- Price --
        price_value = response.css("span.format-money::attr(value)").get()
        currency_text = response.css("span.currency::text").get()

        if price_value:
            try:
                price_num = float(price_value)
                if price_num > 0:
                    item["price"] = price_num
                    item["currency_original"] = (
                        currency_text.strip() if currency_text else "EUR"
                    )
                else:
                    item["price"] = None
                    item["currency_original"] = None
            except (ValueError, TypeError):
                item["price"] = None
                item["currency_original"] = None
        else:
            item["price"] = None
            item["currency_original"] = None

        # -- Transaction type: infer from URL --
        item["transaction_type"] = self._detect_transaction_type(response.url)

        # -- Property type: infer from URL or meta --
        item["property_type"] = self._detect_property_type(response)

        # -- Property attributes --
        properties = self._extract_properties(response)

        item["room_config"] = properties.get("tipologjia")
        item["rooms"] = self._safe_int(properties.get("numri_i_dhomave"))
        item["area_sqm"] = parse_area(properties.get("siperfaqe"))

        floor_text = properties.get("kati")
        floor, total_floors = parse_floor(floor_text)
        item["floor"] = floor
        item["total_floors"] = total_floors

        item["city"] = properties.get("komuna")
        item["neighborhood"] = properties.get("adresa")

        # -- Images --
        # Prefer full-res images from fancybox gallery links
        images = response.css(
            'a[data-fancybox="gallery"]::attr(href)'
        ).getall()
        # Fallback to data-src on carousel images
        if not images:
            images = response.css(
                ".carousel-item img::attr(data-src)"
            ).getall()
        # Filter out placeholder/skeleton images
        images = [
            img for img in images
            if img and "skeleton" not in img and "placeholder" not in img
        ]
        item["images"] = images

        # -- Description --
        desc_parts = response.css(".description-text ::text").getall()
        if desc_parts:
            description = " ".join(part.strip() for part in desc_parts if part.strip())
            item["description"] = description if description else None
        else:
            item["description"] = None

        # -- Seller info --
        item["poster_name"] = (
            response.css(".shitesit-te-besuar h3.seller-name::text").get("").strip()
            or response.css(".shitesit-te-besuar h3::text").get("").strip()
            or None
        )

        phone_link = response.css(".seller-contact a.phone-number::attr(href)").get()
        if phone_link and phone_link.startswith("tel:"):
            item["poster_phone"] = phone_link.replace("tel:", "").strip()
        else:
            phone_text = response.css(".seller-contact a.phone-number::text").get()
            item["poster_phone"] = phone_text.strip() if phone_text else None

        # Poster type: trusted sellers are agencies
        if response.css(".shitesit-te-besuar .seller-badge"):
            item["poster_type"] = "agency"
        else:
            item["poster_type"] = "private"

        yield item

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_id(url):
        """Extract the numeric listing ID from the URL.

        MerrJep URLs: /njoftim/{slug}/{numeric_id}
        """
        match = re.search(r'/njoftim/[^/]+/(\d+)', url)
        if match:
            return match.group(1)
        # Fallback: last path segment
        parts = url.rstrip("/").split("/")
        return parts[-1] if parts else None

    @staticmethod
    def _detect_transaction_type(url):
        """Detect sale vs rent from URL path or slug.

        Keywords: ne-shitje, shitje, shitet -> sale
                  me-qera, qera, qira, me-qira -> rent
        """
        url_lower = url.lower()
        rent_keywords = ["me-qera", "me-qira", "qera", "qira"]
        for keyword in rent_keywords:
            if keyword in url_lower:
                return "rent"
        # Default to sale (shitje, shitet, ne-shitje, or unspecified)
        return "sale"

    @staticmethod
    def _detect_property_type(response):
        """Detect property type from response meta or URL breadcrumbs."""
        # From meta (set during start_requests)
        prop_type = response.meta.get("property_type")
        if prop_type:
            return prop_type

        # From URL path
        url_lower = response.url.lower()
        if "apartamente" in url_lower or "apartament" in url_lower:
            return "apartment"
        if "vila" in url_lower:
            return "villa"
        if "shtepi" in url_lower or "shtëpi" in url_lower:
            return "house"
        if "toka" in url_lower or "toke" in url_lower or "trual" in url_lower:
            return "land"

        # From breadcrumb
        breadcrumbs = response.css("nav.breadcrumb a::text").getall()
        breadcrumb_text = " ".join(breadcrumbs).lower()
        if "apartamente" in breadcrumb_text:
            return "apartment"
        if "vila" in breadcrumb_text:
            return "villa"
        if "shtepi" in breadcrumb_text:
            return "house"

        return "apartment"  # default

    @staticmethod
    def _extract_properties(response):
        """Extract property key-value pairs from the listing attributes section.

        Returns dict with normalized keys like:
            tipologjia, siperfaqe, kati, komuna, adresa, numri_i_dhomave, gjendje
        """
        props = {}
        for row in response.css(".listing-properties .property-row"):
            label = row.css(".property-label::text").get("")
            value = row.css(".property-value::text").get("")
            label = label.strip().rstrip(":").lower()
            value = value.strip()
            if not label or not value:
                continue

            # Normalize label to a key
            key = (
                label
                .replace("ë", "e")
                .replace("ç", "c")
                .replace(" ", "_")
            )
            props[key] = value
        return props

    @staticmethod
    def _safe_int(value):
        """Safely convert a value to int, returning None on failure."""
        if value is None:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
