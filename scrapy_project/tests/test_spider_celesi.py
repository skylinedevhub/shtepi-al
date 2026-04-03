"""Tests for the Gazeta Celesi spider."""

import os
from pathlib import Path

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.celesi import CelesiSpider


FIXTURES = Path(__file__).parent / "fixtures"


def _fake_response(filename, url):
    """Build a Scrapy HtmlResponse from a local fixture file."""
    filepath = FIXTURES / filename
    body = filepath.read_bytes()
    request = Request(url=url)
    return HtmlResponse(
        url=url,
        request=request,
        body=body,
        encoding="utf-8",
    )


@pytest.fixture
def spider():
    return CelesiSpider()


# ---- List page parsing -------------------------------------------------------


class TestParseListingPage:
    """Test that the listing page (card grid) is parsed correctly."""

    def test_parse_yields_detail_requests(self, spider):
        """Cards on the listing page should yield Request objects for detail pages."""
        response = _fake_response(
            "celesi_list.html",
            "https://www.gazetacelesi.al/en/shtepi-ne-shitje/apartament",
        )
        results = list(spider.parse(response))
        # Separate requests from items
        requests = [r for r in results if isinstance(r, Request)]
        # We have 4 regular + 1 premium card = 5 detail links, plus pagination
        detail_requests = [
            r for r in requests if "/shtepi/njoftime/" in r.url
        ]
        assert len(detail_requests) >= 4, (
            f"Expected at least 4 detail requests, got {len(detail_requests)}"
        )

    def test_parse_yields_pagination_requests(self, spider):
        """Pagination links should yield Request objects for next pages."""
        response = _fake_response(
            "celesi_list.html",
            "https://www.gazetacelesi.al/en/shtepi-ne-shitje/apartament",
        )
        results = list(spider.parse(response))
        requests = [r for r in results if isinstance(r, Request)]
        pagination_requests = [
            r for r in requests if "page=" in r.url
        ]
        # Should have at least one next-page link
        assert len(pagination_requests) >= 1, (
            f"Expected pagination requests, got {len(pagination_requests)}"
        )

    def test_parse_detail_urls_are_absolute(self, spider):
        """All yielded detail request URLs should be absolute."""
        response = _fake_response(
            "celesi_list.html",
            "https://www.gazetacelesi.al/en/shtepi-ne-shitje/apartament",
        )
        results = list(spider.parse(response))
        requests = [r for r in results if isinstance(r, Request)]
        detail_requests = [
            r for r in requests if "/shtepi/njoftime/" in r.url
        ]
        for req in detail_requests:
            assert req.url.startswith("http"), f"URL not absolute: {req.url}"

    def test_parse_no_duplicate_detail_urls(self, spider):
        """Each detail page URL should be yielded at most once."""
        response = _fake_response(
            "celesi_list.html",
            "https://www.gazetacelesi.al/en/shtepi-ne-shitje/apartament",
        )
        results = list(spider.parse(response))
        requests = [r for r in results if isinstance(r, Request)]
        detail_urls = [
            r.url for r in requests if "/shtepi/njoftime/" in r.url
        ]
        assert len(detail_urls) == len(set(detail_urls)), (
            "Duplicate detail URLs found"
        )


# ---- Detail page parsing -----------------------------------------------------


class TestParseDetail:
    """Test that the detail page fields are extracted correctly."""

    def _get_item(self, spider):
        response = _fake_response(
            "celesi_listing.html",
            "https://www.gazetacelesi.al/en/shtepi/njoftime/apartament-31-ne-shitje-komuna-e-parisit-1680001.html",
        )
        items = list(spider.parse_detail(response))
        assert len(items) == 1, f"Expected 1 item, got {len(items)}"
        return items[0]

    def test_source(self, spider):
        item = self._get_item(spider)
        assert item["source"] == "celesi"

    def test_source_url(self, spider):
        item = self._get_item(spider)
        assert item["source_url"] == (
            "https://www.gazetacelesi.al/en/shtepi/njoftime/"
            "apartament-31-ne-shitje-komuna-e-parisit-1680001.html"
        )

    def test_source_id(self, spider):
        item = self._get_item(spider)
        assert item["source_id"] == "1680001"

    def test_title(self, spider):
        item = self._get_item(spider)
        assert item["title"] == "Apartament 3+1 ne shitje, Komuna e Parisit"

    def test_price(self, spider):
        item = self._get_item(spider)
        assert item["price"] == 120000.0

    def test_currency(self, spider):
        item = self._get_item(spider)
        assert item["currency_original"] == "EUR"

    def test_area(self, spider):
        item = self._get_item(spider)
        assert item["area_sqm"] == 95.0

    def test_room_config(self, spider):
        item = self._get_item(spider)
        assert item["room_config"] == "3+1"

    def test_rooms(self, spider):
        item = self._get_item(spider)
        assert item["rooms"] == 3

    def test_bathrooms(self, spider):
        item = self._get_item(spider)
        assert item["bathrooms"] == 1

    def test_floor(self, spider):
        item = self._get_item(spider)
        assert item["floor"] == 5

    def test_total_floors(self, spider):
        item = self._get_item(spider)
        assert item["total_floors"] == 9

    def test_description(self, spider):
        item = self._get_item(spider)
        assert "Komunen e Parisit" in item["description"]
        assert "ashensor" in item["description"]

    def test_images(self, spider):
        item = self._get_item(spider)
        assert isinstance(item["images"], list)
        assert len(item["images"]) == 3
        assert all(
            url.startswith("http") for url in item["images"]
        )

    def test_city(self, spider):
        item = self._get_item(spider)
        assert item["city"] == "Tirane"

    def test_neighborhood(self, spider):
        item = self._get_item(spider)
        assert item["neighborhood"] == "Komuna Parisit"

    def test_poster_name(self, spider):
        item = self._get_item(spider)
        assert item["poster_name"] == "GREEN REAL ESTATE"

    def test_poster_phone(self, spider):
        item = self._get_item(spider)
        assert "+355672020906" in item["poster_phone"]

    def test_poster_type_agency(self, spider):
        item = self._get_item(spider)
        assert item["poster_type"] == "agency"

    def test_transaction_type_sale(self, spider):
        """Transaction type should be detected from the URL path."""
        item = self._get_item(spider)
        assert item["transaction_type"] == "sale"

    def test_transaction_type_rent(self, spider):
        """A URL with 'shtepi-me-qera' should yield rent."""
        response = _fake_response(
            "celesi_listing.html",
            "https://www.gazetacelesi.al/en/shtepi-me-qera/apartament/njoftime/apartament-31-1680001.html",
        )
        items = list(spider.parse_detail(response))
        item = items[0]
        assert item["transaction_type"] == "rent"

    def test_property_type(self, spider):
        item = self._get_item(spider)
        assert item["property_type"] == "apartament"


