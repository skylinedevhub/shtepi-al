"""Tests for MirLir.com spider."""

import os

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.mirlir import MirLirSpider


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _fake_response(filename, url="https://mirlir.com/shpallje/k-apartamente-banesa-ne-shitje/v-tirane/"):
    """Build a Scrapy HtmlResponse from a local fixture file."""
    filepath = os.path.join(FIXTURES_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        body = f.read()
    request = Request(url=url)
    return HtmlResponse(
        url=url,
        request=request,
        body=body,
        encoding="utf-8",
    )


class TestParseListingPage:
    """Test list page parsing: yields detail requests + pagination."""

    def setup_method(self):
        self.spider = MirLirSpider()
        self.response = _fake_response("mirlir_list.html")

    def test_yields_requests_for_each_listing(self):
        results = list(self.spider.parse(self.response))
        # Should yield Request objects for detail pages
        detail_requests = [r for r in results if hasattr(r, "url") and "/shpallje/Tirane/" in r.url]
        assert len(detail_requests) == 3

    def test_detail_urls_correct(self):
        results = list(self.spider.parse(self.response))
        detail_requests = [r for r in results if hasattr(r, "url") and "/shpallje/Tirane/" in r.url]
        urls = [r.url for r in detail_requests]
        assert "https://mirlir.com/shpallje/Tirane/Apartamente-Banesaneshitje/Shitet-Apartament-2-1-Blloku-5100001/" in urls
        assert "https://mirlir.com/shpallje/Tirane/Apartamente-Banesaneshitje/Apartament-1-1-me-qera-Komuna-Parisit-5100002/" in urls
        assert "https://mirlir.com/shpallje/Tirane/Apartamente-Banesaneshitje/SHITET-APARTAMENT-3-1-2-Unaza-e-Re-5100003/" in urls

    def test_yields_pagination_request(self):
        results = list(self.spider.parse(self.response))
        pagination_requests = [
            r for r in results
            if hasattr(r, "url") and "/shpallje/Tirane/" not in r.url and hasattr(r, "callback")
        ]
        # Should follow the "Next" link
        next_urls = [r.url for r in pagination_requests]
        assert any("/v-tirane/2/" in url for url in next_urls)

    def test_detail_request_callback(self):
        results = list(self.spider.parse(self.response))
        detail_requests = [r for r in results if hasattr(r, "url") and "/shpallje/Tirane/" in r.url]
        for req in detail_requests:
            assert req.callback == self.spider.parse_detail

    def test_meta_carries_city(self):
        """Verify city extracted from listing page URL is passed in request meta."""
        results = list(self.spider.parse(self.response))
        detail_requests = [r for r in results if hasattr(r, "url") and "/shpallje/Tirane/" in r.url]
        for req in detail_requests:
            # City should be extracted from URL or listing card
            assert req.meta.get("city") is not None


class TestParseDetail:
    """Test detail page extraction: all ListingItem fields."""

    def setup_method(self):
        self.spider = MirLirSpider()
        url = "https://mirlir.com/shpallje/Tirane/Apartamente-Banesaneshitje/Shitet-Apartament-2-1-Blloku-5100001/"
        self.response = _fake_response("mirlir_listing.html", url=url)
        self.response.meta["city"] = "Tirane"
        items = list(self.spider.parse_detail(self.response))
        assert len(items) == 1, f"Expected 1 item, got {len(items)}"
        self.item = items[0]

    def test_source(self):
        assert self.item["source"] == "mirlir"

    def test_source_url(self):
        assert self.item["source_url"] == self.response.url

    def test_source_id(self):
        assert self.item["source_id"] == "5100001"

    def test_title(self):
        assert self.item["title"] == "Shitet Apartament 2+1, Blloku"

    def test_price(self):
        assert self.item["price"] == 120000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "sale"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"

    def test_area_sqm(self):
        assert self.item["area_sqm"] == 85.0

    def test_rooms(self):
        assert self.item["rooms"] == 2

    def test_floor(self):
        assert self.item["floor"] == 3

    def test_city(self):
        assert self.item["city"] == "Tirane"

    def test_description(self):
        assert "Shitet apartament 2+1" in self.item["description"]
        assert "120,000 Euro" in self.item["description"]

    def test_images(self):
        images = self.item["images"]
        assert isinstance(images, list)
        assert len(images) == 5
        assert all("_big.jpg" in img for img in images)

    def test_poster_name(self):
        assert self.item["poster_name"] == "Arben Krasniqi"

    def test_poster_phone(self):
        assert "+355691234567" in self.item["poster_phone"]

    def test_features_from_tags(self):
        """Characteristics tags should be captured in description or features."""
        desc = self.item.get("description", "")
        # The spider should detect features from the attr-tags or description
        assert self.item.get("has_elevator") is True or "ashensor" in desc.lower() or "Ashensor" in desc


class TestCityFromUrl:
    """Test city extraction from URL path."""

    def setup_method(self):
        self.spider = MirLirSpider()

    def test_tirane_from_url(self):
        url = "https://mirlir.com/shpallje/Tirane/Apartamente-Banesaneshitje/Some-Listing-12345/"
        city = self.spider._extract_city_from_url(url)
        assert city == "Tirane"

    def test_durres_from_url(self):
        url = "https://mirlir.com/shpallje/Durres/Apartamente-Banesaneshitje/Some-Listing-12345/"
        city = self.spider._extract_city_from_url(url)
        assert city == "Durres"

    def test_vlore_from_url(self):
        url = "https://mirlir.com/shpallje/Vlore/Shtepi-Vila/Shitet-Vila-55555/"
        city = self.spider._extract_city_from_url(url)
        assert city == "Vlore"

    def test_category_url_returns_none(self):
        url = "https://mirlir.com/shpallje/k-apartamente-banesa-ne-shitje/v-tirane/"
        city = self.spider._extract_city_from_url(url)
        assert city is None

    def test_city_from_v_param(self):
        """Test extracting city from category URL v-{city} pattern."""
        url = "https://mirlir.com/shpallje/k-apartamente-banesa-ne-shitje/v-tirane/"
        city = self.spider._extract_city_from_category_url(url)
        assert city == "tirane"

    def test_city_from_v_param_durres(self):
        url = "https://mirlir.com/shpallje/k-apartamente-banesa-ne-shitje/v-durres/"
        city = self.spider._extract_city_from_category_url(url)
        assert city == "durres"
