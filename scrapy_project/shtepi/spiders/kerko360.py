"""Spider for kerko360.al - Albanian real estate search portal.

Kerko360 is a search-focused portal with ~30K residential listings.
Rich detail pages with structured metadata, address, and features.

URL patterns:
  List:   /listings?category=1&action={sale|rent}&page={N}
  Detail: /listing/{slug}-{numeric_id}
"""

import re

import scrapy

from shtepi.items import ListingItem


class Kerko360Spider(scrapy.Spider):
    name = "kerko360"
    allowed_domains = ["kerko360.al"]

    START_URLS = [
        ("https://kerko360.al/listings?category=1&action=sale", "sale"),
        ("https://kerko360.al/listings?category=1&action=rent", "rent"),
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

        for card in response.css(".properties-item"):
            link = card.css(".title h3 a::attr(href)").get()
            if not link:
                link = card.css("h3 a::attr(href)").get()
            if not link:
                link = card.css(".properties-image > a::attr(href)").get()
            if link:
                yield scrapy.Request(
                    response.urljoin(link),
                    callback=self.parse_detail,
                    meta={"transaction_type": txn_type},
                )

        # Pagination — find current page number and request the next
        current_text = response.css(
            ".pagination-area li.active span::text"
        ).get()
        if not current_text:
            # Legacy structure fallback
            current_text = response.css(
                ".pagination .page-item.active .page-link::text"
            ).get()
        current = current_text or "1"
        try:
            next_page = int(current) + 1
        except ValueError:
            next_page = 2
        next_link = response.css(
            f'.pagination-area a[href*="page={next_page}"]::attr(href)'
        ).get()
        if not next_link:
            # Legacy fallback
            next_link = response.css(
                f'.pagination a.page-link[href*="page={next_page}"]::attr(href)'
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

        item["source"] = "kerko360"
        item["source_url"] = response.url
        item["source_id"] = self._extract_id(response.url)

        # Title
        title = response.css("h1::text").get("")
        item["title"] = title.strip() or None

        # Price — may be in .property-price div, .price div, or an h2
        price_text = response.css(
            ".property-price::text, .price::text"
        ).getall()
        if not price_text:
            # New layout: price in an h2 like "Çmimi: 950,000 €"
            for h2 in response.css("h2::text").getall():
                if "€" in h2 or "ALL" in h2 or "Çmimi" in h2.lower():
                    price_text = [h2]
                    break
        price_str = " ".join(price_text).strip()
        item["price"], item["currency_original"] = self._parse_price(price_str)

        # Transaction type from title or URL
        txn = response.meta.get("transaction_type", "sale")
        if item.get("title"):
            title_lower = item["title"].lower()
            if "shitje" in title_lower:
                txn = "sale"
            elif "qira" in title_lower or "qera" in title_lower:
                txn = "rent"
        item["transaction_type"] = txn
        item["price_period"] = "monthly" if txn == "rent" else "total"

        # Extract details list
        details = self._extract_details(response)

        # Area
        area_text = details.get("Sip. e Pronës Bruto", "") or details.get("Sip. e Pronës Neto", "")
        area_match = re.search(r'(\d+(?:\.\d+)?)', area_text)
        if area_match:
            item["area_sqm"] = float(area_match.group(1))

        # Bedrooms
        bed_text = details.get("Dhomat e gjumit", "")
        if bed_text:
            try:
                item["rooms"] = int(bed_text.strip())
            except ValueError:
                pass

        # Bathrooms
        bath_text = details.get("Tualete", "")
        if bath_text:
            try:
                item["bathrooms"] = int(bath_text.strip())
            except ValueError:
                pass

        # Floor
        floor_text = details.get("Kati", "")
        floor_match = re.search(r'(\d+)', floor_text)
        if floor_match:
            item["floor"] = int(floor_match.group(1))

        # Parking/Garage
        garage_text = details.get("Garazh", "")
        if garage_text:
            try:
                item["has_parking"] = int(garage_text.strip()) > 0
            except ValueError:
                pass

        # Elevator
        if "Ashensor" in details:
            item["has_elevator"] = True

        # Property type from subcategory or category
        subcat = details.get("Nenkategoria e prones", "")
        category = details.get("Lloji i pronës", "")
        item["property_type"] = self._detect_property_type(
            subcat or category or item.get("title") or ""
        )

        # Room config from title
        if item.get("title"):
            room_match = re.search(r'(\d+\+\d+(?:\+\d+)?)', item["title"])
            if room_match:
                item["room_config"] = room_match.group(1)

        # City from address section
        city_el = response.css(".address-list li")
        if not city_el:
            # New layout: <ul> after an <h3>Adresa</h3> heading, no class
            for h3 in response.css("h3"):
                if "Adresa" in h3.css("::text").get(""):
                    ul = h3.xpath("following-sibling::ul[1]")
                    if ul:
                        city_el = ul.css("li")
                    break
        for li in city_el:
            text = li.css("::text").getall()
            text_joined = " ".join(t.strip() for t in text)
            if "Qytet" in text_joined:
                # Try <span> first (legacy), then second text node
                city_val = li.css("span::text").get("")
                if not city_val:
                    parts = [t.strip() for t in text if t.strip() and t.strip() != "Qytet"]
                    city_val = parts[0] if parts else ""
                if city_val:
                    item["city"] = city_val.strip()

        # Neighborhood from address
        address_text = details.get("Adresa", "")
        if not address_text:
            for li in city_el:
                text = li.css("::text").getall()
                text_joined = " ".join(t.strip() for t in text)
                if "Adresa" in text_joined:
                    address_text = li.css("span::text").get("")
                    if not address_text:
                        parts = [t.strip() for t in text if t.strip() and t.strip() != "Adresa"]
                        address_text = parts[0] if parts else ""
                    break

        # Coordinates from Google Maps link
        map_link = response.css('a[href*="google.com/maps"]::attr(href)').get("")
        coord_match = re.search(r'destination=([\d.-]+),([\d.-]+)', map_link)
        if coord_match:
            try:
                item["latitude"] = float(coord_match.group(1))
                item["longitude"] = float(coord_match.group(2))
            except ValueError:
                pass

        # Description
        desc = response.css(".property-description p::text").get("")
        if not desc.strip():
            # New layout: <p> after an <h3>Përshkrimi</h3> heading
            for h3 in response.css("h3"):
                if "rshkrimi" in h3.css("::text").get(""):
                    desc = h3.xpath("following-sibling::p[1]/text()").get("")
                    break
        if desc.strip():
            item["description"] = desc.strip()

        # Images — gallery with alt="image" markers
        images = response.css('.slick-slide img[alt="image"]::attr(src)').getall()
        if not images:
            # New layout uses .antry-img-control wrapper
            images = response.css('.antry-img-control img[alt="image"]::attr(src)').getall()
        if not images:
            images = response.css('img[src*="/storage/media/"]::attr(src)').getall()
        # Filter placeholder data URIs
        images = [img for img in images if img and not img.startswith("data:")]
        item["images"] = images
        item["image_count"] = len(images)

        # Agent — try spans inside h6 first (legacy), then plain h6 text
        agent_parts = response.css(".agent-info h6 span::text").getall()
        for part in agent_parts:
            part = part.strip()
            if part and part != "Publikuar nga":
                item["poster_name"] = part
                item["poster_type"] = "agency"
                break
        if not item.get("poster_name"):
            # New layout: h6 text like "Publikuar nga Gerald Mahilaj" or
            # just "Gerald Mahilaj" (no spans)
            for h6 in response.css("h6::text").getall():
                h6 = h6.strip()
                if h6.startswith("Publikuar nga"):
                    name = h6.replace("Publikuar nga", "").strip()
                    if name:
                        item["poster_name"] = name
                        item["poster_type"] = "agency"
                        break
        # Or from details
        if not item.get("poster_name"):
            agent_name = details.get("Agjenti i pronës", "")
            if agent_name:
                item["poster_name"] = agent_name.strip()
                item["poster_type"] = "agency"

        yield item

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_id(url):
        """Extract numeric ID from URL like /listing/slug-450683."""
        match = re.search(r'-(\d+)$', url.rstrip("/"))
        if match:
            return match.group(1)
        # Fallback
        nums = re.findall(r'\d+', url)
        return nums[-1] if nums else url.rstrip("/").split("/")[-1]

    @staticmethod
    def _parse_price(text):
        """Parse price like '385,000 €' or '600 €/muaj'."""
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
        """Extract key-value pairs from the details list.

        Tries the legacy ``.details-list`` class first, then falls back to
        finding the details ``<ul>`` by its heading (``Detaje``).
        """
        details = {}
        detail_items = response.css(".details-list li")
        if not detail_items:
            # New layout: <ul> after an <h3>Detaje</h3> heading, no class
            for h3 in response.css("h3"):
                if "Detaje" in h3.css("::text").get(""):
                    ul = h3.xpath("following-sibling::ul[1]")
                    if ul:
                        detail_items = ul.css("li")
                    break
        for li in detail_items:
            texts = li.css("::text").getall()
            texts = [t.strip() for t in texts if t.strip()]
            if len(texts) >= 2:
                key = texts[0]
                val = texts[1]
                details[key] = val
            elif len(texts) == 1:
                # Boolean features (checkmark only) or comma-separated
                key = texts[0]
                details[key] = "yes"
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
        if "vilë" in text_lower or "vila" in text_lower or "villa" in text_lower:
            return "villa"
        if "shtëpi" in text_lower or "shtepi" in text_lower:
            return "house"
        if "tokë" in text_lower or "toke" in text_lower:
            return "land"
        if "zyrë" in text_lower or "zyre" in text_lower or "office" in text_lower:
            return "commercial"
        return "apartment"
