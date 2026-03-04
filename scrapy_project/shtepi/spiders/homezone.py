"""Spider for homezone.al - Albanian real estate portal.

Homezone is an Angular-based real estate platform with ~30K+ listings.
Rich detail pages with price history, stats, and agent contact info.

URL patterns:
  List:   /properties/{sale|rent}?page={N}
  Detail: /property/{sale|rent}/{city}/{slug}-{numeric_id}
"""

import re

import scrapy

from shtepi.items import ListingItem


class HomezoneSpider(scrapy.Spider):
    name = "homezone"
    allowed_domains = ["homezone.al"]

    START_URLS = [
        ("https://homezone.al/properties/sale", "sale"),
        ("https://homezone.al/properties/rent", "rent"),
    ]

    def start_requests(self):
        for url, txn in self.START_URLS:
            yield scrapy.Request(
                url,
                callback=self.parse,
                meta={"transaction_type": txn},
            )

    def parse(self, response):
        """Parse search results page with property cards."""
        txn_type = response.meta.get("transaction_type", "sale")

        for card in response.css(".property-row"):
            link = card.css("a.property-body::attr(href)").get()
            if link:
                yield scrapy.Request(
                    response.urljoin(link),
                    callback=self.parse_detail,
                    meta={"transaction_type": txn_type},
                )

        # Pagination
        current_page = 1
        current_url = response.url
        page_match = re.search(r'page=(\d+)', current_url)
        if page_match:
            current_page = int(page_match.group(1))
        next_page = current_page + 1
        next_link = response.css(
            f'.pagination a[href*="page={next_page}"]::attr(href)'
        ).get()
        if next_link:
            yield scrapy.Request(
                response.urljoin(next_link),
                callback=self.parse,
                meta={"transaction_type": txn_type},
            )

    def parse_detail(self, response):
        """Parse a listing detail page."""
        item = ListingItem()

        item["source"] = "homezone"
        item["source_url"] = response.url
        item["source_id"] = self._extract_id(response.url)

        # Title from h1
        title = response.css("h1::text").get("")
        item["title"] = title.strip() or None

        # Price — format: €350,000.00
        price_text = response.css(
            ".property-price-row .header-primary span::text"
        ).getall()
        price_str = " ".join(price_text).strip()
        item["price"], item["currency_original"] = self._parse_price(price_str)

        # Transaction type from URL
        txn = response.meta.get("transaction_type", "sale")
        if "/property/rent/" in response.url:
            txn = "rent"
        elif "/property/sale/" in response.url:
            txn = "sale"
        item["transaction_type"] = txn
        item["price_period"] = "monthly" if txn == "rent" else "total"

        # Address — "Kodra e Diellit, Tiranë"
        address = response.css(".property-address::text").get("")
        if address.strip():
            parts = [p.strip() for p in address.strip().split(",")]
            if len(parts) >= 2:
                item["neighborhood"] = parts[0]
                item["city"] = parts[-1]
            elif len(parts) == 1:
                item["city"] = parts[0]

        # Rooms, bathrooms, area from property-info spans
        rooms_text = response.css(
            'span[title="Numri i dhomave"]::text'
        ).get("")
        if rooms_text.strip():
            try:
                item["rooms"] = int(rooms_text.strip())
            except ValueError:
                pass

        baths_text = response.css(
            'span[title="Numri i banjove"]::text'
        ).get("")
        if baths_text.strip():
            try:
                item["bathrooms"] = int(baths_text.strip())
            except ValueError:
                pass

        area_text = response.css(
            'span[title="Surface in sqm"]::text'
        ).get("")
        area_match = re.search(r'(\d+(?:\.\d+)?)', area_text)
        if area_match:
            item["area_sqm"] = float(area_match.group(1))

        # Property type from breadcrumb (last item)
        breadcrumb_items = response.css(
            ".property-breadcrumb li:last-child span::text"
        ).getall()
        breadcrumb_type = " ".join(breadcrumb_items).strip()
        if breadcrumb_type:
            item["property_type"] = self._detect_property_type(breadcrumb_type)
        elif item.get("title"):
            item["property_type"] = self._detect_property_type(item["title"])

        # Room config from title
        if item.get("title"):
            room_match = re.search(r'(\d+\+\d+(?:\+\d+)?)', item["title"])
            if room_match:
                item["room_config"] = room_match.group(1)

        # Description
        desc = response.css(
            ".property-description p::text"
        ).get("")
        if desc.strip():
            item["description"] = desc.strip()

        # Images from gallery
        images = response.css(
            ".property-gallery img.property-image::attr(src)"
        ).getall()
        item["images"] = images
        item["image_count"] = len(images)

        # Agent contact
        agent_name = response.css(".contact-name::text").get("")
        if agent_name.strip():
            item["poster_name"] = agent_name.strip()
            item["poster_type"] = "agency"

        phone_link = response.css('a[href^="tel:"]::attr(href)').get("")
        if phone_link:
            phone = phone_link.replace("tel:", "").replace("+", "").strip()
            if phone:
                item["poster_phone"] = phone

        yield item

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_id(url):
        """Extract numeric ID from URL like /property/sale/tirane/slug-168614."""
        match = re.search(r'-(\d+)$', url.rstrip("/"))
        if match:
            return match.group(1)
        # Fallback
        nums = re.findall(r'\d+', url)
        return nums[-1] if nums else url.rstrip("/").split("/")[-1]

    @staticmethod
    def _parse_price(text):
        """Parse price like '€350,000.00' or '€600.00'."""
        if not text:
            return None, None
        text = text.strip()
        # Remove currency symbol
        num_match = re.search(r'([\d,]+(?:\.\d+)?)', text)
        if not num_match:
            return None, None
        price_str = num_match.group(1).replace(",", "")
        try:
            price = float(price_str)
            if price <= 0:
                return None, None
        except ValueError:
            return None, None
        currency = "EUR" if "€" in text else "ALL"
        return price, currency

    @staticmethod
    def _detect_property_type(text):
        """Detect property type from Albanian text."""
        text_lower = text.lower()
        if "garsoniere" in text_lower or "studio" in text_lower:
            return "studio"
        if "apartament" in text_lower or "apartment" in text_lower:
            return "apartment"
        if "dupleks" in text_lower or "duplex" in text_lower:
            return "apartment"
        if "vilë" in text_lower or "vila" in text_lower or "villa" in text_lower:
            return "villa"
        if "shtëpi" in text_lower or "shtepi" in text_lower:
            return "house"
        if "tokë" in text_lower or "toke" in text_lower:
            return "land"
        if "zyrë" in text_lower or "zyre" in text_lower or "office" in text_lower:
            return "commercial"
        return "apartment"