# ---- Price and area extraction -----------------------------------------------


# ---- Playwright settings --------------------------------------------------------


class TestCustomSettings:
    def test_uses_playwright_download_handler(self, spider):
        handlers = spider.custom_settings.get("DOWNLOAD_HANDLERS", {})
        assert "scrapy_playwright" in handlers.get("https", "")

    def test_sets_playwright_browser_type(self, spider):
        assert spider.custom_settings.get("PLAYWRIGHT_BROWSER_TYPE") == "chromium"

    def test_disables_robotstxt(self, spider):
        assert spider.custom_settings.get("ROBOTSTXT_OBEY") is False

    def test_keeps_download_delay(self, spider):
        assert spider.custom_settings.get("DOWNLOAD_DELAY") == 2.0

    def test_keeps_concurrent_requests(self, spider):
        assert spider.custom_settings.get("CONCURRENT_REQUESTS_PER_DOMAIN") == 2


class TestPlaywrightMeta:
    def test_start_requests_use_playwright(self, spider):
        requests = list(spider.start_requests())
        for req in requests:
            assert req.meta.get("playwright") is True

    def test_detail_requests_use_playwright(self, spider):
        response = _fake_response(
            "celesi_list.html",
            "https://www.gazetacelesi.al/en/shtepi-ne-shitje/apartament",
        )
        results = list(spider.parse(response))
        detail_reqs = [
            r for r in results
            if isinstance(r, Request) and "/shtepi/njoftime/" in r.url
        ]
        for req in detail_reqs:
            assert req.meta.get("playwright") is True

    def test_pagination_requests_use_playwright(self, spider):
        response = _fake_response(
            "celesi_list.html",
            "https://www.gazetacelesi.al/en/shtepi-ne-shitje/apartament",
        )
        results = list(spider.parse(response))
        page_reqs = [
            r for r in results
            if isinstance(r, Request) and "page=" in r.url
        ]
        for req in page_reqs:
            assert req.meta.get("playwright") is True


# ---- Price and area extraction -----------------------------------------------


class TestPriceAndAreaExtraction:
    """Test numeric parsing of price and area values."""

    def test_euro_price_with_dots(self, spider):
        """Price '120.000' with European dot separators should parse to 120000."""
        response = _fake_response(
            "celesi_listing.html",
            "https://www.gazetacelesi.al/en/shtepi/njoftime/test-1680001.html",
        )
        items = list(spider.parse_detail(response))
        item = items[0]
        assert item["price"] == 120000.0

    def test_area_m2_extraction(self, spider):
        """Area '95 m2' should parse to 95.0."""
        response = _fake_response(
            "celesi_listing.html",
            "https://www.gazetacelesi.al/en/shtepi/njoftime/test-1680001.html",
        )
        items = list(spider.parse_detail(response))
        item = items[0]
        assert item["area_sqm"] == 95.0

    def test_floor_extraction(self, spider):
        """Floor 'Kati 5/9' should parse to floor=5, total_floors=9."""
        response = _fake_response(
            "celesi_listing.html",
            "https://www.gazetacelesi.al/en/shtepi/njoftime/test-1680001.html",
        )
        items = list(spider.parse_detail(response))
        item = items[0]
        assert item["floor"] == 5
        assert item["total_floors"] == 9
