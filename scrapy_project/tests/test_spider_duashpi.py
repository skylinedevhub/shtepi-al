"""Tests for the duashpi.al spider."""

import os

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.duashpi import DuashpiSpider


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _fake_response(filename, url="https://duashpi.al/test"):
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


# ─── List page parsing ────────────────────────────────────────────


class TestParseListPage:
    """Test parsing of the listing results page."""

    def setup_method(self):
        self.spider = DuashpiSpider()
        self.response = _fake_response(
            "duashpi_list.html",
            url="https://duashpi.al/shtepi-ne-shitje",
        )
        self.results = list(self.spider.parse(self.response))

    def test_yields_requests_for_listings(self):
        """Should yield Request objects for each listing card."""
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/prona/" in r.url
        ]
        assert len(requests) == 3

    def test_listing_urls_are_absolute(self):
        """Listing URLs should be fully qualified."""
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/prona/" in r.url
        ]
        for req in requests:
            assert req.url.startswith("https://duashpi.al/prona/")

    def test_listing_callbacks_are_parse_listing(self):
        """Listing requests should use parse_listing as callback."""
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/prona/" in r.url
        ]
        for req in requests:
            assert req.callback == self.spider.parse_listing

    def test_yields_pagination_request(self):
        """Should yield a Request for the next page."""
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "page=" in r.url
        ]
        assert len(requests) == 1
        assert "page=2" in requests[0].url

    def test_transaction_type_in_meta(self):
        """Listing requests should carry transaction_type in meta."""
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/prona/" in r.url
        ]
        for req in requests:
            assert req.meta.get("transaction_type") == "sale"


class TestParseRentListPage:
    """Test that rent URLs correctly set transaction_type meta."""

    def setup_method(self):
        self.spider = DuashpiSpider()
        self.response = _fake_response(
            "duashpi_list.html",
            url="https://duashpi.al/shtepi-me-qera",
        )
        self.results = list(self.spider.parse(self.response))

    def test_transaction_type_is_rent(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/prona/" in r.url
        ]
        for req in requests:
            assert req.meta.get("transaction_type") == "rent"


# ─── Detail page parsing (sale) ─────────────────────────────────


class TestParseDetailSale:
    """Test parsing of a sale listing detail page."""

    def setup_method(self):
        self.spider = DuashpiSpider()
        self.response = _fake_response(
            "duashpi_detail.html",
            url="https://duashpi.al/prona/698c7a3aad711d52da018da2/shitet-apartament-212-komuna-e-parisit-tirane.html",
        )
        self.response.meta["transaction_type"] = "sale"
        results = list(self.spider.parse_listing(self.response))
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "duashpi"

    def test_source_url(self):
        assert "698c7a3aad711d52da018da2" in self.item["source_url"]

    def test_source_id(self):
        assert self.item["source_id"] == "698c7a3aad711d52da018da2"

    def test_title(self):
        assert self.item["title"] == "Shitet, Apartament 2+1+2, Komuna e Parisit, Tirane"

    def test_city(self):
        assert self.item["city"] == "Tirane"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "Komuna e Parisit"

    def test_price(self):
        assert self.item["price"] == 255000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_price_period(self):
        assert self.item["price_period"] == "total"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "sale"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"

    def test_room_config(self):
        assert self.item["room_config"] == "2+1+2"

    def test_area(self):
        assert self.item["area_sqm"] == 101.0

    def test_rooms(self):
        assert self.item["rooms"] == 2

    def test_bathrooms(self):
        assert self.item["bathrooms"] == 1

    def test_floor(self):
        assert self.item["floor"] == 11

    def test_images(self):
        images = self.item["images"]
        assert len(images) == 5
        assert all("uploads/images/main" in url for url in images)

    def test_image_count(self):
        assert self.item["image_count"] == 5

    def test_description(self):
        assert "Komuna e Parisit" in self.item["description"]
        assert "ashensor" in self.item["description"]

    def test_phone(self):
        assert self.item["poster_phone"] == "+355697015485"


