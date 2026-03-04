"""Tests for the realestate.al spider."""

import os
import re

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.realestate import RealestateSpider


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _fake_response(filename, url="https://www.realestate.al/en/test"):
    filepath = os.path.join(FIXTURES_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        body = f.read()
    request = Request(url=url)
    return HtmlResponse(url=url, request=request, body=body, encoding="utf-8")


# ─── List page parsing ────────────────────────────────────────────


class TestParseListPage:
    def setup_method(self):
        self.spider = RealestateSpider()
        self.response = _fake_response(
            "realestate_list.html",
            url="https://www.realestate.al/en/apartment-for-sale-in-Tirana",
        )
        self.response.meta["transaction_type"] = "sale"
        self.response.meta["property_type_hint"] = "apartment"
        self.results = list(self.spider.parse(self.response))

    def test_yields_requests_for_listings(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and ".95" in r.url or ".9566" in r.url or ".9550" in r.url
        ]
        detail_requests = [
            r for r in self.results
            if isinstance(r, Request) and re.search(r'\.\d+$', r.url)
        ]
        assert len(detail_requests) == 3

    def test_listing_urls_are_detail_pages(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and re.search(r'\.\d+$', r.url)
        ]
        for req in requests:
            assert req.url.startswith("https://www.realestate.al/")

    def test_listing_callbacks(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and re.search(r'\.\d+$', r.url)
        ]
        for req in requests:
            assert req.callback == self.spider.parse_detail

    def test_yields_pagination_request(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/2" in r.url and "apartment-for-sale" in r.url
        ]
        assert len(requests) == 1

    def test_transaction_type_in_meta(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and re.search(r'\.\d+$', r.url)
        ]
        for req in requests:
            assert req.meta.get("transaction_type") == "sale"


# ─── Detail page parsing ─────────────────────────────────────────


class TestParseDetail:
    def setup_method(self):
        self.spider = RealestateSpider()
        self.response = _fake_response(
            "realestate_detail.html",
            url="https://www.realestate.al/en/three-bedroom-apartment-for-sale-at-by-long-hill-residence-in-tirana-albania.9570",
        )
        self.response.meta["transaction_type"] = "sale"
        self.response.meta["property_type_hint"] = "apartment"
        results = list(self.spider.parse_detail(self.response))
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "realestate"

    def test_source_id(self):
        assert self.item["source_id"] == "9570"

    def test_source_url(self):
        assert "9570" in self.item["source_url"]

    def test_title(self):
        assert "Three bedroom apartment for sale" in self.item["title"]
        assert "Long Hill" in self.item["title"]

    def test_price(self):
        assert self.item["price"] == 353000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "sale"

    def test_price_period(self):
        assert self.item["price_period"] == "total"

    def test_city(self):
        assert self.item["city"] == "Tirana"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "By Long Hill Residence"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"

    def test_area(self):
        assert self.item["area_sqm"] == 195.95

    def test_rooms(self):
        assert self.item["rooms"] == 3

    def test_bathrooms(self):
        assert self.item["bathrooms"] == 3

    def test_floor(self):
        assert self.item["floor"] == 2

    def test_parking(self):
        assert self.item["has_parking"] is False

    def test_images(self):
        assert len(self.item["images"]) == 4

    def test_image_count(self):
        assert self.item["image_count"] == 4

    def test_description(self):
        assert "Long Hill Residence" in self.item["description"]
        assert "195.95 m2" in self.item["description"]

    def test_poster_name(self):
        assert self.item["poster_name"] == "RealEstate.al"

    def test_poster_type(self):
        assert self.item["poster_type"] == "agency"

    def test_poster_phone(self):
        assert self.item["poster_phone"] == "+355 6960 88288"


# ─── ID extraction ───────────────────────────────────────────────


class TestExtractId:
    def setup_method(self):
        self.spider = RealestateSpider()

    def test_standard_url(self):
        assert self.spider._extract_id(
            "https://www.realestate.al/en/apartment-for-sale.9570"
        ) == "9570"

    def test_long_slug(self):
        assert self.spider._extract_id(
            "https://www.realestate.al/en/three-bedroom-apartment-for-sale-at-by-long-hill-residence-in-tirana-albania.9570"
        ) == "9570"

    def test_four_digit_id(self):
        assert self.spider._extract_id(
            "https://www.realestate.al/en/villa-for-rent.5728"
        ) == "5728"


# ─── Price parsing ────────────────────────────────────────────────


class TestParsePrice:
    def setup_method(self):
        self.spider = RealestateSpider()

    def test_european_format(self):
        price, currency = self.spider._parse_price("353.000")
        assert price == 353000.0
        assert currency == "EUR"

    def test_small_price(self):
        price, currency = self.spider._parse_price("98.000")
        assert price == 98000.0

    def test_large_price(self):
        price, currency = self.spider._parse_price("1.940.000")
        assert price == 1940000.0

    def test_empty(self):
        price, currency = self.spider._parse_price("")
        assert price is None


# ─── Start requests ──────────────────────────────────────────────


class TestStartRequests:
    def test_generates_requests(self):
        spider = RealestateSpider()
        requests = list(spider.start_requests())
        assert len(requests) == 7

    def test_includes_sale_and_rent(self):
        spider = RealestateSpider()
        requests = list(spider.start_requests())
        sale_reqs = [r for r in requests if r.meta["transaction_type"] == "sale"]
        rent_reqs = [r for r in requests if r.meta["transaction_type"] == "rent"]
        assert len(sale_reqs) >= 3
        assert len(rent_reqs) >= 2
