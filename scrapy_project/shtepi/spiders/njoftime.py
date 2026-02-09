"""Spider for njoftime.com - XenForo forum with Albanian real estate listings.

Njoftime.com uses XenForo forum software. Listings are posted as forum threads
with structured metadata in both:
1. Custom fields (structured data in the thread page)
2. Thread titles (via regex parsing as fallback)

The spider extracts:
- Thread list pages: thread links + pagination
- Thread pages: metadata from custom fields (primary) or title regex (fallback),
  images from Swiper carousel, and description from the first post body.
"""

import re
from urllib.parse import urljoin

import scrapy

from shtepi.items import ListingItem
from shtepi.normalizers import parse_area, parse_floor


class NjoftimeSpider(scrapy.Spider):
    name = "njoftime"
    allowed_domains = ["njoftime.com", "www.njoftime.com"]
    start_urls = [
        "https://njoftime.com/forums/shtepi-ne-shitje.4/",
        "https://njoftime.com/forums/shtepi-me-qira.5/",
    ]

    # ─── Regex for parsing structured thread titles ─────────────────
    #
    # Title format:
    #   "City, transaction property [rooms] [Kati floor[/total]], area price currency[/muaj] [(neighborhood)]"
    #
    # Examples:
    #   "Tiranë, shitet apartament 2+1 Kati 3, 85 m² 75,000 € (Bllok)"
    #   "Durrës, jepet me qira apartament 1+1 Kati 2/5, 50 m² 300 €/muaj (Plazh)"
    #   "Vlorë, shitet vilë 150 m² 200,000 €"

    TITLE_RE = re.compile(
        r"^(?P<city>[^,]+),\s*"                          # City (everything before first comma)
        r"(?P<transaction>"                               # Transaction type group
            r"jepet\s+me\s+qira"                          #   "jepet me qira"
            r"|jepet\s+me\s+qera"                         #   "jepet me qera"
            r"|në\s+shitje"                               #   "në shitje"
            r"|ne\s+shitje"                               #   "ne shitje"
            r"|shitet"                                    #   "shitet"
            r"|shitje"                                    #   "shitje"
        r")\s+"                                           # end transaction group
        r"(?P<property_type>\S+)"                         # Property type (one word: apartament, vilë, etc.)
        r"(?:\s+(?P<rooms>\d+\+\d+(?:\+\w+)?))?"          # Optional room config: "2+1", "2+1+2"
        r"(?:\s+Kati\s+(?P<floor>\d+)(?:/(?P<total_floors>\d+))?)?"  # Optional floor: "Kati 3" or "Kati 2/5"
        r"[,\s]*"                                         # separator
        r"(?P<area>[\d.,]+)\s*m[²2]"                      # Area: "85 m²"
        r"\s+"                                            # space
        r"(?P<price>[\d.,]+)\s*"                          # Price: "75,000" or "200,000"
        r"(?P<currency>€|Lek|ALL|EUR|USD|\$)"             # Currency symbol/text
        r"(?P<monthly>/muaj)?"                            # Optional monthly indicator
        r"(?:\s*\((?P<neighborhood>[^)]+)\))?"             # Optional neighborhood in parens
        r"\s*$",
        re.IGNORECASE,
    )

    def parse(self, response):
        """Parse the XenForo forum thread listing page.

        Yields:
            - Request for each thread (callback=parse_thread)
            - Request for next page (callback=parse, i.e. this method)
        """
        # Extract thread links from structItem elements
        for thread in response.css("div.structItem--thread"):
            link = thread.css("div.structItem-title a::attr(href)").get()
            if link:
                full_url = response.urljoin(link)
                yield scrapy.Request(
                    url=full_url,
                    callback=self.parse_thread,
                )

        # Follow pagination ("Next" link)
        next_page = response.css(
            "a.pageNav-jump--next::attr(href)"
        ).get()
        if next_page:
            yield scrapy.Request(
                url=response.urljoin(next_page),
                callback=self.parse,
            )

    def parse_thread(self, response):
        """Parse a XenForo thread page to extract listing data.

        Extracts metadata from custom fields (primary) or the thread title
        via regex (fallback), and the description text + images from the
        first post body.

        Yields:
            ListingItem with all extracted fields.
        """
        # Get thread title - try message-attribution first (real site), then p-title-value (fallback)
        title = response.css("div.message-attribution--title h1::text").get("")
        if not title.strip():
            title = response.css("h1.p-title-value::text").get("")
        title = title.strip()

        # Extract structured custom fields (primary data source)
        custom_fields = self._extract_custom_fields(response)

        # Extract structured data from title as fallback
        parsed = self.parse_thread_title(title)

        # Extract thread ID from URL
        source_id = self._extract_thread_id(response.url)

        # Get first post only (the listing itself, not replies)
        first_post = response.css("article.message--post.first-post")
        if not first_post:
            all_posts = response.css("article.message--post")
            first_post = all_posts[0] if all_posts else None
        else:
            first_post = first_post[0] if first_post else None

        # Description from first post body
        description = ""
        bb_images = []
        if first_post:
            # Get text content from the bbWrapper div (be specific about first post)
            bb_wrapper = first_post.css("article.message-body div.bbWrapper")
            if not bb_wrapper:
                bb_wrapper = first_post.css("div.bbWrapper")
            if bb_wrapper:
                # Get all text, stripping HTML tags
                description = bb_wrapper.css("::text").getall()
                description = " ".join(t.strip() for t in description if t.strip())

                # Get images from bbWrapper (fallback for older posts)
                bb_images = bb_wrapper.css("img.bbImage::attr(src)").getall()

        # Get images from Swiper carousel (primary source on real site)
        swiper_images = response.css(
            "a.swiper-slide.js-lbImage::attr(href)"
        ).getall()

        # Use Swiper images if available, otherwise fall back to bbImage
        images = swiper_images if swiper_images else bb_images

        # Poster name from first post
        poster_name = response.css(
            "article.message--post:first-of-type h4.message-name a.username::text"
        ).get()
        if not poster_name:
            poster_name = response.css(
                "article.message--post:first-of-type div.message-name a.username::text"
            ).get()
        if not poster_name:
            poster_name = response.css(
                "ul.listInline a.username::text"
            ).get()

        # Populate fields: prefer custom fields, fall back to title regex
        city = custom_fields.get("city") or parsed.get("city")
        neighborhood = custom_fields.get("neighborhood") or parsed.get("neighborhood")
        property_type = custom_fields.get("property_type") or parsed.get("property_type")
        room_config = custom_fields.get("room_config") or parsed.get("room_config")
        floor = custom_fields.get("floor") if custom_fields.get("floor") is not None else parsed.get("floor")
        area_sqm = custom_fields.get("area_sqm") if custom_fields.get("area_sqm") is not None else parsed.get("area_sqm")
        price = custom_fields.get("price") if custom_fields.get("price") is not None else parsed.get("price")
        currency = custom_fields.get("currency") or parsed.get("currency")

        # Determine price period
        price_period = parsed.get("price_period", "total")

        item = ListingItem()
        item["source"] = "njoftime"
        item["source_url"] = response.url
        item["source_id"] = source_id
        item["title"] = title
        item["description"] = description

        # From custom fields (primary) or title parser (fallback)
        item["city"] = city
        item["transaction_type"] = parsed.get("transaction_type")
        item["property_type"] = property_type
        item["room_config"] = room_config
        item["floor"] = floor
        item["total_floors"] = parsed.get("total_floors")
        item["area_sqm"] = area_sqm
        item["price"] = price
        item["currency_original"] = currency
        item["price_period"] = price_period
        item["neighborhood"] = neighborhood

        # From post content
        item["images"] = images
        item["image_count"] = len(images)
        item["poster_name"] = poster_name

        # Store raw custom fields for reference
        if custom_fields.get("raw"):
            item["raw_json"] = custom_fields["raw"]

        yield item

    def _extract_custom_fields(self, response):
        """Extract structured custom fields from the thread page.

        Real njoftime.com threads have structured data in custom field elements:
            <div class="structItem-custom-fields message-fields">
                <dl class="pairs--customField" data-field="field-location"><dd>Tirane</dd></dl>
                <dl class="pairs--customField" data-field="field_9_zona"><dd>9 Don Bosko</dd></dl>
                ...
            </div>

        Returns:
            Dict with extracted and normalized values, plus 'raw' dict of all fields.
        """
        result = {
            "city": None,
            "neighborhood": None,
            "property_type": None,
            "area_sqm": None,
            "room_config": None,
            "floor": None,
            "price": None,
            "currency": None,
            "raw": {},
        }

        fields = response.css("dl.pairs--customField")
        if not fields:
            return result

        raw = {}
        for field in fields:
            data_field = field.attrib.get("data-field", "")
            # Get the text content from dd element
            dd_texts = field.css("dd ::text").getall()
            value = " ".join(t.strip() for t in dd_texts if t.strip())
            if data_field and value:
                raw[data_field] = value

        result["raw"] = raw

        # Map custom fields to item fields
        if "field-location" in raw:
            result["city"] = raw["field-location"].strip()

        if "field_9_zona" in raw:
            result["neighborhood"] = raw["field_9_zona"].strip()

        if "field_1_banimit" in raw:
            result["property_type"] = raw["field_1_banimit"].strip()

        if "field_6_sip" in raw:
            result["area_sqm"] = parse_area(raw["field_6_sip"])

        if "field_7_dhomat" in raw:
            result["room_config"] = raw["field_7_dhomat"].strip()

        if "field_8_kati" in raw:
            floor_val, _ = parse_floor(raw["field_8_kati"])
            result["floor"] = floor_val

        if "field_4_cmimi" in raw:
            price_text = raw["field_4_cmimi"]
            # Extract numeric value - strip currency symbols
            price_match = re.search(r'([\d.,]+)', price_text)
            if price_match:
                price_str = price_match.group(1).replace(",", "")
                try:
                    result["price"] = float(price_str)
                except ValueError:
                    pass
            # Detect currency from text
            if "\u20ac" in price_text or "EUR" in price_text.upper():
                result["currency"] = "EUR"
            elif "Lek" in price_text or "ALL" in price_text.upper():
                result["currency"] = "ALL"

        return result

    def parse_thread_title(self, title):
        """Parse structured metadata from a njoftime.com thread title.

        Args:
            title: Thread title string, e.g.
                "Tiranë, shitet apartament 2+1 Kati 3, 85 m² 75,000 € (Bllok)"

        Returns:
            Dict with keys: city, transaction_type, property_type, room_config,
            floor, total_floors, area_sqm, price, currency, price_period,
            neighborhood. Missing fields are None.
        """
        result = {
            "city": None,
            "transaction_type": None,
            "property_type": None,
            "room_config": None,
            "floor": None,
            "total_floors": None,
            "area_sqm": None,
            "price": None,
            "currency": None,
            "price_period": "total",
            "neighborhood": None,
        }

        match = self.TITLE_RE.match(title.strip())
        if not match:
            return result

        result["city"] = match.group("city").strip()
        result["transaction_type"] = match.group("transaction").strip()
        result["property_type"] = match.group("property_type").strip()

        # Room config (optional)
        rooms = match.group("rooms")
        if rooms:
            result["room_config"] = rooms.strip()

        # Floor (optional)
        floor_str = match.group("floor")
        if floor_str:
            result["floor"] = int(floor_str)

        total_floors_str = match.group("total_floors")
        if total_floors_str:
            result["total_floors"] = int(total_floors_str)

        # Area
        area_str = match.group("area")
        if area_str:
            result["area_sqm"] = float(area_str.replace(",", ""))

        # Price
        price_str = match.group("price")
        if price_str:
            result["price"] = float(price_str.replace(",", ""))

        # Currency
        currency_raw = match.group("currency")
        if currency_raw:
            currency_raw = currency_raw.strip()
            if currency_raw in ("€", "EUR"):
                result["currency"] = "EUR"
            elif currency_raw.lower() in ("lek", "all"):
                result["currency"] = "ALL"
            elif currency_raw in ("$", "USD"):
                result["currency"] = "USD"
            else:
                result["currency"] = currency_raw

        # Monthly indicator
        monthly = match.group("monthly")
        if monthly:
            result["price_period"] = "monthly"

        # Neighborhood (optional)
        neighborhood = match.group("neighborhood")
        if neighborhood:
            result["neighborhood"] = neighborhood.strip()

        return result

    def _extract_thread_id(self, url):
        """Extract the numeric thread ID from a XenForo thread URL.

        URLs look like: /threads/some-slug.10001/
        The ID is the number after the last dot in the slug.
        """
        match = re.search(r'\.(\d+)/?', url)
        if match:
            return match.group(1)
        # Fallback: try to find any number sequence
        match = re.search(r'/threads/[^/]*?(\d+)', url)
        if match:
            return match.group(1)
        return url
