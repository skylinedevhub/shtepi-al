"""Spider for merrjep.al - Albania's largest classifieds site.

Crawls real estate listings (apartments, houses, villas, land)
from the Albanian version of MerrJep.
"""

import re

import scrapy

from shtepi.items import ListingItem
from shtepi.normalizers import parse_area, parse_floor, parse_price_text


class MerrjepSpider(scrapy.Spider):
    """Crawl merrjep.al real estate listings."""

    name = "merrjep"
    allowed_domains = ["www.merrjep.al", "merrjep.al"]

    BASE = "https://www.merrjep.al/njoftime/imobiliare-vendbanime"

    # Property categories on merrjep.al (Albania)
    PROPERTY_CATEGORIES = {
        "apartamente": "apartment",
        "shtepi": "house",
        "vila": "villa",
        "toke-fusha-farma": "land",
    }

    # Transaction types to crawl
    TRANSACTION_TYPES = {
        "ne-shitje": "sale",
        "me-qera": "rent",
    }

    def start_requests(self):
        """Generate start URLs for each property category + transaction type."""
        for category, prop_type in self.PROPERTY_CATEGORIES.items():
            for txn_slug, txn_type in self.TRANSACTION_TYPES.items():
                url = f"{self.BASE}/{category}/{txn_slug}"
                yield scrapy.Request(
                    url,
                    callback=self.parse,
                    meta={
                        "property_type": prop_type,
                        "transaction_type": txn_type,
                    },
                )

    def parse(self, response):
        """Parse a category listing page to extract detail links and pagination.

        Yields:
            Request for each listing detail page (callback=parse_detail).
            Request for the next pagination page (callback=parse).
        """
        for card in response.css("div.row-listing"):
            link = card.css("a.Link_vis::attr(href)").get()
            if link:
                detail_url = response.urljoin(link)
                yield scrapy.Request(
                    detail_url,
                    callback=self.parse_detail,
                    meta=response.meta.copy(),
                )

        # Follow pagination -- look for "Tjetra" (Next) link
        for a_tag in response.css("li.prevnext a.page-link"):
            text = a_tag.css("::text").get("")
            if "Tjetra" in text:
                next_url = a_tag.attrib.get("href")
                if next_url:
                    yield scrapy.Request(
                        response.urljoin(next_url),
                        callback=self.parse,
                        meta=response.meta.copy(),
                    )
                break

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
        title = response.css("h1.ci-text-base::text").get("")
        if not title:
            title = response.css("h1::text").get("")
        item["title"] = title.strip() or None

        # -- Price --
        price_value = response.css(
            "span.format-money-int::attr(value)"
        ).get()
        # Currency label sits next to the price span, inside bdi.new-price
        currency_text = response.css("bdi.new-price span::text").getall()
        # Filter to find the currency string (EUR, ALL, etc.)
        currency = None
        for ct in currency_text:
            ct_stripped = ct.strip().upper()
            if ct_stripped in ("EUR", "ALL", "USD", "CHF", "LEK"):
                currency = ct_stripped
                if currency == "LEK":
                    currency = "ALL"
                break

        if price_value:
            try:
                price_num = float(price_value)
                if price_num > 0:
                    item["price"] = price_num
                    item["currency_original"] = currency or "EUR"
                else:
                    item["price"] = None
                    item["currency_original"] = None
            except (ValueError, TypeError):
                item["price"] = None
                item["currency_original"] = None
        else:
            # Fallback: try to parse price from text
            price_text = response.css("bdi.new-price::text").get("")
            if not price_text:
                price_text = response.css("h4::text").get("")
            if price_text:
                parsed_price, parsed_currency = parse_price_text(price_text)
                item["price"] = parsed_price
                item["currency_original"] = parsed_currency if parsed_price else None
            else:
                item["price"] = None
                item["currency_original"] = None

        # -- Price period: detect monthly rent --
        price_period_text = response.css("p.list-price span::text").get("")
        if not price_period_text:
            price_period_text = response.css("bdi.new-price::text").getall()
            price_period_text = " ".join(price_period_text)
        if "muaj" in price_period_text.lower():
            item["price_period"] = "monthly"
        else:
            item["price_period"] = "total"

        # -- Transaction type: from tags or meta --
        tag_txn = self._extract_tag_value(response, "Lloji i njoftimit:")
        if not tag_txn:
            tag_txn = self._extract_tag_value(response, "Lloji i shpalljes:")
        item["transaction_type"] = self._detect_transaction_type(tag_txn)
        # Fallback to meta if tag not found
        if not tag_txn and response.meta.get("transaction_type"):
            item["transaction_type"] = response.meta["transaction_type"]

        # -- Property type: from meta or URL --
        item["property_type"] = self._detect_property_type(response)

        # -- Room config from title --
        if item.get("title"):
            room_match = re.search(r'(\d+\s*\+\s*\d+(?:\s*\+\s*\w+)?)', item["title"])
            if room_match:
                item["room_config"] = room_match.group(1).replace(" ", "")

        # -- Property attributes from tags-area --
        tags = self._extract_tags(response)

        item["rooms"] = self._safe_int(
            tags.get("numri_i_dhomave")
        )

        area_raw = tags.get("siperfaqe") or tags.get("sipërfaqe")
        item["area_sqm"] = parse_area(area_raw)

        floor_raw = tags.get("kati_(numri_i_kateve)") or tags.get("kati")
        floor, total_floors = parse_floor(floor_raw)
        item["floor"] = floor
        item["total_floors"] = total_floors

        item["city"] = tags.get("komuna")
        item["neighborhood"] = tags.get("adresa/rruga")

        # -- Images --
        images = response.css(
            'a[data-fancybox="images"]::attr(href)'
        ).getall()
        if not images:
            images = response.css(
                'a[data-fancybox="gallery"]::attr(href)'
            ).getall()
        if not images:
            images = response.css(
                'a[data-fancybox="images"] img::attr(data-src)'
            ).getall()
        if not images:
            # Try carousel images
            images = response.css(
                'div.gallery-area img::attr(src)'
            ).getall()
            if not images:
                images = response.css(
                    'div.gallery-area img::attr(data-src)'
                ).getall()
        images = [
            img for img in images
            if img and "skeleton" not in img and "placeholder" not in img
        ]
        item["images"] = images

        # -- Description --
        desc_parts = response.css(
            "div.description-area span::text"
        ).getall()
        if not desc_parts:
            desc_parts = response.css(
                "div.description-area p::text"
            ).getall()
        if not desc_parts:
            desc_parts = response.css(
                "div.description-area::text"
            ).getall()
        if desc_parts:
            description = " ".join(
                part.strip() for part in desc_parts if part.strip()
            )
            item["description"] = description if description else None
        else:
            item["description"] = None

        # -- Seller info --
        # Agency / store sellers
        poster_name = (
            response.css(
                "div.store-info-area span.ci-valign-middle::text"
            ).get("").strip()
        )
        if not poster_name:
            poster_name = (
                response.css(
                    "div.store-info-area h4::text"
                ).get("").strip()
            )
        if not poster_name:
            # Private sellers
            poster_name = (
                response.css(
                    "div.seller-info-area span.ci-valign-middle::text"
                ).get("").strip()
            )
        if not poster_name:
            poster_name = (
                response.css(
                    "div.seller-info-area h4::text"
                ).get("").strip()
            )
        item["poster_name"] = poster_name or None

        # Phone
        phone_link = response.css('a[href^="tel:"]::attr(href)').get()
        if phone_link:
            item["poster_phone"] = phone_link.replace("tel:", "").strip()
        else:
            phone_text = response.css(
                'a[href^="tel:"] bdi::text'
            ).get()
            item["poster_phone"] = (
                phone_text.strip() if phone_text else None
            )

        # Poster type: from tags or badge
        poster_type_raw = tags.get("njoftim_nga") or tags.get("publikuar_nga")
        if poster_type_raw and poster_type_raw.lower() == "kompani":
            item["poster_type"] = "agency"
        elif response.css("span.badge-trusted-seller"):
            item["poster_type"] = "agency"
        elif response.css("span.isstore"):
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

        MerrJep.al URLs: /njoftim/{slug}/{numeric_id}
        """
        match = re.search(r'(\d+)$', url.rstrip("/"))
        if match:
            return match.group(1)
        # Fallback: last path segment
        parts = url.rstrip("/").split("/")
        return parts[-1] if parts else None

    @staticmethod
    def _detect_transaction_type(tag_value):
        """Detect sale vs rent from the listing type tag value.

        Keywords: Shitet -> sale
                  Jepet me qira / Qira / me qera -> rent
        Falls back to sale if unclear.
        """
        if not tag_value:
            return "sale"
        val = tag_value.lower().strip()
        rent_keywords = ["qira", "qera", "jepet"]
        for keyword in rent_keywords:
            if keyword in val:
                return "rent"
        return "sale"

    @staticmethod
    def _detect_property_type(response):
        """Detect property type from response meta or URL breadcrumbs."""
        prop_type = response.meta.get("property_type")
        if prop_type:
            return prop_type

        url_lower = response.url.lower()
        if "apartament" in url_lower:
            return "apartment"
        if "vila" in url_lower:
            return "villa"
        if "shtepi" in url_lower or "shtëpi" in url_lower:
            return "house"
        if "toke" in url_lower or "tokë" in url_lower or "fusha" in url_lower:
            return "land"

        # From breadcrumbs
        breadcrumbs = response.css("ul.breadcrumbs li a span::text").getall()
        breadcrumb_text = " ".join(breadcrumbs).lower()
        if "apartament" in breadcrumb_text:
            return "apartment"
        if "vila" in breadcrumb_text:
            return "villa"
        if "shtepi" in breadcrumb_text or "shtëpi" in breadcrumb_text:
            return "house"

        return "apartment"  # default

    @staticmethod
    def _extract_tags(response):
        """Extract property key-value pairs from the tags-area section.

        Each tag is an <a class="tag-item"> with <span>Label:</span>
        and <bdi>Value</bdi>.

        Returns dict with normalized keys like:
            numri_i_dhomave, siperfaqe, kati_(numri_i_kateve),
            adresa/rruga, komuna, lloji_i_njoftimit, njoftim_nga
        """
        tags = {}
        for tag in response.css("div.tags-area a.tag-item"):
            label = tag.css("span::text").get("")
            value = tag.css("bdi::text").get("")
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
            tags[key] = value
        return tags

    @staticmethod
    def _extract_tag_value(response, label_text):
        """Extract a single tag value by its label text.

        Args:
            response: Scrapy response
            label_text: The label to search for, e.g. "Lloji i njoftimit:"

        Returns:
            The bdi text value, or None
        """
        for tag in response.css("div.tags-area a.tag-item"):
            label = tag.css("span::text").get("")
            if label.strip() == label_text:
                return tag.css("bdi::text").get("").strip()
        return None

    @staticmethod
    def _safe_int(value):
        """Safely convert a value to int, returning None on failure."""
        if value is None:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
