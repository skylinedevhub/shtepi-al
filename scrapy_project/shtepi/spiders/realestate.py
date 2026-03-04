"""Spider for realestate.al - Albanian single-agency real estate portal.

RealEstate.al is a single agency portal (RealEstate-al Sh.p.k) focusing on
Tirana properties. Uses SEO-friendly URLs with numeric ID suffix.

URL patterns:
  List:   /en/{type}-for-{sale|rent}-in-{City}
  List p: /en/{type}-for-{sale|rent}-in-{City}/{page}
  Detail: /en/{slug}.{numeric_id}
"""

import re

import scrapy

from shtepi.items import ListingItem


# Categories: (url_path, transaction_type, property_type_hint)
CATEGORIES = [
    ("apartment-for-sale-in-Tirana", "sale", "apartment"),
    ("apartment-for-rent-in-Tirana", "rent", "apartment"),
    ("villa-for-sale-in-Tirana", "sale", "villa"),
    ("villa-for-rent-in-Tirana", "rent", "villa"),
    ("land-for-sale-in-Tirana", "sale", "land"),
    ("office-for-sale-in-Tirana", "sale", "commercial"),
    ("office-for-rent-in-Tirana", "rent", "commercial"),
]


class RealestateSpider(scrapy.Spider):
    name = "realestate"
    allowed_domains = ["realestate.al", "www.realestate.al"]

    def start_requests(self):
        for path, txn, ptype in CATEGORIES:
            url = f"https://www.realestate.al/en/{path}"
            yield scrapy.Request(
                url,
                callback=self.parse,
                meta={"transaction_type": txn, "property_type_hint": ptype},
            )

    def parse(self, response):
        """Parse search results page with property cards."""
        txn_type = response.meta.get("transaction_type", "sale")
        ptype_hint = response.meta.get("property_type_hint", "apartment")

        for card in response.css(".property-container"):
            link = card.css(".property-title a::attr(href)").get()
            if link:
                yield scrapy.Request(
                    response.urljoin(link),
                    callback=self.parse_detail,
                    meta={
                        "transaction_type": txn_type,
                        "property_type_hint": ptype_hint,
                    },
                )

        # Pagination: next page link (» symbol)
        for li in response.css(".pagination li"):
            text = li.css("a::text").get("").strip()
            if text == "»":
                href = li.css("a::attr(href)").get()
                if href:
                    yield scrapy.Request(
                        response.urljoin(href),
                        callback=self.parse,
                        meta={
                            "transaction_type": txn_type,
                            "property_type_hint": ptype_hint,
                        },
                    )
                break

    def parse_detail(self, response):
        """Parse a listing detail page."""
        item = ListingItem()

        item["source"] = "realestate"
        item["source_url"] = response.url
        item["source_id"] = self._extract_id(response.url)

        # Title
        title = response.css("h1::text").get("")
        item["title"] = title.strip() or None

        # Features table
        features = self._extract_features_table(response)

        # Price from table (European format: 353.000)
        price_text = features.get("Price €", "")
        item["price"], item["currency_original"] = self._parse_price(price_text)

        # Transaction type
        status = features.get("Status", "").lower()
        txn = response.meta.get("transaction_type", "sale")
        if "for sale" in status or "sale" in status:
            txn = "sale"
        elif "for rent" in status or "rent" in status:
            txn = "rent"
        item["transaction_type"] = txn
        item["price_period"] = "monthly" if txn == "rent" else "total"

        # Property type
        type_text = features.get("Type", "")
        if type_text:
            item["property_type"] = self._detect_property_type(type_text)
        else:
            item["property_type"] = response.meta.get("property_type_hint", "apartment")

        # City
        city = features.get("City", "")
        if city:
            item["city"] = city.strip()

        # Address as neighborhood
        address_el = response.css("table td a::text").get("")
        if not address_el:
            address_el = features.get("Address", "")
        if address_el:
            item["neighborhood"] = address_el.strip()

        # Area
        area_text = features.get("Surface m2", "")
        area_match = re.search(r'(\d+(?:[.,]\d+)?)', area_text)
        if area_match:
            item["area_sqm"] = float(area_match.group(1).replace(",", "."))

        # Bedrooms
        bed_text = features.get("Bedrooms", "")
        if bed_text:
            try:
                item["rooms"] = int(bed_text.strip())
            except ValueError:
                pass

        # Bathrooms
        bath_text = features.get("Bathrooms", "")
        if bath_text:
            try:
                item["bathrooms"] = int(bath_text.strip())
            except ValueError:
                pass

        # Floor
        floor_text = features.get("Floor", "")
        floor_match = re.search(r'(\d+)', floor_text)
        if floor_match:
            item["floor"] = int(floor_match.group(1))

        # Parking
        parking = features.get("Parking", "").lower()
        if parking == "yes":
            item["has_parking"] = True
        elif parking == "no":
            item["has_parking"] = False

        # Room config from title
        if item.get("title"):
            room_match = re.search(r'(\d+\+\d+)', item["title"])
            if room_match:
                item["room_config"] = room_match.group(1)

        # Description
        desc_parts = response.css(".property-description p::text").getall()
        description = "\n".join(p.strip() for p in desc_parts if p.strip())
        if description:
            item["description"] = description

        # Images from gallery
        images = response.css(".property-gallery img::attr(src), .slider img::attr(src)").getall()
        item["images"] = images
        item["image_count"] = len(images)

        # Contact (single agency)
        phone = response.css(".phone-number::text").get()
        if phone:
            item["poster_phone"] = phone.strip()
        item["poster_name"] = "RealEstate.al"
        item["poster_type"] = "agency"

        # Internal ID from table
        internal_id = features.get("ID", "")
        if internal_id:
            item["source_id"] = self._extract_id(response.url)

        yield item

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_id(url):
        """Extract numeric ID from URL like /en/slug.9570."""
        match = re.search(r'\.(\d+)$', url.rstrip("/"))
        if match:
            return match.group(1)
        # Fallback
        nums = re.findall(r'\d+', url)
        return nums[-1] if nums else url.rstrip("/").split("/")[-1]

    @staticmethod
    def _parse_price(text):
        """Parse European price like '353.000' (dots as thousands separator)."""
        if not text:
            return None, None
        text = text.strip()
        # European format: 353.000 (dots separate thousands)
        # Remove dots used as thousand separators
        cleaned = re.sub(r'\.(?=\d{3})', '', text)
        # Now parse the number
        num_match = re.search(r'(\d+(?:,\d+)?)', cleaned)
        if not num_match:
            return None, None
        price_str = num_match.group(1).replace(",", ".")
        try:
            price = float(price_str)
            if price <= 0:
                return None, None
        except ValueError:
            return None, None
        return price, "EUR"

    @staticmethod
    def _extract_features_table(response):
        """Extract key-value pairs from the property features table."""
        features = {}
        for row in response.css("table tr"):
            key_el = row.css("td strong::text").get("")
            if not key_el:
                continue
            # Value is in the second td
            tds = row.css("td")
            if len(tds) >= 2:
                val = tds[1].css("::text").get("").strip()
                if not val:
                    val = tds[1].css("a::text").get("").strip()
                features[key_el.strip()] = val
        return features

    @staticmethod
    def _detect_property_type(text):
        """Detect property type from text."""
        text_lower = text.lower()
        if "apartment" in text_lower:
            return "apartment"
        if "villa" in text_lower:
            return "villa"
        if "house" in text_lower:
            return "house"
        if "land" in text_lower:
            return "land"
        if "office" in text_lower:
            return "commercial"
        if "warehouse" in text_lower:
            return "commercial"
        if "commercial" in text_lower:
            return "commercial"
        if "studio" in text_lower:
            return "studio"
        return "apartment"
