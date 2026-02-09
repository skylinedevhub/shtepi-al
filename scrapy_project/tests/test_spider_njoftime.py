"""Tests for the njoftime.com spider (XenForo forum scraper)."""

import os

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.njoftime import NjoftimeSpider


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _fake_response(filename, url="https://njoftime.com/test"):
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


# ─── Forum listing page ────────────────────────────────────────────


class TestParseForumListing:
    """Test parsing of the XenForo thread list page."""

    def setup_method(self):
        self.spider = NjoftimeSpider()
        self.response = _fake_response(
            "njoftime_list.html",
            url="https://njoftime.com/categories/apartamente-prona-imobiliare.41/",
        )
        self.results = list(self.spider.parse(self.response))

    def test_yields_requests_for_threads(self):
        """Should yield Request objects for each thread link."""
        requests = [r for r in self.results if isinstance(r, Request)]
        # 4 thread requests from the fixture
        thread_requests = [
            r for r in requests
            if "/threads/" in r.url and "page-" not in r.url
        ]
        assert len(thread_requests) == 4

    def test_thread_urls_are_absolute(self):
        """Thread URLs should be fully qualified."""
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/threads/" in r.url and "page-" not in r.url
        ]
        for req in requests:
            assert req.url.startswith("https://njoftime.com/threads/")

    def test_yields_pagination_request(self):
        """Should yield a Request for the next page."""
        requests = [r for r in self.results if isinstance(r, Request)]
        next_page_requests = [
            r for r in requests if "page-2" in r.url
        ]
        assert len(next_page_requests) == 1

    def test_thread_callbacks_are_parse_thread(self):
        """Thread requests should use parse_thread as callback."""
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/threads/" in r.url and "page-" not in r.url
        ]
        for req in requests:
            assert req.callback == self.spider.parse_thread


# ─── Thread detail page ────────────────────────────────────────────


class TestParseThread:
    """Test parsing of a XenForo thread detail page."""

    def setup_method(self):
        self.spider = NjoftimeSpider()
        self.response = _fake_response(
            "njoftime_thread.html",
            url="https://njoftime.com/threads/tirane-shitet-apartament-2-1-kati-3-85-m2-75-000-e-bllok.10001/",
        )
        results = list(self.spider.parse_thread(self.response))
        # Should yield exactly one item
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "njoftime"

    def test_source_url(self):
        assert "10001" in self.item["source_url"]

    def test_source_id(self):
        assert self.item["source_id"] == "10001"

    def test_title(self):
        assert "shitet" in self.item["title"].lower()
        assert "2+1" in self.item["title"]

    def test_city_extracted(self):
        assert self.item["city"] == "Tiranë"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "shitet"

    def test_property_type(self):
        assert self.item["property_type"] == "apartament"

    def test_room_config(self):
        assert self.item["room_config"] == "2+1"

    def test_floor(self):
        assert self.item["floor"] == 3

    def test_area(self):
        assert self.item["area_sqm"] == 85.0

    def test_price(self):
        assert self.item["price"] == 75000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "Bllok"

    def test_description_from_first_post(self):
        """Description should come from the first post body."""
        assert "apartament" in self.item["description"].lower()
        # Should not include text from reply posts
        assert "diskutueshem" not in self.item["description"].lower()

    def test_images_extracted(self):
        """Should extract image URLs from the first post."""
        images = self.item["images"]
        assert len(images) == 3
        assert all("njoftime.com" in url for url in images)

    def test_poster_name(self):
        assert self.item["poster_name"] == "agjencia_alba"

    def test_price_period_sale(self):
        assert self.item["price_period"] == "total"


# ─── Title regex parser ────────────────────────────────────────────


