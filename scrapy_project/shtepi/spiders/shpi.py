"""Spider for shpi.al - Albania's #1 real estate classifieds portal.

Shpi.al is a large Albanian real estate marketplace (~60K listings) powered by
the Flynax classifieds platform. It has rich structured fields including
reference numbers, orientation, mortgage status, and year built.

URL patterns:
  List:   /prona/banimi/ne-shitje/  (paginated as /prona/banimi/ne-shitje/index{N}.html)
  Detail: /prona/banimi/ne-shitje/{slug}-{id}.html
"""

import re

import scrapy

from shtepi.items import ListingItem
from shtepi.normalizers import parse_area, parse_floor


class ShpiSpider(scrapy.Spider):
    name = "shpi"
    allowed_domains = ["shpi.al", "www.shpi.al"]

    START_URLS = [
        "https://www.shpi.al/prona/banimi/ne-shitje/",
        "https://www.shpi.al/prona/banimi/me-qera/",
    ]

    def start_requests(self):
        for url in self.START_URLS:
            txn = "rent" if "me-qera" in url else "sale"
            yield scrapy.Request(
                url, callback=self.parse, meta={"transaction_type": txn}
            )

    def parse(self, response):
        """Parse list page: extract listing links + follow pagination."""
        txn_type = response.meta.get("transaction_type", "sale")

        for article in response.css("article.item"):
            link = article.css(".main-column a.link-large::attr(href)").get()
            if not link:
                link = article.css(".main-column > a::attr(href)").get()
            if link:
                yield scrapy.Request(
                    response.urljoin(link),
                    callback=self.parse_detail,
                    meta={"transaction_type": txn_type},
                )

        # Pagination: next page link
        next_page = response.css(
            'ul.pagination li.navigator.rs a.button::attr(href)'
        ).get()
        if next_page:
            yield scrapy.Request(
                response.urljoin(next_page),
                callback=self.parse,
                meta={"transaction_type": txn_type},
            )

    def parse_detail(self, response):
        """Parse a listing detail page and yield a ListingItem."""
        item = ListingItem()

        item["source"] = "shpi"
        item["source_url"] = response.url
        item["source_id"] = self._extract_id(response.url)

        # Title
        title = response.css("h1::text").get("")
        item["title"] = title.strip() or None

        # Price
        price_text = response.css("b.listing-price::text").get("")
        item["price"], item["currency_original"] = self._parse_price(price_text)

        # Price period
        if "muaj" in price_text.lower():
            item["price_period"] = "monthly"
        else:
            item["price_period"] = "total"

        # Extract structured fields from table-cell divs
        fields = self._extract_fields(response)

        # Transaction type
        prona_ne = fields.get("Prona ne", "").lower()
        if "qera" in prona_ne or "qira" in prona_ne:
            item["transaction_type"] = "rent"
        elif "shitje" in prona_ne:
            item["transaction_type"] = "sale"
        else:
            item["transaction_type"] = response.meta.get("transaction_type", "sale")

        # City
        item["city"] = fields.get("Qyteti")

        # Address / neighborhood
        item["neighborhood"] = fields.get("Adresa")

        # Area
        area_text = fields.get("Siperfaqa") or fields.get("Siperfaqa totale")
        if area_text:
            item["area_sqm"] = parse_area(area_text)

        # Property type
        item["property_type"] = self._detect_property_type(
            fields.get("Lloji prones", ""), item.get("title") or ""
        )

        # Room config (Tipi field: "2+1", "1+1", etc.)
        tipi = fields.get("Tipi", "")
        if tipi:
            item["room_config"] = tipi.strip()
            room_match = re.match(r'^(\d+)', tipi.strip())
            if room_match:
                item["rooms"] = int(room_match.group(1))

        # Floor
        floor_text = fields.get("Kati")
        if floor_text:
            floor, total = parse_floor(floor_text)
            item["floor"] = floor
            if total:
                item["total_floors"] = total

        # Bathrooms
        bath_text = fields.get("Tualete")
        if bath_text:
            try:
                item["bathrooms"] = int(bath_text.strip())
            except ValueError:
                pass

        # Elevator
        elevator = fields.get("Ashensor", "").lower()
        if elevator == "po":
            item["has_elevator"] = True
        elif elevator == "jo":
            item["has_elevator"] = False

        # Parking/garage
        garage = fields.get("Garazh", "").lower()
        if garage == "po":
            item["has_parking"] = True
        elif garage == "jo":
            item["has_parking"] = False

        # Description
        desc = fields.get("Pershkrimi")
        if desc:
            item["description"] = desc.strip()

        # Images
        images = response.css(".gallery-item img::attr(src)").getall()
        if not images:
            images = response.css(".gallery img::attr(src)").getall()
        item["images"] = images
        item["image_count"] = len(images)

        # Contact info
        poster_name = response.css(".account-info .name::text").get()
        if poster_name:
            item["poster_name"] = poster_name.strip()

        phone_link = response.css('a[href^="tel:"]::attr(href)').get()
        if phone_link:
            item["poster_phone"] = phone_link.replace("tel:", "").strip()

        yield item

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_id(url):
        """Extract numeric listing ID from shpi.al URL.

        URLs: /prona/banimi/ne-shitje/{slug}-{id}.html
        """
        match = re.search(r'-(\d+)\.html', url)
        if match:
            return match.group(1)
        # Fallback
        match = re.search(r'(\d{4,})', url.split("/")[-1])
        if match:
            return match.group(1)
        return url.rstrip("/").split("/")[-1]

    @staticmethod
    def _parse_price(text):
        """Parse price text like '€ 243.000,00' or '€ 550,00 / Në muaj'."""
        if not text:
            return None, None
        # Extract numeric part (European format: dots=thousands, comma=decimal)
        price_match = re.search(r'([\d.]+),(\d{2})', text)
        if price_match:
            price_str = price_match.group(1).replace(".", "") + "." + price_match.group(2)
            try:
                price = float(price_str)
                if price <= 0:
                    return None, None
            except ValueError:
                return None, None
        else:
            # Try simple number
            num_match = re.search(r'([\d.,]+)', text)
            if not num_match:
                return None, None
            price_str = num_match.group(1).replace(".", "").replace(",", ".")
            try:
                price = float(price_str)
                if price <= 0:
                    return None, None
            except ValueError:
                return None, None

        # Currency
        if "€" in text or "EUR" in text.upper():
            currency = "EUR"
        elif "Lek" in text or "ALL" in text.upper():
            currency = "ALL"
        else:
            currency = "EUR"

        return price, currency

    @staticmethod
    def _extract_fields(response):
        """Extract key-value pairs from .table-cell structured fields."""
        fields = {}
        for cell in response.css(".table-cell"):
            name = cell.css(".name span::text").get("")
            value_parts = cell.css(".value::text").getall()
            value = " ".join(p.strip() for p in value_parts if p.strip())
            if name and value and name not in fields:
                fields[name.strip()] = value.strip()
        return fields

    @staticmethod
    def _detect_property_type(lloji, title):
        """Detect property type from Lloji prones field or title."""
        combined = (lloji + " " + title).lower()
        if "apartament" in combined:
            return "apartment"
        if "vilë" in combined or "vile" in combined or "villa" in combined:
            return "villa"
        if "shtëpi" in combined or "shtepi" in combined:
            return "house"
        if "tokë" in combined or "toke" in combined or "trual" in combined:
            return "land"
        if "garsoniere" in combined or "studio" in combined:
            return "studio"
        if "garazh" in combined or "parking" in combined:
            return "garage"
        if "dyqan" in combined or "lokal" in combined or "zyre" in combined:
            return "commercial"
        return "apartment"
