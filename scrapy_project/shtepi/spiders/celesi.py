"""Scrapy spider for gazetacelesi.al - Albanian real estate classifieds.

Gazeta Celesi is one of Albania's largest classifieds sites with 25+ years
of history. The site is a Next.js React app. Listings are organized under
/shtepi-ne-shitje/ (sale) and /shtepi-me-qera/ (rent) URL paths.

Card structure on list pages:
    <a class="ad-list-card_container__*" href="/shtepi/njoftime/{slug}-{id}.html">
        <h2>Title</h2>
        <p class="ad-list-card_priceText__*">EUR 120.000</p>
        <p class="ad-list-card_locationText__*">Neighborhood . City . Albania</p>
        <p class="ad-list-card_propertyValue__*">95 m2</p>  (with label "Area")
        ...

Detail pages have:
    <h1>Title</h1>
    Price as <p> inside .info-content_titleContainer__*
    Location in .info-content_row__*
    Description in .info-content_descriptionContainer__*
    Main data in .info-content_secondaryPropertyItem__* with <h4> label + <p> value
    Contact via <a href="tel:...">
    Images in .ad-slider_carouselContainer__*
"""

import re
from urllib.parse import urljoin

import scrapy

from shtepi.items import ListingItem
from shtepi.normalizers import parse_area, parse_floor, parse_price_text


