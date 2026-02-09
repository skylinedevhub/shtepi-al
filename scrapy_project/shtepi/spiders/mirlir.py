"""Spider for MirLir.com - Albanian classifieds platform.

MirLir.com is a general classifieds site popular in Albania and Kosovo.
This spider focuses on the real estate (Patundshmeri) categories:
  - Apartamente / Banesa ne shitje  (apartments for sale)
  - Apartamente / Banesa me qira    (apartments for rent)
  - Shtepi ne shitje                (houses for sale)
  - Shtepi me qira                  (houses for rent)

URL patterns:
  List:   /shpallje/k-{category-slug}/v-{city}/
  Detail: /shpallje/{City}/{Category-slug}/{Title-slug}-{ID}/
  Page N: /shpallje/k-{category-slug}/v-{city}/{N}/
"""

import re
from typing import Optional
from urllib.parse import urljoin

import scrapy

from shtepi.items import ListingItem
from shtepi.normalizers import (
    extract_features,
    normalize_city,
    normalize_property_type,
    normalize_transaction_type,
    parse_area,
    parse_floor,
    parse_price_text,
)


class MirLirSpider(scrapy.Spider):
    """Scrape real estate listings from mirlir.com."""

    name = "mirlir"
    allowed_domains = ["mirlir.com"]

    # Category slug → (transaction_type, property_type)
    CATEGORIES = {
        "k-apartamente-banesa-ne-shitje": ("sale", "apartment"),
        "k-apartamente-banesa-me-qira": ("rent", "apartment"),
        "k-shtepi-ne-shitje": ("sale", "house"),
        "k-shtepi-me-qira": ("rent", "house"),
    }

    # Major Albanian cities to crawl
    CITIES = [
        "tirane", "durres", "vlore", "sarande", "shkoder",
        "korce", "elbasan", "fier", "berat", "lushnje",
        "pogradec", "kamez", "kavaje", "lezhe", "gjirokaster",
    ]

    def start_requests(self):
        """Generate start URLs for each category + city combination."""
        for cat_slug in self.CATEGORIES:
            for city in self.CITIES:
                url = f"https://mirlir.com/shpallje/{cat_slug}/v-{city}/"
                yield scrapy.Request(
                    url,
                    callback=self.parse,
                    meta={
                        "category_slug": cat_slug,
                        "city_slug": city,
                    },
                )

    def parse(self, response):
        """Parse listing page: extract card links and follow pagination."""
        # Extract city from the category URL for passing to detail requests
        city_slug = response.meta.get("city_slug") or self._extract_city_from_category_url(response.url)

        # Each listing card is an <li class="media clearfix listing">
        listings = response.css("li.listing")

        for listing in listings:
            # Detail link is <a class="link" href="...">
            detail_href = listing.css("a.link::attr(href)").get()
            if not detail_href:
                continue

            detail_url = response.urljoin(detail_href)

            # Extract city from card location text or URL
            card_city = listing.css(".location::text").get()
            if card_city:
                card_city = card_city.strip()
            else:
                card_city = city_slug

            # Determine transaction type and property type from category slug
            cat_slug = response.meta.get("category_slug", "")
            cat_info = self.CATEGORIES.get(cat_slug, (None, None))

            yield scrapy.Request(
                detail_url,
                callback=self.parse_detail,
                meta={
                    "city": card_city,
                    "transaction_type": cat_info[0],
                    "property_type": cat_info[1],
                },
            )

        # Follow pagination: the "Next" link
        next_link = response.css('ul.pagination a[aria-label="Next"]::attr(href)').get()
        if next_link:
            yield scrapy.Request(
                response.urljoin(next_link),
                callback=self.parse,
                meta=response.meta.copy(),
            )

    def parse_detail(self, response):
        """Parse a detail page and yield a ListingItem."""
        item = ListingItem()
        item["source"] = "mirlir"
        item["source_url"] = response.url

        # Extract source_id from URL: last segment before trailing slash
        # Pattern: /Title-Slug-{ID}/
        source_id = self._extract_id_from_url(response.url)
        item["source_id"] = source_id

        # Title from the main heading (outside the article element)
        # On the real site, listing title is in .listing-header h4 or
        # the first h4 in .classified-ad before the article
        title = response.css(".listing-header h4::text").get()
        if not title:
            title = response.css(".classified-ad h4::text").get()
        if not title:
            # Fallback: page title often contains the listing title
            page_title = response.css("title::text").get("")
            if "..." in page_title:
                title = page_title.split("...")[0].strip()
            elif "|" in page_title:
                title = page_title.split("|")[0].strip()
        if title:
            title = title.strip()
        item["title"] = title

        # Price from schema.org meta tags
        price_meta = response.css('meta[itemprop="price"]::attr(content)').get()
        currency_meta = response.css('meta[itemprop="priceCurrency"]::attr(content)').get()

        if price_meta:
            try:
                item["price"] = float(price_meta)
            except (ValueError, TypeError):
                item["price"] = None
        else:
            # Fallback: parse from header text
            price_text = response.css(".listing-header .price-label::text").get()
            if price_text:
                price_val, _ = parse_price_text(price_text)
                item["price"] = price_val

        item["currency_original"] = currency_meta or "EUR"

        # Details from dl.attributes
        details = self._parse_details_dl(response)

        # Area
        area_text = details.get("Kuadratura")
        if area_text:
            item["area_sqm"] = parse_area(area_text)

        # Rooms
        rooms_text = details.get("Numri i dhomave")
        if rooms_text:
            try:
                item["rooms"] = int(rooms_text.strip())
            except (ValueError, TypeError):
                pass

        # Floor
        floor_text = details.get("Kati")
        if floor_text:
            floor, total = parse_floor(floor_text)
            item["floor"] = floor
            if total:
                item["total_floors"] = total

        # City from detail page location or meta
        city_text = response.css('span[itemprop="addressLocality"]::text').get()
        if city_text:
            item["city"] = city_text.strip()
        else:
            item["city"] = response.meta.get("city")

        # Transaction type from URL category or meta
        transaction = response.meta.get("transaction_type")
        if not transaction:
            category_text = details.get("Kategoria", "")
            if "shitje" in category_text.lower():
                transaction = "sale"
            elif "qira" in category_text.lower() or "qera" in category_text.lower():
                transaction = "rent"
            else:
                transaction = "sale"
        item["transaction_type"] = transaction

        # Property type
        prop_type = response.meta.get("property_type")
        if not prop_type:
            category_text = details.get("Kategoria", "")
            if "apartament" in category_text.lower() or "banesa" in category_text.lower():
                prop_type = "apartment"
            elif "shtepi" in category_text.lower() or "vila" in category_text.lower():
                prop_type = "house"
            else:
                prop_type = "apartment"
        item["property_type"] = prop_type

        # Description
        desc = response.css('p[itemprop="description"]::text').getall()
        if not desc:
            desc = response.css("section.description p::text").getall()
        description = "\n".join(line.strip() for line in desc if line.strip())
        item["description"] = description

        # Images from swiper slides (big images, not duplicates)
        images = []
        seen_srcs = set()
        for slide in response.css(".swiper-slide:not(.swiper-slide-duplicate) img"):
            src = slide.attrib.get("src", "")
            if src and "_big.jpg" in src and src not in seen_srcs:
                images.append(src)
                seen_srcs.add(src)

        # Fallback: if no swiper, get from currentImage
        if not images:
            main_img = response.css('.currentImage img[itemprop="image"]::attr(src)').get()
            if main_img:
                images.append(main_img)

        item["images"] = images
        item["image_count"] = len(images)

        # Contact info from sidebar
        poster_name = response.css(".listing-contact-name span::text").get()
        if poster_name:
            item["poster_name"] = poster_name.strip()

        poster_phone = response.css(".listing-contact-phone span::text").get()
        if poster_phone:
            item["poster_phone"] = poster_phone.strip()

        # Features from characteristics tags
        features_text = description
        attr_tags = response.css(".attr-tag::text").getall()
        if attr_tags:
            features_text = features_text + " " + " ".join(attr_tags)

        features = extract_features(features_text)
        item["has_elevator"] = features.get("has_elevator")
        item["has_parking"] = features.get("has_parking")
        item["is_furnished"] = features.get("is_furnished")
        item["is_new_build"] = features.get("is_new_build")

        # Price period
        if transaction == "rent":
            item["price_period"] = "monthly"
        else:
            item["price_period"] = "total"

        item["is_active"] = True

        yield item

    def _parse_details_dl(self, response):
        """Extract key-value pairs from the dl.attributes definition list.

        Returns:
            Dict mapping dt text to dd text.
        """
        details = {}
        dts = response.css("dl.attributes dt")
        dds = response.css("dl.attributes dd")

        for dt, dd in zip(dts, dds):
            key = dt.css("::text").get("").strip()
            # Get all text from dd, including nested spans
            value_parts = dd.css("::text").getall()
            value = " ".join(part.strip() for part in value_parts if part.strip())
            if key and key not in details:
                # Only take the first occurrence (some fields duplicate)
                details[key] = value

        return details

    def _extract_id_from_url(self, url: str) -> Optional[str]:
        """Extract the numeric listing ID from a MirLir detail URL.

        URL pattern: /shpallje/{City}/{Category}/{Title-Slug}-{ID}/
        Example: /shpallje/Tirane/Apartamente-Banesaneshitje/Shitet-Apartament-2-1-Blloku-5100001/
        """
        match = re.search(r'-(\d{5,})/?$', url.rstrip('/'))
        if match:
            return match.group(1)
        # Fallback: last segment
        parts = url.rstrip('/').split('/')
        if parts:
            last = parts[-1]
            match = re.search(r'(\d{5,})', last)
            if match:
                return match.group(1)
        return None

    def _extract_city_from_url(self, url: str) -> Optional[str]:
        """Extract city from a detail page URL.

        Detail URLs: /shpallje/{City}/{Category}/{Slug}/
        Category URLs: /shpallje/k-{slug}/v-{city}/ -> returns None
        """
        match = re.search(r'/shpallje/([A-Z][a-z]+(?:-[A-Z]?[a-z]+)*)/', url)
        if match:
            return match.group(1)
        return None

    def _extract_city_from_category_url(self, url: str) -> Optional[str]:
        """Extract city from a category listing URL.

        Category URLs: /shpallje/k-{category-slug}/v-{city}/
        """
        match = re.search(r'/v-([a-z-]+)/?', url)
        if match:
            return match.group(1)
        return None