class TestParseTitleRegex:
    """Test the parse_thread_title helper with various title formats."""

    def setup_method(self):
        self.spider = NjoftimeSpider()

    def test_full_title_with_neighborhood(self):
        """Standard format: city, transaction property rooms floor, area price (neighborhood)"""
        result = self.spider.parse_thread_title(
            "Tiranë, shitet apartament 2+1 Kati 3, 85 m² 75,000 € (Bllok)"
        )
        assert result["city"] == "Tiranë"
        assert result["transaction_type"] == "shitet"
        assert result["property_type"] == "apartament"
        assert result["room_config"] == "2+1"
        assert result["floor"] == 3
        assert result["total_floors"] is None
        assert result["area_sqm"] == 85.0
        assert result["price"] == 75000.0
        assert result["currency"] == "EUR"
        assert result["neighborhood"] == "Bllok"

    def test_rent_with_floor_total(self):
        """Rent listing with floor/total_floors format and monthly price."""
        result = self.spider.parse_thread_title(
            "Durrës, jepet me qira apartament 1+1 Kati 2/5, 50 m² 300 €/muaj (Plazh)"
        )
        assert result["city"] == "Durrës"
        assert result["transaction_type"] == "jepet me qira"
        assert result["property_type"] == "apartament"
        assert result["room_config"] == "1+1"
        assert result["floor"] == 2
        assert result["total_floors"] == 5
        assert result["area_sqm"] == 50.0
        assert result["price"] == 300.0
        assert result["currency"] == "EUR"
        assert result["price_period"] == "monthly"
        assert result["neighborhood"] == "Plazh"

    def test_villa_no_rooms_no_neighborhood(self):
        """Villa without room config or neighborhood."""
        result = self.spider.parse_thread_title(
            "Vlorë, shitet vilë 150 m² 200,000 €"
        )
        assert result["city"] == "Vlorë"
        assert result["transaction_type"] == "shitet"
        assert result["property_type"] == "vilë"
        assert result["room_config"] is None
        assert result["area_sqm"] == 150.0
        assert result["price"] == 200000.0
        assert result["currency"] == "EUR"
        assert result["neighborhood"] is None

    def test_lek_price(self):
        """Listing priced in Lek."""
        result = self.spider.parse_thread_title(
            "Elbasan, shitet apartament 3+1 Kati 5, 110 m² 8,500,000 Lek"
        )
        assert result["city"] == "Elbasan"
        assert result["transaction_type"] == "shitet"
        assert result["property_type"] == "apartament"
        assert result["room_config"] == "3+1"
        assert result["floor"] == 5
        assert result["area_sqm"] == 110.0
        assert result["price"] == 8500000.0
        assert result["currency"] == "ALL"

    def test_garsoniere(self):
        """Studio/garsoniere listing."""
        result = self.spider.parse_thread_title(
            "Tiranë, shitet garsoniere Kati 2, 42 m² 45,000 € (Komuna e Parisit)"
        )
        assert result["city"] == "Tiranë"
        assert result["property_type"] == "garsoniere"
        assert result["room_config"] is None
        assert result["area_sqm"] == 42.0
        assert result["price"] == 45000.0
        assert result["neighborhood"] == "Komuna e Parisit"

    def test_no_floor_info(self):
        """Title without floor information."""
        result = self.spider.parse_thread_title(
            "Sarandë, shitet apartament 2+1, 90 m² 120,000 €"
        )
        assert result["city"] == "Sarandë"
        assert result["floor"] is None
        assert result["area_sqm"] == 90.0
        assert result["price"] == 120000.0


# ─── Transaction type detection ─────────────────────────────────────


class TestTransactionTypeFromTitle:
    """Test that transaction type is correctly detected from title keywords."""

    def setup_method(self):
        self.spider = NjoftimeSpider()

    def test_shitet_is_sale(self):
        result = self.spider.parse_thread_title(
            "Tiranë, shitet apartament 2+1, 85 m² 75,000 €"
        )
        assert result["transaction_type"] == "shitet"

    def test_jepet_me_qira_is_rent(self):
        result = self.spider.parse_thread_title(
            "Durrës, jepet me qira apartament 1+1, 50 m² 300 €/muaj"
        )
        assert result["transaction_type"] == "jepet me qira"

    def test_jepet_me_qera_is_rent(self):
        result = self.spider.parse_thread_title(
            "Korçë, jepet me qera apartament 1+1, 45 m² 200 €/muaj"
        )
        assert result["transaction_type"] == "jepet me qera"

    def test_ne_shitje_is_sale(self):
        result = self.spider.parse_thread_title(
            "Fier, në shitje apartament 2+1, 80 m² 55,000 €"
        )
        assert result["transaction_type"] == "në shitje"

    def test_monthly_price_period(self):
        """'/muaj' in price indicates monthly rent."""
        result = self.spider.parse_thread_title(
            "Tiranë, jepet me qira apartament 2+1, 80 m² 500 €/muaj"
        )
        assert result["price_period"] == "monthly"

    def test_total_price_period_default(self):
        """No '/muaj' indicator means total (sale) price."""
        result = self.spider.parse_thread_title(
            "Tiranë, shitet apartament 2+1, 85 m² 75,000 €"
        )
        assert result["price_period"] == "total"
