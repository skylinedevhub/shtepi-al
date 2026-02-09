"""Spider for merrjep.com - Kosovo classifieds site (server-side rendered).

Crawls real estate listings (apartments, houses, villas, land)
from the Kosovo version of MerrJep.
"""

import re

import scrapy

from shtepi.items import ListingItem
from shtepi.normalizers import parse_area, parse_floor, parse_price_text


class MerrjepSpider(scrapy.Spider):
    """Crawl merrjep.com real estate listings."""

    name = "merrjep"
    allowed_domains = ["www.merrjep.com", "merrjep.com"]

    BASE = "https://www.merrjep.com/shpallje/patundshmeri"

    # Property categories on merrjep.com Kosovo
    PROPERTY_CATEGORIES = {
        "banesa": "apartment",
        "shtepi": "house",
        "vila": "villa",
        "toke-fusha-farma": "land",
    }

    def start_requests(self):
        """Generate start URLs for each property category."""
        for category, prop_type in self.PROPERTY_CATEGORIES.items():
            url = f"{self.BASE}/{category}"
            yield scrapy.Request(
                url,
                callback=self.parse,
                meta={"property_type": prop_type},
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
        item["title"] = (
            response.css("h1.ci-text-base::text").get("").strip() or None
        )

        # -- Price --
        price_value = response.css(
            "span.format-money-int::attr(value)"
        ).get()
        # Currency label sits next to the price span, inside bdi.new-price
        currency_text = response.css("bdi.new-price span::text").getall()
        # Filter to find the currency string (EUR, ALL, etc.)
        currency = None
        for ct in currency_text:
            ct_stripped = ct.strip()
            if ct_stripped and ct_stripped.upper() in (
                "EUR", "ALL", "USD", "CHF",
            ):
                currency = ct_stripped.upper()
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
            item["price"] = None
            item["currency_original"] = None

        # -- Transaction type: from tags --
        item["transaction_type"] = self._detect_transaction_type(
            self._extract_tag_value(response, "Lloji i shpalljes:")
        )

        # -- Property type: from meta or URL --
        item["property_type"] = self._detect_property_type(response)

        # -- Property attributes from tags-area --
        tags = self._extract_tags(response)

        item["rooms"] = self._safe_int(
            tags.get("numri_i_dhomave")
        )

        area_raw = tags.get("siperfaqe")
        item["area_sqm"] = parse_area(area_raw)

        floor_raw = tags.get("kati_(numri_i_kateve)")
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
                'a[data-fancybox="images"] img::attr(data-src)'
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
            # Private sellers
            poster_name = (
                response.css(
                    "div.seller-info-area span.ci-valign-middle::text"
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
        poster_type_raw = tags.get("publikuar_nga")
        if poster_type_raw and poster_type_raw.lower() == "kompani":
            item["poster_type"] = "agency"
        elif response.css("span.badge-trusted-seller"):
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

        MerrJep.com URLs: /shpallja/{slug}/{numeric_id}
        """
        match = re.search(r'(\d+)$', url.rstrip("/"))
        if match:
            return match.group(1)
        # Fallback: last path segment
        parts = url.rstrip("/").split("/")
        return parts[-1] if parts else None

    @staticmethod
    def _detect_transaction_type(tag_value):
        """Detect sale vs rent from the 'Lloji i shpalljes' tag value.

        Keywords: Shitet -> sale
                  Jepet me qira / Qira -> rent
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
        if "banesa" in url_lower or "apartament" in url_lower:
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
        if "banesa" in breadcrumb_text or "apartament" in breadcrumb_text:
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
            adresa/rruga, komuna, lloji_i_shpalljes, publikuar_nga
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
            label_text: The label to search for, e.g. "Lloji i shpalljes:"

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