# ─── Detail page parsing (rent) ─────────────────────────────────


class TestParseDetailRent:
    """Test parsing of a rent listing detail page."""

    def setup_method(self):
        self.spider = DuashpiSpider()
        self.response = _fake_response(
            "duashpi_detail_rent.html",
            url="https://duashpi.al/prona/698c5d8f4f17f8bb29077dc3/jepet-me-qera-apartament-11-qender.html",
        )
        self.response.meta["transaction_type"] = "rent"
        results = list(self.spider.parse_listing(self.response))
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "duashpi"

    def test_source_id(self):
        assert self.item["source_id"] == "698c5d8f4f17f8bb29077dc3"

    def test_title(self):
        assert "1+1" in self.item["title"]
        assert "qera" in self.item["title"].lower()

    def test_city(self):
        assert self.item["city"] == "Tirane"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "Blloku"

    def test_price(self):
        assert self.item["price"] == 700.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_price_period(self):
        assert self.item["price_period"] == "monthly"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "rent"

    def test_room_config(self):
        assert self.item["room_config"] == "1+1"

    def test_area(self):
        assert self.item["area_sqm"] == 65.0

    def test_rooms(self):
        assert self.item["rooms"] == 1

    def test_bathrooms(self):
        assert self.item["bathrooms"] == 1

    def test_floor(self):
        assert self.item["floor"] == 3

    def test_total_floors(self):
        assert self.item["total_floors"] == 8

    def test_images(self):
        images = self.item["images"]
        assert len(images) == 3
        assert all("uploads/images/main" in url for url in images)

    def test_description(self):
        assert "Bllok" in self.item["description"]
        assert "700 Euro/muaj" in self.item["description"]

    def test_phone(self):
        assert self.item["poster_phone"] == "+355692345678"


# ─── ID extraction ───────────────────────────────────────────────


class TestExtractId:
    """Test _extract_id with various URL formats."""

    def setup_method(self):
        self.spider = DuashpiSpider()

    def test_standard_url(self):
        tid = self.spider._extract_id(
            "https://duashpi.al/prona/698c7a3aad711d52da018da2/slug.html"
        )
        assert tid == "698c7a3aad711d52da018da2"

    def test_url_without_html_suffix(self):
        tid = self.spider._extract_id(
            "https://duashpi.al/prona/abc123def456/some-slug"
        )
        assert tid == "abc123def456"

    def test_short_id(self):
        tid = self.spider._extract_id(
            "https://duashpi.al/prona/6878dfe2f71d0ee8ac038102/test.html"
        )
        assert tid == "6878dfe2f71d0ee8ac038102"


# ─── Price parsing ────────────────────────────────────────────────


class TestParsePrice:
    """Test _parse_price with various formats."""

    def setup_method(self):
        self.spider = DuashpiSpider()

    def test_eur_price(self):
        price, currency = self.spider._parse_price("255,000 €")
        assert price == 255000.0
        assert currency == "EUR"

    def test_monthly_rent_price(self):
        price, currency = self.spider._parse_price("700 € / në muaj")
        assert price == 700.0
        assert currency == "EUR"

    def test_lek_price(self):
        price, currency = self.spider._parse_price("8,500,000 Lek")
        assert price == 8500000.0
        assert currency == "ALL"

    def test_empty_string(self):
        price, currency = self.spider._parse_price("")
        assert price is None
        assert currency is None

    def test_zero_price(self):
        price, currency = self.spider._parse_price("0 €")
        assert price is None


# ─── Location parsing ─────────────────────────────────────────────


class TestParseLocation:
    """Test _parse_location with various formats."""

    def setup_method(self):
        self.spider = DuashpiSpider()

    def test_neighborhood_and_city(self):
        city, neighborhood = self.spider._parse_location(
            "Komuna e Parisit, Tirane"
        )
        assert city == "Tirane"
        assert neighborhood == "Komuna e Parisit"

    def test_city_only(self):
        city, neighborhood = self.spider._parse_location("Tirane")
        assert city == "Tirane"
        assert neighborhood is None

    def test_empty(self):
        city, neighborhood = self.spider._parse_location("")
        assert city is None
        assert neighborhood is None

    def test_multi_part_neighborhood(self):
        city, neighborhood = self.spider._parse_location(
            "Rruga Gryka e Kaçanikut, Tirane"
        )
        assert city == "Tirane"
        assert neighborhood == "Rruga Gryka e Kaçanikut"


