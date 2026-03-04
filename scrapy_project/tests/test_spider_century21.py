"""Tests for the century21albania.com spider."""

import os
import re

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.century21 import Century21Spider


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _fake_response(filename, url="https://www.century21albania.com/en/test"):
    filepath = os.path.join(FIXTURES_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        body = f.read()
    request = Request(url=url)
    return HtmlResponse(url=url, request=request, body=body, encoding="utf-8")


# ─── List page parsing ────────────────────────────────────────────


class TestParseListPage:
    def setup_method(self):
        self.spider = Century21Spider()
        self.response = _fake_response(
            "century21_list.html",
            url="https://www.century21albania.com/en/properties?transaction_type=sale",
        )
        self.response.meta["transaction_type"] = "sale"
        self.results = list(self.spider.parse(self.response))

    def test_yields_requests_for_listings(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/property/" in r.url
        ]
        assert len(requests) == 3

    def test_listing_urls_are_detail_pages(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/property/" in r.url
        ]
        for req in requests:
            assert re.search(r'/property/\d+/', req.url)

    def test_listing_callbacks(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/property/" in r.url
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
            if isinstance(r, Request) and "/property/" in r.url
        ]
        for req in requests:
            assert req.meta.get("transaction_type") == "sale"


# ─── Detail page parsing ─────────────────────────────────────────


class TestParseDetail:
    def setup_method(self):
        self.spider = Century21Spider()
        self.response = _fake_response(
            "century21_detail.html",
            url="https://www.century21albania.com/en/property/5435177/apartament-1-1-per-shitje-ne-golem-roy134498.html",
        )
        self.response.meta["transaction_type"] = "sale"
        results = list(self.spider.parse_detail(self.response))
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "century21"

    def test_source_id(self):
        assert self.item["source_id"] == "5435177"

    def test_source_url(self):
        assert "5435177" in self.item["source_url"]

    def test_title(self):
        assert "APARTMENT FOR SALE IN GOLEM" in self.item["title"]

    def test_price(self):
        assert self.item["price"] == 75000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "sale"

    def test_price_period(self):
        assert self.item["price_period"] == "total"

    def test_city(self):
        assert self.item["city"] == "Durrës"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "Golem"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"

    def test_area(self):
        assert self.item["area_sqm"] == 64.0

    def test_rooms(self):
        assert self.item["rooms"] == 1

    def test_floor(self):
        assert self.item["floor"] == 4

    def test_bathrooms(self):
        assert self.item["bathrooms"] == 1

    def test_elevator(self):
        assert self.item["has_elevator"] is False

    def test_furnished(self):
        assert self.item["is_furnished"] is True

    def test_parking(self):
        assert self.item["has_parking"] is True

    def test_room_config(self):
        assert self.item["room_config"] == "1+1"

    def test_images(self):
        assert len(self.item["images"]) == 5

    def test_image_count(self):
        assert self.item["image_count"] == 5

    def test_description(self):
        assert "Century 21" in self.item["description"]
        assert "Golem" in self.item["description"]

    def test_poster_name(self):
        assert self.item["poster_name"] == "Marin Isufi"

    def test_poster_type(self):
        assert self.item["poster_type"] == "agency"

    def test_poster_phone(self):
        assert self.item["poster_phone"] == "+355693583609"

    def test_latitude(self):
        assert abs(self.item["latitude"] - 41.242574) < 0.001

    def test_longitude(self):
        assert abs(self.item["longitude"] - 19.521755) < 0.001


# ─── ID extraction ───────────────────────────────────────────────


class TestExtractId:
    def setup_method(self):
        self.spider = Century21Spider()

    def test_standard_url(self):
        assert self.spider._extract_id(
            "https://www.century21albania.com/en/property/5435177/slug.html"
        ) == "5435177"

    def test_long_slug(self):
        assert self.spider._extract_id(
            "https://www.century21albania.com/en/property/5501234/villa-per-shitje-ne-tirana-metro123456.html"
        ) == "5501234"


# ─── Price parsing ────────────────────────────────────────────────


class TestParsePrice:
    def setup_method(self):
        self.spider = Century21Spider()

    def test_eur_price(self):
        price, currency = self.spider._parse_price("75,000 €")
        assert price == 75000.0
        assert currency == "EUR"

    def test_monthly_rent(self):
        price, currency = self.spider._parse_price("800 €/month")
        assert price == 800.0
        assert currency == "EUR"

    def test_large_price(self):
        price, currency = self.spider._parse_price("1,250,000 €")
        assert price == 1250000.0

    def test_empty(self):
        price, currency = self.spider._parse_price("")
        assert price is None


# ─── Location parsing ────────────────────────────────────────────


class TestParseLocation:
    def setup_method(self):
        self.spider = Century21Spider()

    def test_with_country(self):
        city, neigh = self.spider._parse_location("Golem Durrës Albania")
        assert city == "Durrës"
        assert neigh == "Golem"

    def test_city_only(self):
        city, neigh = self.spider._parse_location("Tirana Albania")
        assert city == "Tirana"
        assert neigh is None

    def test_plain(self):
        city, neigh = self.spider._parse_location("Tirana")
        assert city == "Tirana"
        assert neigh is None

    def test_empty(self):
        city, neigh = self.spider._parse_location("")
        assert city is None
        assert neigh is None


# ─── Start requests ──────────────────────────────────────────────


class TestStartRequests:
    def test_generates_sale_and_rent(self):
        spider = Century21Spider()
        requests = list(spider.start_requests())
        assert len(requests) == 2

    def test_includes_transaction_types(self):
        spider = Century21Spider()
        requests = list(spider.start_requests())
        urls = [r.url for r in requests]
        assert any("sale" in u for u in urls)
        assert any("rent" in u for u in urls)
