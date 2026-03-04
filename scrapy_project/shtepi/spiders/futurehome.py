"""Spider for futurehome.al - Albanian real estate agency network.

Future Home is Albania's largest real estate franchise with 250+ agents
and 30+ offices. Rich listing pages with agent info and reference codes.

URL patterns:
  List:   /properties?transaction={sale|rent}&page={N}
  Detail: /property/{crm_id}/{slug}-{ref_code}.html
"""

import re

import scrapy

from shtepi.items import ListingItem


class FuturehomeSpider(scrapy.Spider):
    name = "futurehome"
    allowed_domains = ["futurehome.al"]

    START_URLS = [
        ("https://futurehome.al/properties?transaction=sale", "sale"),
        ("https://futurehome.al/properties?transaction=rent", "rent"),
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

        for card in response.css(".property-card"):
            link = card.css("a[href*='/property/']::attr(href)").get()
            if link:
                yield scrapy.Request(
                    response.urljoin(link),
                    callback=self.parse_detail,
                    meta={"transaction_type": txn_type},
                )

        # Pagination
        current_page = 1
        page_match = re.search(r'page=(\d+)', response.url)
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

        item["source"] = "futurehome"
        item["source_url"] = response.url
        item["source_id"] = self._extract_id(response.url)

        # Title from h1
        title = response.css("h1::text").get("")
        item["title"] = title.strip() or None

        # Price from h3 near h1
        price_text = response.css("h3::text").get("")
        item["price"], item["currency_original"] = self._parse_price(price_text)

        # Transaction type from URL or title
        txn = response.meta.get("transaction_type", "sale")
        if item.get("title"):
            title_lower = item["title"].lower()
            if "shitje" in title_lower or "shitet" in title_lower:
                txn = "sale"
            elif "qira" in title_lower or "qera" in title_lower:
                txn = "rent"
        item["transaction_type"] = txn
        item["price_period"] = "monthly" if txn == "rent" else "total"

        # Extract details from the list
        details = self._extract_details(response)

        # Property type
        prop_type = details.get("Tipologji", "")
        if prop_type:
            item["property_type"] = self._detect_property_type(prop_type)
        elif item.get("title"):
            item["property_type"] = self._detect_property_type(item["title"])

        # Rooms
        rooms_text = details.get("Dhoma", "")
        if rooms_text:
            try:
                item["rooms"] = int(rooms_text.strip())
            except ValueError:
                pass

        # Bathrooms
        baths_text = details.get("Tualete", "")
        if baths_text:
            try:
                item["bathrooms"] = int(baths_text.strip())
            except ValueError:
                pass

        # Area (bruto preferred)
        area_text = details.get("Siperfaqja bruto", "") or details.get(
            "Siperfaqja e brendshme", ""
        )
        area_match = re.search(r'(\d+(?:\.\d+)?)', area_text)
        if area_match:
            item["area_sqm"] = float(area_match.group(1))

        # Floor
        floor_text = details.get("Kat", "")
        floor_match = re.search(r'(\d+)', floor_text)
        if floor_match:
            item["floor"] = int(floor_match.group(1))

        # Room config from title
        if item.get("title"):
            room_match = re.search(r'(\d+\+\d+(?:\+\d+)?)', item["title"])
            if room_match:
                item["room_config"] = room_match.group(1)

        # Description
        desc = response.css(
            ".property-description-section .description-text::text, "
            ".property-description-section p::text"
        ).getall()
        desc_joined = " ".join(d.strip() for d in desc if d.strip())
        if desc_joined:
            item["description"] = desc_joined

        # Images — prefer full-size from gallery links
        images = response.css(
            ".property-gallery a::attr(href)"
        ).getall()
        if not images:
            images = response.css(
                ".property-gallery img::attr(src), "
                "img.property-image::attr(src)"
            ).getall()
        # Filter to CDN images only
        images = [
            img for img in images
            if "cdn" in img or "storage" in img
        ]
        item["images"] = images
        item["image_count"] = len(images)

        # Agent
        agent_name = response.css(".agent-name a::text, .agent-name::text").get("")
        if agent_name.strip():
            item["poster_name"] = agent_name.strip()
            item["poster_type"] = "agency"

        # Phone
        phone_link = response.css('a[href^="tel:"]::attr(href)').get("")
        if phone_link:
            phone = phone_link.replace("tel:", "").replace("+", "").replace(" ", "").strip()
            if phone:
                item["poster_phone"] = phone

        yield item

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_id(url):
        """Extract CRM ID from URL like /property/5857551/slug.html."""
        match = re.search(r'/property/(\d+)/', url)
        if match:
            return match.group(1)
        # Fallback: try last number
        nums = re.findall(r'\d+', url)
        return nums[0] if nums else url.rstrip("/").split("/")[-1]

    @staticmethod
    def _parse_price(text):
        """Parse price like '134,000 €' or '465,395 €'."""
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
    def _extract_details(response):
        """Extract key-value pairs from the property details list."""
        details = {}
        for li in response.css(".property-details-list li"):
            texts = li.css("p::text").getall()
            texts = [t.strip() for t in texts if t.strip()]
            if len(texts) >= 2:
                key = texts[0].rstrip(":")
                val = texts[1]
                details[key] = val
        return details

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
        if "vilë" in text_lower or "vila" in text_lower or "vile" in text_lower or "villa" in text_lower:
            return "villa"
        if "shtëpi" in text_lower or "shtepi" in text_lower:
            return "house"
        if "tokë" in text_lower or "toke" in text_lower or "toka" in text_lower:
            return "land"
        if "zyrë" in text_lower or "zyre" in text_lower or "office" in text_lower:
            return "commercial"
        if "ambient" in text_lower or "dyqan" in text_lower or "magazin" in text_lower:
            return "commercial"
        return "apartment"
