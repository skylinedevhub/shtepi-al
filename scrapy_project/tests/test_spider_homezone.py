"""Tests for the homezone.al spider."""

import os
import re

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.homezone import HomezoneSpider


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _fake_response(filename, url="https://homezone.al/test"):
    filepath = os.path.join(FIXTURES_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        body = f.read()
    request = Request(url=url)
    return HtmlResponse(url=url, request=request, body=body, encoding="utf-8")


# ─── List page parsing ────────────────────────────────────────────


class TestParseListPage:
    def setup_method(self):
        self.spider = HomezoneSpider()
        self.response = _fake_response(
            "homezone_list.html",
            url="https://homezone.al/properties/sale",
        )
        self.response.meta["transaction_type"] = "sale"
        self.results = list(self.spider.parse(self.response))

    def test_yields_requests_for_listings(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/property/" in r.url and "page=" not in r.url
        ]
        assert len(requests) == 3

    def test_listing_callbacks(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/property/" in r.url and "page=" not in r.url
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
            if isinstance(r, Request) and "/property/" in r.url and "page=" not in r.url
        ]
        for req in requests:
            assert req.meta.get("transaction_type") == "sale"


# ─── Detail page parsing ─────────────────────────────────────────


class TestParseDetail:
    def setup_method(self):
        self.spider = HomezoneSpider()
        self.response = _fake_response(
            "homezone_detail.html",
            url="https://homezone.al/property/sale/tirane/kodra-e-diellit-168614",
        )
        self.response.meta["transaction_type"] = "sale"
        results = list(self.spider.parse_detail(self.response))
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "homezone"

    def test_source_id(self):
        assert self.item["source_id"] == "168614"

    def test_source_url(self):
        assert "168614" in self.item["source_url"]

    def test_title(self):
        assert "DUPLEX" in self.item["title"]
        assert "KODRA E DIELLIT" in self.item["title"]

    def test_price(self):
        assert self.item["price"] == 350000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "sale"

    def test_price_period(self):
        assert self.item["price_period"] == "total"

    def test_city(self):
        assert self.item["city"] == "Tiranë"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "Kodra e Diellit"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"

    def test_area(self):
        assert self.item["area_sqm"] == 274.0

    def test_rooms(self):
        assert self.item["rooms"] == 3

    def test_bathrooms(self):
        assert self.item["bathrooms"] == 2

    def test_room_config(self):
        assert self.item["room_config"] == "3+1+2"

    def test_images(self):
        assert len(self.item["images"]) == 4

    def test_image_count(self):
        assert self.item["image_count"] == 4

    def test_description(self):
        assert "duplex" in self.item["description"]
        assert "Kodra e Diellit" in self.item["description"]

    def test_poster_name(self):
        assert self.item["poster_name"] == "Klejdi Alla"

    def test_poster_phone(self):
        assert self.item["poster_phone"] == "355686444887"


# ─── ID extraction ───────────────────────────────────────────────


class TestExtractId:
    def setup_method(self):
        self.spider = HomezoneSpider()

    def test_standard_url(self):
        assert self.spider._extract_id(
            "https://homezone.al/property/sale/tirane/kodra-e-diellit-168614"
        ) == "168614"

    def test_rent_url(self):
        assert self.spider._extract_id(
            "https://homezone.al/property/rent/durres/shkembi-i-kavajes-165029"
        ) == "165029"


# ─── Price parsing ────────────────────────────────────────────────


class TestParsePrice:
    def setup_method(self):
        self.spider = HomezoneSpider()

    def test_eur_price(self):
        price, currency = self.spider._parse_price("€350,000.00")
        assert price == 350000.0
        assert currency == "EUR"

    def test_small_price(self):
        price, currency = self.spider._parse_price("€600.00")
        assert price == 600.0
        assert currency == "EUR"

    def test_empty(self):
        price, currency = self.spider._parse_price("")
        assert price is None


# ─── Start requests ──────────────────────────────────────────────


class TestStartRequests:
    def test_generates_sale_and_rent(self):
        spider = HomezoneSpider()
        requests = list(spider.start_requests())
        assert len(requests) == 2

    def test_includes_transaction_types(self):
        spider = HomezoneSpider()
        requests = list(spider.start_requests())
        urls = [r.url for r in requests]
        assert any("sale" in u for u in urls)
        assert any("rent" in u for u in urls)