class CelesiSpider(scrapy.Spider):
    """Spider for gazetacelesi.al real estate listings."""

    name = "celesi"
    allowed_domains = ["www.gazetacelesi.al", "gazetacelesi.al"]

    # Start URLs cover sale and rent for apartments, houses, and villas
    start_urls = [
        "https://www.gazetacelesi.al/en/shtepi-ne-shitje/apartament",
        "https://www.gazetacelesi.al/en/shtepi-ne-shitje/vile",
        "https://www.gazetacelesi.al/en/shtepi-ne-shitje/pjese-vile",
        "https://www.gazetacelesi.al/en/shtepi-me-qera/apartament",
        "https://www.gazetacelesi.al/en/shtepi-me-qera/vile",
        "https://www.gazetacelesi.al/en/shtepi-me-qera/pjese-vile",
    ]

    custom_settings = {
        "DOWNLOAD_DELAY": 2.0,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 2,
    }

    # Regex to extract the numeric source_id from URLs like:
    # /shtepi/njoftime/apartament-31-ne-shitje-komuna-e-parisit-1680001.html
    SOURCE_ID_RE = re.compile(r"-(\d+)\.html$")

    def parse(self, response):
        """Parse a listing page: extract cards and follow pagination.

        Yields:
            scrapy.Request for each detail page link
            scrapy.Request for each pagination next-page link
        """
        seen_urls = set()

        # Extract all listing card links (both premium and regular)
        # Cards are <a> elements with href containing /shtepi/njoftime/
        card_links = response.css(
            'a[href*="/shtepi/njoftime/"]::attr(href)'
        ).getall()

        for href in card_links:
            absolute_url = response.urljoin(href)
            if absolute_url not in seen_urls:
                seen_urls.add(absolute_url)
                yield scrapy.Request(
                    url=absolute_url,
                    callback=self.parse_detail,
                    meta={"list_url": response.url},
                )

        # Follow pagination: next page links
        # Pagination links are inside a container with class containing
        # "pagination" and link to ?page=N
        pagination_links = response.css(
            'a[href*="page="]::attr(href)'
        ).getall()

        seen_pages = set()
        for href in pagination_links:
            absolute_url = response.urljoin(href)
            if absolute_url not in seen_pages:
                seen_pages.add(absolute_url)
                yield scrapy.Request(
                    url=absolute_url,
                    callback=self.parse,
                )

    def parse_detail(self, response):
        """Parse a detail page and yield a ListingItem.

        Args:
            response: Scrapy HtmlResponse for the detail page

        Yields:
            ListingItem with all extracted fields
        """
        item = ListingItem()

        # Source identification
        item["source"] = "celesi"
        item["source_url"] = response.url
        item["source_id"] = self._extract_source_id(response.url)

        # Title from <h1>
        item["title"] = response.css("h1::text").get("").strip()

        # Transaction type from URL path
        item["transaction_type"] = self._detect_transaction_type(response.url)

        # Property type from sidebar badge or breadcrumb
        item["property_type"] = self._extract_property_type(response)

        # Price
        price_text = self._extract_price_text(response)
        if price_text:
            price_val, currency = parse_price_text(price_text)
            item["price"] = price_val
            item["currency_original"] = currency
        else:
            item["price"] = None
            item["currency_original"] = "EUR"

        # Location: "Neighborhood . City . Albania" (dot-separated)
        location_text = self._extract_location(response)
        if location_text:
            parts = [p.strip() for p in location_text.split("\u2022")]
            # Pattern: Neighborhood . [Sub-neighborhood .] City . Albania
            if len(parts) >= 3:
                item["neighborhood"] = parts[0]
                item["city"] = parts[-2]  # second to last is city
            elif len(parts) == 2:
                item["city"] = parts[0]
            item["address_raw"] = location_text

        # Main data section: h4 labels with sibling p values
        main_data = self._extract_main_data(response)

        # Area
        area_text = main_data.get("SIPERFAQE", "")
        item["area_sqm"] = parse_area(area_text) if area_text else None

        # Room config from title or main data
        room_config = self._extract_room_config(item.get("title", ""), main_data)
        item["room_config"] = room_config

        # Rooms (bedrooms) from main data
        bedrooms = main_data.get("DHOME GJUMI")
        if bedrooms:
            try:
                item["rooms"] = int(bedrooms)
            except (ValueError, TypeError):
                pass

        # Bathrooms from main data
        bathrooms = main_data.get("BANJO")
        if bathrooms:
            try:
                item["bathrooms"] = int(bathrooms)
            except (ValueError, TypeError):
                pass

        # Floor from main data
        floor_text = main_data.get("KATI", "")
        if floor_text:
            floor, total = parse_floor(floor_text)
            item["floor"] = floor
            item["total_floors"] = total

        # Description
        item["description"] = self._extract_description(response)

        # Images
        item["images"] = self._extract_images(response)
        item["image_count"] = len(item["images"])

        # Contact info
        phones = response.css('a[href^="tel:"]::attr(href)').getall()
        if phones:
            # Remove "tel:" prefix and deduplicate
            phone_numbers = []
            seen = set()
            for phone in phones:
                number = phone.replace("tel:", "").strip()
                if number and number not in seen:
                    seen.add(number)
                    phone_numbers.append(number)
            item["poster_phone"] = phone_numbers[0] if phone_numbers else None

        # Poster name: first non-utility button text in the content area
        item["poster_name"] = self._extract_poster_name(response)
        item["poster_type"] = self._detect_poster_type(item.get("poster_name", ""))

        # Furnished status from main data
        mobilimi = main_data.get("MOBILIMI", "")
        if mobilimi and "mobiluar" in mobilimi.lower():
            item["is_furnished"] = True

        # Active by default
        item["is_active"] = True

        yield item

    # ---- Private helper methods -----------------------------------------------

    def _extract_source_id(self, url):
        """Extract numeric ID from the end of a listing URL.

        Example: /shtepi/njoftime/apartament-31-1680001.html -> '1680001'
        """
        match = self.SOURCE_ID_RE.search(url)
        return match.group(1) if match else None

    def _detect_transaction_type(self, url):
        """Detect sale or rent from URL path segments."""
        url_lower = url.lower()
        if "shtepi-me-qera" in url_lower or "me-qera" in url_lower or "me-qira" in url_lower:
            return "rent"
        return "sale"

    def _extract_property_type(self, response):
        """Extract property type from the sidebar badge or breadcrumb."""
        # The sidebar badge has property type like "Apartament"
        badge_text = response.css(
            '[class*="contact-card_badge"] p::text'
        ).get()
        if badge_text:
            cleaned = badge_text.strip()
            if cleaned and cleaned != "Published" and "Published" not in cleaned:
                return cleaned.lower()

        # Fallback: from breadcrumb
        breadcrumb_items = response.css("nav li span::text").getall()
        if breadcrumb_items:
            return breadcrumb_items[-1].strip().lower()

        return "apartament"

    def _extract_price_text(self, response):
        """Extract the raw price text from the detail page.

        Price is a <p> inside the titleContainer div, containing currency
        symbols like EUR or ALL.
        """
        # Look for price in the title container area
        # It's a <p> that contains EUR or ALL but is short (not description)
        title_container = response.css(
            '[class*="info-content_titleContainer"]'
        )
        if title_container:
            paragraphs = title_container.css("p::text").getall()
            for text in paragraphs:
                text = text.strip()
                if ("\u20ac" in text or "ALL" in text or "EUR" in text) and len(text) < 40:
                    return text

        # Fallback: look for any short paragraph with currency
        all_ps = response.css("h1 ~ p::text, h1 ~ * > p::text").getall()
        for text in all_ps:
            text = text.strip()
            if ("\u20ac" in text or "ALL" in text) and len(text) < 40:
                return text

        return None

    def _extract_location(self, response):
        """Extract location text (Neighborhood . City . Albania)."""
        # Location is in a row div with bullet-separated text
        row = response.css('[class*="info-content_row"]')
        if row:
            # Get the text of the <p> inside the row (not the img)
            loc_text = row.css("p::text").get()
            if loc_text:
                return loc_text.strip()

        return None

    def _extract_main_data(self, response):
        """Extract key-value pairs from the 'Main data' section.

        Returns dict like: {"SIPERFAQE": "95 M2", "KATI": "Kati 5/9", ...}
        """
        data = {}
        items = response.css(
            '[class*="info-content_secondaryPropertyItem"] '
        )
        if not items:
            # Fallback: look for h4 + sibling p patterns
            items = response.css(
                '[class*="secondaryPropertyContainer"] > div'
            )

        for item_div in items:
            label = item_div.css("h4::text").get()
            value = item_div.css("p::text").get()
            if label and value:
                data[label.strip()] = value.strip()

        return data

    def _extract_room_config(self, title, main_data):
        """Extract room configuration like '3+1' from title or main data.

        Looks for patterns like 2+1, 3+1+2, garsoniere in the title.
        Falls back to combining DHOME GJUMI + DHOME NDENJE from main data.
        """
        # Try to find X+Y pattern in title
        match = re.search(r'(\d+\s*\+\s*\d+(?:\s*\+\s*\w+)?)', title)
        if match:
            return re.sub(r'\s+', '', match.group(1))

        # Garsoniere in title
        if "garsoniere" in title.lower() or "garsonier" in title.lower():
            return "garsoniere"

        # Build from main data
        bedrooms = main_data.get("DHOME GJUMI")
        living = main_data.get("DHOME NDENJE")
        if bedrooms and living:
            return f"{bedrooms}+{living}"

        return None

    def _extract_description(self, response):
        """Extract the full description text."""
        desc_container = response.css(
            '[class*="info-content_descriptionContainer"]'
        )
        if desc_container:
            # Get all paragraph texts after the h3, skip the h3 itself
            paragraphs = desc_container.css("p::text").getall()
            # Filter out very short lines that are just titles
            desc_parts = []
            for p in paragraphs:
                text = p.strip()
                if text and len(text) > 5:
                    desc_parts.append(text)
            return " ".join(desc_parts) if desc_parts else None

        return None

    def _extract_images(self, response):
        """Extract image URLs from the gallery slider."""
        images = []
        seen = set()

        # Images in the carousel container
        img_srcs = response.css(
            '[class*="ad-slider_carouselContainer"] img::attr(src)'
        ).getall()

        for src in img_srcs:
            if src and "njoftime" in src and src not in seen:
                seen.add(src)
                images.append(src)

        # Fallback: any img with "njoftime" in alt containing cover
        if not images:
            for img in response.css("img"):
                src = img.attrib.get("src", "")
                alt = img.attrib.get("alt", "")
                if "njoftime" in alt and src and src not in seen:
                    seen.add(src)
                    if src.startswith("http"):
                        images.append(src)
                    else:
                        images.append(response.urljoin(src))

        return images

    def _extract_poster_name(self, response):
        """Extract the poster/agency name from the detail page.

        The agency name appears as a <button> text near the contact section.
        """
        # Look for button text that is a poster name (not utility buttons)
        skip_texts = {
            "+", "EN", "Login", "Register", "Learn more",
            "Send email", "Phone", "Ads list",
        }
        buttons = response.css("main button::text").getall()
        for text in buttons:
            text = text.strip()
            if (
                text
                and len(text) > 2
                and text not in skip_texts
                and not text.startswith("...")
                and "/" not in text  # skip "1/1" etc.
            ):
                return text

        return None

    def _detect_poster_type(self, name):
        """Detect if poster is agency or private based on name."""
        if not name:
            return "private"
        name_lower = name.lower()
        if "private" in name_lower:
            return "private"
        # Known agency indicators
        agency_keywords = [
            "real estate", "agjensi", "agency", "property",
            "broker", "corporate", "realty", "estate",
        ]
        for keyword in agency_keywords:
            if keyword in name_lower:
                return "agency"
        # If it looks like a company name (all caps or has specific suffixes)
        if name.isupper() and len(name) > 5:
            return "agency"
        # Default: treat multi-word capitalized names as agencies
        words = name.split()
        if len(words) >= 2 and all(w[0].isupper() for w in words if w):
            return "agency"
        return "private"
