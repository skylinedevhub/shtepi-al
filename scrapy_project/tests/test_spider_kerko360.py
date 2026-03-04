"""Tests for the kerko360.al spider."""

import os
import re

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.kerko360 import Kerko360Spider


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _fake_response(filename, url="https://kerko360.al/test"):
    filepath = os.path.join(FIXTURES_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        body = f.read()
    request = Request(url=url)
    return HtmlResponse(url=url, request=request, body=body, encoding="utf-8")


# ─── List page parsing ────────────────────────────────────────────


class TestParseListPage:
    def setup_method(self):
        self.spider = Kerko360Spider()
        self.response = _fake_response(
            "kerko360_list.html",
            url="https://kerko360.al/listings?category=1&action=sale",
        )
        self.response.meta["transaction_type"] = "sale"
        self.results = list(self.spider.parse(self.response))

    def test_yields_requests_for_listings(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/listing/" in r.url
        ]
        assert len(requests) == 3

    def test_listing_callbacks(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/listing/" in r.url
        ]
        for req in requests:
            assert req.callback == self.spider.parse_detail

    def test_yields_pagination_request(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "page=2" in r.url
        ]
        assert len(requests) == 1

    def test_transaction_type_in_meta(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/listing/" in r.url
        ]
        for req in requests:
            assert req.meta.get("transaction_type") == "sale"


# ─── Detail page parsing ─────────────────────────────────────────


class TestParseDetail:
    def setup_method(self):
        self.spider = Kerko360Spider()
        self.response = _fake_response(
            "kerko360_detail.html",
            url="https://kerko360.al/listing/duplex-farke-tirane-ne-shitje-450683",
        )
        self.response.meta["transaction_type"] = "sale"
        results = list(self.spider.parse_detail(self.response))
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "kerko360"

    def test_source_id(self):
        assert self.item["source_id"] == "450683"

    def test_source_url(self):
        assert "450683" in self.item["source_url"]

    def test_title(self):
        assert "Duplex" in self.item["title"]
        assert "Farke" in self.item["title"]

    def test_price(self):
        assert self.item["price"] == 385000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "sale"

    def test_price_period(self):
        assert self.item["price_period"] == "total"

    def test_city(self):
        assert self.item["city"] == "Tiranë"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"

    def test_area(self):
        assert self.item["area_sqm"] == 265.0

    def test_rooms(self):
        assert self.item["rooms"] == 4

    def test_bathrooms(self):
        assert self.item["bathrooms"] == 3

    def test_floor(self):
        assert self.item["floor"] == 5

    def test_parking(self):
        assert self.item["has_parking"] is True

    def test_elevator(self):
        assert self.item["has_elevator"] is True

    def test_images(self):
        assert len(self.item["images"]) == 6

    def test_image_count(self):
        assert self.item["image_count"] == 6

    def test_description(self):
        assert "Farkës" in self.item["description"]
        assert "dupleksi" in self.item["description"]

    def test_poster_name(self):
        assert self.item["poster_name"] == "Gerald Mahilaj"

    def test_latitude(self):
        assert abs(self.item["latitude"] - 41.328) < 0.01

    def test_longitude(self):
        assert abs(self.item["longitude"] - 19.878) < 0.01


# ─── ID extraction ───────────────────────────────────────────────


class TestExtractId:
    def setup_method(self):
        self.spider = Kerko360Spider()

    def test_standard_url(self):
        assert self.spider._extract_id(
            "https://kerko360.al/listing/duplex-farke-tirane-ne-shitje-450683"
        ) == "450683"

    def test_rent_url(self):
        assert self.spider._extract_id(
            "https://kerko360.al/listing/apartament-11-myslym-shyri-tirane-me-qera-567890"
        ) == "567890"


# ─── Price parsing ────────────────────────────────────────────────


class TestParsePrice:
    def setup_method(self):
        self.spider = Kerko360Spider()

    def test_eur_price(self):
        price, currency = self.spider._parse_price("385,000 €")
        assert price == 385000.0
        assert currency == "EUR"

    def test_monthly(self):
        price, currency = self.spider._parse_price("600 €/muaj")
        assert price == 600.0
        assert currency == "EUR"

    def test_empty(self):
        price, currency = self.spider._parse_price("")
        assert price is None


# ─── Start requests ──────────────────────────────────────────────


class TestStartRequests:
    def test_generates_sale_and_rent(self):
        spider = Kerko360Spider()
        requests = list(spider.start_requests())
        assert len(requests) == 2

    def test_includes_transaction_types(self):
        spider = Kerko360Spider()
        requests = list(spider.start_requests())
        urls = [r.url for r in requests]
        assert any("sale" in u for u in urls)
        assert any("rent" in u for u in urls)