# ─── Transaction type detection ────────────────────────────────


class TestDetectTransaction:
    """Test _detect_transaction with badge text."""

    def setup_method(self):
        self.spider = DuashpiSpider()

    def test_per_shitje(self):
        assert self.spider._detect_transaction("Për shitje", "rent") == "sale"

    def test_me_qera(self):
        assert self.spider._detect_transaction("Me qera", "sale") == "rent"

    def test_empty_falls_back(self):
        assert self.spider._detect_transaction("", "rent") == "rent"

    def test_none_falls_back(self):
        assert self.spider._detect_transaction(None, "sale") == "sale"


# ─── Property type detection ───────────────────────────────────


class TestDetectPropertyType:
    """Test _detect_property_type from title."""

    def setup_method(self):
        self.spider = DuashpiSpider()

    def test_apartament(self):
        assert self.spider._detect_property_type(
            "Shitet, Apartament 2+1+2"
        ) == "apartment"

    def test_vile(self):
        assert self.spider._detect_property_type(
            "Shitet vilë 3+1"
        ) == "villa"

    def test_shtepi(self):
        assert self.spider._detect_property_type(
            "Shitet shtëpi private"
        ) == "house"

    def test_garsoniere(self):
        assert self.spider._detect_property_type(
            "Garsoniere per shitje"
        ) == "studio"

    def test_default_apartment(self):
        assert self.spider._detect_property_type(
            "Super okazion!"
        ) == "apartment"


# ─── Start URLs ────────────────────────────────────────────────


class TestStartUrls:
    """Test that START_URLS are configured correctly."""

    def test_contains_sale_url(self):
        spider = DuashpiSpider()
        assert "https://duashpi.al/shtepi-ne-shitje" in spider.START_URLS

    def test_contains_rent_url(self):
        spider = DuashpiSpider()
        assert "https://duashpi.al/shtepi-me-qera" in spider.START_URLS

    def test_start_urls_count(self):
        spider = DuashpiSpider()
        assert len(spider.START_URLS) == 2


class TestStartRequests:
    """Test that start_requests() produces correct requests."""

    def test_yields_requests_for_all_start_urls(self):
        spider = DuashpiSpider()
        requests = list(spider.start_requests())
        assert len(requests) == 2

    def test_requests_have_impersonate_meta(self):
        spider = DuashpiSpider()
        requests = list(spider.start_requests())
        for req in requests:
            assert req.meta.get("impersonate") == "chrome"

    def test_request_urls_match_start_urls(self):
        spider = DuashpiSpider()
        requests = list(spider.start_requests())
        urls = [r.url for r in requests]
        assert "https://duashpi.al/shtepi-ne-shitje" in urls
        assert "https://duashpi.al/shtepi-me-qera" in urls


# ─── Metadata extraction ──────────────────────────────────────


class TestExtractMetadata:
    """Test _extract_metadata from detail page."""

    def setup_method(self):
        self.spider = DuashpiSpider()
        self.response = _fake_response(
            "duashpi_detail.html",
            url="https://duashpi.al/prona/698c7a3aad711d52da018da2/test.html",
        )

    def test_extracts_area(self):
        meta = self.spider._extract_metadata(self.response)
        assert meta["area_sqm"] == 101.0

    def test_extracts_rooms(self):
        meta = self.spider._extract_metadata(self.response)
        assert meta["rooms"] == 2

    def test_extracts_bathrooms(self):
        meta = self.spider._extract_metadata(self.response)
        assert meta["bathrooms"] == 1

    def test_extracts_floor(self):
        meta = self.spider._extract_metadata(self.response)
        assert meta["floor"] == 11
