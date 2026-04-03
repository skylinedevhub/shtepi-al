"""Tests for the indomio.al spider."""

import os

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.indomio import IndomioSpider


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _fake_response(filename, url="https://www.indomio.al/en/test"):
    filepath = os.path.join(FIXTURES_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        body = f.read()
    request = Request(url=url)
    return HtmlResponse(url=url, request=request, body=body, encoding="utf-8")


# ─── List page parsing ────────────────────────────────────────────


class TestParseListPage:
    def setup_method(self):
        self.spider = IndomioSpider()
        self.response = _fake_response(
            "indomio_list.html",
            url="https://www.indomio.al/en/for-sale/property/tirana-city",
        )
        self.response.meta["transaction_type"] = "sale"
        self.results = list(self.spider.parse(self.response))

    def test_yields_requests_for_listings(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/en/" in r.url and "page=" not in r.url
        ]
        assert len(requests) == 3

    def test_listing_urls_are_detail_pages(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/en/" in r.url and "page=" not in r.url
        ]
        for req in requests:
            assert re.search(r'/en/\d{7,}', req.url)

    def test_listing_callbacks(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/en/" in r.url and "page=" not in r.url
        ]
        for req in requests:
            assert req.callback == self.spider.parse_detail

    def test_yields_pagination_request(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "page=" in r.url
        ]
        assert len(requests) == 1
        assert "page=2" in requests[0].url

    def test_transaction_type_in_meta(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/en/" in r.url and "page=" not in r.url
        ]
        for req in requests:
            assert req.meta.get("transaction_type") == "sale"


# ─── Detail page parsing ─────────────────────────────────────────


class TestParseDetail:
    def setup_method(self):
        self.spider = IndomioSpider()
        self.response = _fake_response(
            "indomio_detail.html",
            url="https://www.indomio.al/en/13231793",
        )
        self.response.meta["transaction_type"] = "sale"
        results = list(self.spider.parse_detail(self.response))
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "indomio"

    def test_source_id(self):
        assert self.item["source_id"] == "13231793"

    def test_source_url(self):
        assert "13231793" in self.item["source_url"]

    def test_title(self):
        assert "Apartment for sale" in self.item["title"]
        assert "Harry Fultz" in self.item["title"]

    def test_price(self):
        assert self.item["price"] == 265000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "sale"

    def test_price_period(self):
        assert self.item["price_period"] == "total"

    def test_city(self):
        assert self.item["city"] == "Tirana"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "Harry Fultz"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"

    def test_area(self):
        assert self.item["area_sqm"] == 135.0

    def test_rooms(self):
        assert self.item["rooms"] == 3

    def test_bathrooms(self):
        assert self.item["bathrooms"] == 2

    def test_floor(self):
        assert self.item["floor"] == 3

    def test_parking(self):
        assert self.item["has_parking"] is True

    def test_elevator(self):
        assert self.item["has_elevator"] is True

    def test_furnished(self):
        assert self.item["is_furnished"] is True

    def test_room_config(self):
        assert self.item["room_config"] == "3+1"

    def test_images(self):
        assert len(self.item["images"]) == 5

    def test_image_count(self):
        assert self.item["image_count"] == 5

    def test_description(self):
        assert "Panorama" in self.item["description"]
        assert "elevator" in self.item["description"]

    def test_poster_name(self):
        assert self.item["poster_name"] == "HABITAT Real Estate Experts"

    def test_poster_type(self):
        assert self.item["poster_type"] == "agency"


# ─── ID extraction ───────────────────────────────────────────────


class TestExtractId:
    def setup_method(self):
        self.spider = IndomioSpider()

    def test_standard_url(self):
        assert self.spider._extract_id("https://www.indomio.al/en/13231793") == "13231793"

    def test_url_with_query(self):
        assert self.spider._extract_id("https://www.indomio.al/en/18300666?position=1") == "18300666"


# ─── Price parsing ────────────────────────────────────────────────


class TestParsePrice:
    def setup_method(self):
        self.spider = IndomioSpider()

    def test_eur_price(self):
        price, currency = self.spider._parse_price("€ 265,000")
        assert price == 265000.0
        assert currency == "EUR"

    def test_price_without_symbol(self):
        price, currency = self.spider._parse_price("139,800")
        assert price == 139800.0

    def test_empty(self):
        price, currency = self.spider._parse_price("")
        assert price is None


# ─── Neighborhood parsing ────────────────────────────────────────


class TestParseNeighborhood:
    def setup_method(self):
        self.spider = IndomioSpider()

    def test_with_city(self):
        city, neigh = self.spider._parse_neighborhood("Harry Fultz (Tirana - city)")
        assert city == "Tirana"
        assert neigh == "Harry Fultz"

    def test_durres(self):
        city, neigh = self.spider._parse_neighborhood("Center (Durres - city)")
        assert city == "Durres"
        assert neigh == "Center"

    def test_plain(self):
        city, neigh = self.spider._parse_neighborhood("Somewhere")
        assert city == "Somewhere"
        assert neigh is None

    def test_empty(self):
        city, neigh = self.spider._parse_neighborhood("")
        assert city is None
        assert neigh is None


# ─── Start requests ──────────────────────────────────────────────


class TestStartRequests:
    def test_generates_requests_for_regions(self):
        spider = IndomioSpider()
        requests = list(spider.start_requests())
        # 11 regions x 2 transaction types
        assert len(requests) == 22

    def test_includes_sale_and_rent(self):
        spider = IndomioSpider()
        requests = list(spider.start_requests())
        sale_reqs = [r for r in requests if "for-sale" in r.url]
        rent_reqs = [r for r in requests if "to-rent" in r.url]
        assert len(sale_reqs) == 11
        assert len(rent_reqs) == 11

    def test_requests_use_playwright_meta(self):
        spider = IndomioSpider()
        requests = list(spider.start_requests())
        for req in requests:
            assert req.meta.get("playwright") is True


# ─── Playwright settings ─────────────────────────────────────────


class TestCustomSettings:
    def test_uses_playwright_download_handler(self):
        spider = IndomioSpider()
        handlers = spider.custom_settings.get("DOWNLOAD_HANDLERS", {})
        assert "scrapy_playwright" in handlers.get("https", "")

    def test_sets_playwright_browser_type(self):
        spider = IndomioSpider()
        assert spider.custom_settings.get("PLAYWRIGHT_BROWSER_TYPE") == "chromium"

    def test_disables_robotstxt(self):
        spider = IndomioSpider()
        assert spider.custom_settings.get("ROBOTSTXT_OBEY") is False

    def test_detail_requests_use_playwright(self):
        """Detail page requests from parse() must include playwright meta."""
        spider = IndomioSpider()
        response = _fake_response(
            "indomio_list.html",
            url="https://www.indomio.al/en/for-sale/property/tirana-city",
        )
        response.meta["transaction_type"] = "sale"
        results = list(spider.parse(response))
        detail_reqs = [
            r for r in results
            if isinstance(r, Request) and "/en/" in r.url and "page=" not in r.url
        ]
        for req in detail_reqs:
            assert req.meta.get("playwright") is True

    def test_pagination_requests_use_playwright(self):
        """Pagination requests from parse() must include playwright meta."""
        spider = IndomioSpider()
        response = _fake_response(
            "indomio_list.html",
            url="https://www.indomio.al/en/for-sale/property/tirana-city",
        )
        response.meta["transaction_type"] = "sale"
        results = list(spider.parse(response))
        page_reqs = [
            r for r in results
            if isinstance(r, Request) and "page=" in r.url
        ]
        for req in page_reqs:
            assert req.meta.get("playwright") is True


import re
