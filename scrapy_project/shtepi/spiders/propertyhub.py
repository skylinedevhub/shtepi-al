"""Spider for propertyhub.al - Albanian real estate marketplace.

PropertyHub is a WordPress-based real estate platform with city/area taxonomy.
Albanian-language listings with structured metadata.

URL patterns:
  List:   /properties/?type={sale|rent}
  List p: /properties/page/{N}/?type={sale|rent}
  Detail: /properties/{slug}/
"""

import re

import scrapy

from shtepi.items import ListingItem


class PropertyhubSpider(scrapy.Spider):
    name = "propertyhub"
    allowed_domains = ["propertyhub.al"]

    START_URLS = [
        ("https://propertyhub.al/properties/?type=sale", "sale"),
        ("https://propertyhub.al/properties/?type=rent", "rent"),
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

        for card in response.css(".property_listing_blog"):
            link = card.css("h4 a::attr(href)").get()
            if not link:
                link = card.attrib.get("data-link")
            if link:
                yield scrapy.Request(
                    response.urljoin(link),
                    callback=self.parse_detail,
                    meta={"transaction_type": txn_type},
                )

        # Pagination: next page (fa-angle-right icon)
        for li in response.css(".pagination li"):
            icon = li.css("span.fa-angle-right")
            if icon:
                href = li.css("a::attr(href)").get()
                if href:
                    yield scrapy.Request(
                        response.urljoin(href),
                        callback=self.parse,
                        meta={"transaction_type": txn_type},
                    )
                break

    def parse_detail(self, response):
        """Parse a listing detail page."""
        item = ListingItem()

        item["source"] = "propertyhub"
        item["source_url"] = response.url
        item["source_id"] = self._extract_id(response.url)

        # Title
        title = response.css("h1::text").get("")
        item["title"] = title.strip() or None

        # Price
        price_text = response.css(".listing_price::text").get("")
        item["price"], item["currency_original"] = self._parse_price(price_text)

        # Transaction type from labels or title
        txn = response.meta.get("transaction_type", "sale")
        labels = response.css(".property-labels a::text, .label-sale::text, .label-rent::text").getall()
        labels_lower = " ".join(labels).lower()
        if "shitje" in labels_lower or "sale" in labels_lower:
            txn = "sale"
        elif "qira" in labels_lower or "rent" in labels_lower:
            txn = "rent"
        elif item.get("title"):
            title_lower = item["title"].lower()
            if "shitje" in title_lower:
                txn = "sale"
            elif "qira" in title_lower:
                txn = "rent"
        item["transaction_type"] = txn
        item["price_period"] = "monthly" if txn == "rent" else "total"

        # City and area from links
        city = response.css(".property_city::text, a[href*='/city/']::text").get()
        if city:
            item["city"] = city.strip()
        area = response.css(".property_area::text, a[href*='/area/']::text").get()
        if area:
            item["neighborhood"] = area.strip()

        # Property stats: bedrooms, rooms, bathrooms, area
        for li in response.css(".listing_detail li, .property_stats li"):
            text = li.css("::text").getall()
            text_joined = " ".join(t.strip() for t in text).strip()
            text_lower = text_joined.lower()

            bed_match = re.search(r'(\d+)\s*dhoma?\s*gjumi', text_lower)
            if bed_match:
                item["rooms"] = int(bed_match.group(1))
                continue

            bath_match = re.search(r'(\d+)\s*banjo', text_lower)
            if bath_match:
                item["bathrooms"] = int(bath_match.group(1))
                continue

            area_match = re.search(r'([\d.]+)\s*m', text_lower)
            if area_match and "dhom" not in text_lower and "banjo" not in text_lower:
                item["area_sqm"] = float(area_match.group(1))
                continue

        # Property type from category or title
        category = response.css(
            ".property_meta a::text, .label-category::text, a[href*='/listings-al/']::text"
        ).get("")
        item["property_type"] = self._detect_property_type(
            category or item.get("title") or ""
        )

        # Room config from title
        if item.get("title"):
            room_match = re.search(r'(\d+\+\d+(?:\+\d+)?)', item["title"])
            if room_match:
                item["room_config"] = room_match.group(1)

        # Description
        desc_parts = response.css(".property_description p::text").getall()
        description = "\n".join(p.strip() for p in desc_parts if p.strip())
        if description:
            item["description"] = description

        # Features
        features_text = " ".join(
            response.css(".feature_item::text, .property_features .feature_item::text").getall()
        ).lower()
        if "mobiluar" in features_text:
            item["is_furnished"] = True
        if "parking" in features_text or "garazh" in features_text:
            item["has_parking"] = True
        if "ashensor" in features_text or "elevator" in features_text:
            item["has_elevator"] = True

        # Images
        images = response.css(".property-gallery img::attr(src)").getall()
        item["images"] = images
        item["image_count"] = len(images)

        # Agent
        agent_name = response.css(".agent-name a::text, .agent-name::text").get()
        if agent_name:
            item["poster_name"] = agent_name.strip()
            item["poster_type"] = "agency"
        agent_phone = response.css(".agent-phone::text, a[href^='tel:']::text").get()
        if agent_phone:
            item["poster_phone"] = agent_phone.strip()

        yield item

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_id(url):
        """Extract slug as ID from URL like /properties/{slug}/."""
        match = re.search(r'/properties/([^/]+)/?$', url.rstrip("/") + "/")
        if match:
            return match.group(1)
        return url.rstrip("/").split("/")[-1]

    @staticmethod
    def _parse_price(text):
        """Parse price like '€ 260,000' or '€ 550/muaj'."""
        if not text:
            return None, None
        text = text.strip()
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
        """Detect property type from Albanian/English text."""
        text_lower = text.lower()
        if "garsoniere" in text_lower or "studio" in text_lower:
            return "studio"
        if "apartament" in text_lower or "apartment" in text_lower:
            return "apartment"
        if "dupleks" in text_lower or "duplex" in text_lower:
            return "apartment"
        if "vilë" in text_lower or "villa" in text_lower or "vile" in text_lower:
            return "villa"
        if "shtëpi" in text_lower or "house" in text_lower or "shtepi" in text_lower:
            return "house"
        if "tokë" in text_lower or "toke" in text_lower or "land" in text_lower:
            return "land"
        if "zyrë" in text_lower or "office" in text_lower or "zyre" in text_lower:
            return "commercial"
        if "klinik" in text_lower or "commercial" in text_lower:
            return "commercial"
        return "apartment"
