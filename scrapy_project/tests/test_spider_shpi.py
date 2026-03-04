"""Tests for the shpi.al spider."""

import os

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.shpi import ShpiSpider


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _fake_response(filename, url="https://www.shpi.al/test"):
    """Build a Scrapy HtmlResponse from a local fixture file."""
    filepath = os.path.join(FIXTURES_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        body = f.read()
    request = Request(url=url)
    return HtmlResponse(
        url=url, request=request, body=body, encoding="utf-8",
    )


# ─── List page parsing ────────────────────────────────────────────


class TestParseListPage:
    """Test parsing of the listing results page."""

    def setup_method(self):
        self.spider = ShpiSpider()
        self.response = _fake_response(
            "shpi_list.html",
            url="https://www.shpi.al/prona/banimi/ne-shitje/",
        )
        self.response.meta["transaction_type"] = "sale"
        self.results = list(self.spider.parse(self.response))

    def test_yields_requests_for_listings(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "shpi.al/prona/banimi" in r.url and "index" not in r.url
        ]
        assert len(requests) == 3

    def test_listing_urls_are_absolute(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and ".html" in r.url and "index" not in r.url
        ]
        for req in requests:
            assert req.url.startswith("https://www.shpi.al/")

    def test_listing_callbacks(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and ".html" in r.url and "index" not in r.url
        ]
        for req in requests:
            assert req.callback == self.spider.parse_detail

    def test_yields_pagination_request(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "index" in r.url
        ]
        assert len(requests) == 1
        assert "index2.html" in requests[0].url

    def test_transaction_type_in_meta(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and ".html" in r.url and "index" not in r.url
        ]
        for req in requests:
            assert req.meta.get("transaction_type") == "sale"


class TestParseRentListPage:
    def setup_method(self):
        self.spider = ShpiSpider()
        self.response = _fake_response(
            "shpi_list.html",
            url="https://www.shpi.al/prona/banimi/me-qera/",
        )
        self.response.meta["transaction_type"] = "rent"
        self.results = list(self.spider.parse(self.response))

    def test_transaction_type_is_rent(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and ".html" in r.url and "index" not in r.url
        ]
        for req in requests:
            assert req.meta.get("transaction_type") == "rent"


# ─── Detail page parsing (sale) ─────────────────────────────────


class TestParseDetailSale:
    """Test parsing of a sale listing detail page."""

    def setup_method(self):
        self.spider = ShpiSpider()
        self.response = _fake_response(
            "shpi_detail.html",
            url="https://www.shpi.al/prona/banimi/ne-shitje/shitet-apartament-2-1-2-ne-rr-frosina-plaku-shitje-90785.html",
        )
        self.response.meta["transaction_type"] = "sale"
        results = list(self.spider.parse_detail(self.response))
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "shpi"

    def test_source_url(self):
        assert "90785" in self.item["source_url"]

    def test_source_id(self):
        assert self.item["source_id"] == "90785"

    def test_title(self):
        assert "Apartament 2+1+2" in self.item["title"]
        assert "Frosina Plaku" in self.item["title"]

    def test_city(self):
        assert self.item["city"] == "Tirana"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "Rruga Frosina Plaku"

    def test_price(self):
        assert self.item["price"] == 243000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_price_period(self):
        assert self.item["price_period"] == "total"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "sale"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"

    def test_room_config(self):
        assert self.item["room_config"] == "2+1"

    def test_rooms(self):
        assert self.item["rooms"] == 2

    def test_area(self):
        assert self.item["area_sqm"] == 105.3

    def test_bathrooms(self):
        assert self.item["bathrooms"] == 2

    def test_floor(self):
        assert self.item["floor"] == 3

    def test_elevator(self):
        assert self.item["has_elevator"] is True

    def test_parking(self):
        assert self.item["has_parking"] is False

    def test_images(self):
        assert len(self.item["images"]) == 5

    def test_image_count(self):
        assert self.item["image_count"] == 5

    def test_description(self):
        assert "Frosina Plaku" in self.item["description"]
        assert "105.3 m2" in self.item["description"]

    def test_poster_name(self):
        assert self.item["poster_name"] == "Luan Aliu"

    def test_phone(self):
        assert self.item["poster_phone"] == "+355684081145"


# ─── Detail page parsing (rent) ─────────────────────────────────


class TestParseDetailRent:
    """Test parsing of a rent listing detail page."""

    def setup_method(self):
        self.spider = ShpiSpider()
        self.response = _fake_response(
            "shpi_detail_rent.html",
            url="https://www.shpi.al/prona/banimi/me-qera/jepet-me-qera-apartament-1-1-blloku-qera-103200.html",
        )
        self.response.meta["transaction_type"] = "rent"
        results = list(self.spider.parse_detail(self.response))
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "shpi"

    def test_source_id(self):
        assert self.item["source_id"] == "103200"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "rent"

    def test_price(self):
        assert self.item["price"] == 550.0

    def test_price_period(self):
        assert self.item["price_period"] == "monthly"

    def test_city(self):
        assert self.item["city"] == "Tirana"

    def test_area(self):
        assert self.item["area_sqm"] == 65.0

    def test_room_config(self):
        assert self.item["room_config"] == "1+1"

    def test_rooms(self):
        assert self.item["rooms"] == 1

    def test_floor(self):
        assert self.item["floor"] == 5

    def test_bathrooms(self):
        assert self.item["bathrooms"] == 1

    def test_images(self):
        assert len(self.item["images"]) == 3

    def test_description(self):
        assert "Bllok" in self.item["description"]
        assert "550 Euro/muaj" in self.item["description"]

    def test_poster_name(self):
        assert self.item["poster_name"] == "Agjencia Elite"

    def test_phone(self):
        assert self.item["poster_phone"] == "+355692345678"


# ─── ID extraction ───────────────────────────────────────────────


class TestExtractId:
    def setup_method(self):
        self.spider = ShpiSpider()

    def test_standard_url(self):
        assert self.spider._extract_id(
            "https://www.shpi.al/prona/banimi/ne-shitje/apartament-90262.html"
        ) == "90262"

    def test_long_slug(self):
        assert self.spider._extract_id(
            "https://www.shpi.al/prona/banimi/ne-shitje/shitet-apartament-2-1-2-ne-rr-frosina-plaku-shitje-90785.html"
        ) == "90785"

    def test_five_digit_id(self):
        assert self.spider._extract_id(
            "https://www.shpi.al/prona/banimi/me-qera/test-103747.html"
        ) == "103747"


# ─── Price parsing ────────────────────────────────────────────────


class TestParsePrice:
    def setup_method(self):
        self.spider = ShpiSpider()

    def test_eur_price(self):
        price, currency = self.spider._parse_price("€ 243.000,00")
        assert price == 243000.0
        assert currency == "EUR"

    def test_monthly_rent(self):
        price, currency = self.spider._parse_price("€ 550,00 / Në muaj")
        assert price == 550.0
        assert currency == "EUR"

    def test_large_price(self):
        price, currency = self.spider._parse_price("€ 1.940.000,00")
        assert price == 1940000.0
        assert currency == "EUR"

    def test_empty(self):
        price, currency = self.spider._parse_price("")
        assert price is None


# ─── Start URLs ──────────────────────────────────────────────────


class TestStartUrls:
    def test_contains_sale_url(self):
        spider = ShpiSpider()
        assert any("ne-shitje" in url for url in spider.START_URLS)

    def test_contains_rent_url(self):
        spider = ShpiSpider()
        assert any("me-qera" in url for url in spider.START_URLS)

    def test_start_requests_count(self):
        spider = ShpiSpider()
        requests = list(spider.start_requests())
        assert len(requests) == 2
