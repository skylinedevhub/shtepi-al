"""Spider for century21albania.com - Century 21 Albania real estate network.

Century 21 Albania is the largest real estate agency network in Albania with
250+ agents and 30+ offices. Uses a modern Tailwind CSS frontend with
card-based property listings.

URL patterns:
  List:   /en/properties?transaction_type={sale|rent}&page={N}
  Detail: /en/property/{id}/{slug}.html
"""

import re

import scrapy

from shtepi.items import ListingItem


class Century21Spider(scrapy.Spider):
    name = "century21"
    allowed_domains = ["century21albania.com"]

    START_URLS = [
        ("https://www.century21albania.com/en/properties?transaction_type=sale", "sale"),
        ("https://www.century21albania.com/en/properties?transaction_type=rent", "rent"),
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

        for card in response.css('a.c-card[href*="/property/"]'):
            href = card.attrib.get("href", "")
            if href:
                yield scrapy.Request(
                    response.urljoin(href),
                    callback=self.parse_detail,
                    meta={"transaction_type": txn_type},
                )

        # Pagination: follow "next" link
        next_link = response.css('a[rel="next"]::attr(href)').get()
        if not next_link:
            for link in response.css(".pagination a"):
                text = link.css("::text").get("").strip().lower()
                if text == "next":
                    next_link = link.attrib.get("href")
                    break
        if next_link:
            yield scrapy.Request(
                response.urljoin(next_link),
                callback=self.parse,
                meta={"transaction_type": txn_type},
            )

    def parse_detail(self, response):
        """Parse a listing detail page."""
        item = ListingItem()

        item["source"] = "century21"
        item["source_url"] = response.url
        item["source_id"] = self._extract_id(response.url)

        # Title from h1
        title = response.css("h1::text").get("")
        item["title"] = title.strip() or None

        # Price from h2
        price_text = response.css("h2::text").get("")
        item["price"], item["currency_original"] = self._parse_price(price_text)

        # Transaction type from meta or title
        txn = response.meta.get("transaction_type", "sale")
        if item.get("title"):
            title_lower = item["title"].lower()
            if "for rent" in title_lower or "me qera" in title_lower.replace("ë", "e"):
                txn = "rent"
            elif "for sale" in title_lower or "per shitje" in title_lower.replace("ë", "e"):
                txn = "sale"
        item["transaction_type"] = txn
        item["price_period"] = "monthly" if txn == "rent" else "total"

        # Extract metadata paragraphs (e.g. "<strong>Bedrooms</strong> 1")
        metadata = self._extract_metadata(response)

        # Area
        area_text = metadata.get("Gross Area", "") or metadata.get("Interior Area", "")
        area_match = re.search(r'(\d+(?:\.\d+)?)', area_text)
        if area_match:
            item["area_sqm"] = float(area_match.group(1))

        # Bedrooms
        bed_text = metadata.get("Bedrooms", "")
        if bed_text:
            try:
                item["rooms"] = int(bed_text.strip())
            except ValueError:
                pass

        # Floor
        floor_text = metadata.get("Floor", "")
        floor_match = re.search(r'(\d+)', floor_text)
        if floor_match:
            item["floor"] = int(floor_match.group(1))

        # Property type
        type_text = metadata.get("Type", "")
        item["property_type"] = self._detect_property_type(
            type_text or item.get("title") or ""
        )

        # Furnished
        if "Fully Furnished" in metadata or "furnished" in metadata.get("Status", "").lower():
            item["is_furnished"] = True

        # Location from header h6
        location_h6 = response.css(".property-header h6::text").get("")
        if location_h6 and "Property ID" not in location_h6:
            city, neighborhood = self._parse_location(location_h6)
            item["city"] = city
            item["neighborhood"] = neighborhood

        # Room config from title
        if item.get("title"):
            room_match = re.search(r'(\d+\+\d+)', item["title"])
            if room_match:
                item["room_config"] = room_match.group(1)

        # Property info section
        for li in response.css(".property-info li"):
            text = li.css("::text").getall()
            text_joined = " ".join(t.strip() for t in text).lower()
            if "elevator" in text_joined:
                if "no" in text_joined:
                    item["has_elevator"] = False
                elif "yes" in text_joined:
                    item["has_elevator"] = True
            if "baths" in text_joined:
                bath_match = re.search(r'(\d+)', text_joined)
                if bath_match:
                    item["bathrooms"] = int(bath_match.group(1))

        # Features list
        features = response.css(".property-features li::text").getall()
        features_text = " ".join(features).lower()
        if "parking" in features_text:
            item["has_parking"] = True

        # Description
        desc = response.css(".property-description p::text").get("")
        if desc.strip():
            item["description"] = desc.strip()

        # Images
        images = response.css(".property-gallery img::attr(src)").getall()
        item["images"] = images
        item["image_count"] = len(images)

        # Agent info
        agent_name = response.css(".agent-name::text").get()
        if agent_name:
            item["poster_name"] = agent_name.strip()
            item["poster_type"] = "agency"
        agent_phone = response.css(".agent-phone::text").get()
        if agent_phone:
            item["poster_phone"] = agent_phone.strip()

        # Coordinates from map
        map_el = response.css(".property-map")
        if map_el:
            lat = map_el.attrib.get("data-lat")
            lng = map_el.attrib.get("data-lng")
            if lat and lng:
                try:
                    item["latitude"] = float(lat)
                    item["longitude"] = float(lng)
                except ValueError:
                    pass

        yield item

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_id(url):
        """Extract property ID from URL like /en/property/5435177/slug.html."""
        match = re.search(r'/property/(\d+)/', url)
        if match:
            return match.group(1)
        # Fallback: last numeric segment
        nums = re.findall(r'\d+', url)
        return nums[-1] if nums else url.rstrip("/").split("/")[-1]

    @staticmethod
    def _parse_price(text):
        """Parse price like '75,000 €' or '800 €/month'."""
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
        currency = "EUR" if "€" in text else "EUR"
        return price, currency

    @staticmethod
    def _extract_metadata(response):
        """Extract key-value pairs from metadata paragraphs.

        Handles patterns like:
          <p><strong>Bedrooms</strong> 1</p>
          <p><strong>Fully Furnished</strong></p>
        """
        metadata = {}
        for p in response.css(".property-metadata p"):
            strong = p.css("strong::text").get("")
            # Get all text after the strong tag
            full_text = p.css("::text").getall()
            value = ""
            for t in full_text:
                t = t.strip()
                if t and t != strong:
                    value = t
                    break
            if strong:
                metadata[strong.strip()] = value.strip()
        return metadata

    @staticmethod
    def _parse_location(text):
        """Parse location like 'Golem Durrës Albania' into city and neighborhood."""
        if not text:
            return None, None
        text = text.strip()
        # Remove "Albania" suffix
        text = re.sub(r'\s+Albania\s*$', '', text, flags=re.IGNORECASE)
        parts = [p.strip() for p in text.split() if p.strip()]
        if len(parts) >= 2:
            # Last word is city, rest is neighborhood
            city = parts[-1]
            neighborhood = " ".join(parts[:-1])
            return city, neighborhood
        elif len(parts) == 1:
            return parts[0], None
        return None, None

    @staticmethod
    def _detect_property_type(text):
        """Detect property type from text."""
        text_lower = text.lower()
        if "apartment" in text_lower or "apartament" in text_lower:
            return "apartment"
        if "villa" in text_lower:
            return "villa"
        if "house" in text_lower or "shtëpi" in text_lower:
            return "house"
        if "land" in text_lower or "tokë" in text_lower:
            return "land"
        if "studio" in text_lower or "garsoniere" in text_lower:
            return "studio"
        if "office" in text_lower or "shop" in text_lower or "commercial" in text_lower:
            return "commercial"
        return "apartment"
