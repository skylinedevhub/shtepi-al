"""Tests for the propertyhub.al spider."""

import os
import re

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.propertyhub import PropertyhubSpider


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _fake_response(filename, url="https://propertyhub.al/test"):
    filepath = os.path.join(FIXTURES_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        body = f.read()
    request = Request(url=url)
    return HtmlResponse(url=url, request=request, body=body, encoding="utf-8")


# ─── List page parsing ────────────────────────────────────────────


class TestParseListPage:
    def setup_method(self):
        self.spider = PropertyhubSpider()
        self.response = _fake_response(
            "propertyhub_list.html",
            url="https://propertyhub.al/properties/?type=sale",
        )
        self.response.meta["transaction_type"] = "sale"
        self.results = list(self.spider.parse(self.response))

    def test_yields_requests_for_listings(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/properties/" in r.url and "page/" not in r.url and "type=" not in r.url
        ]
        assert len(requests) == 3

    def test_listing_callbacks(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/properties/" in r.url and "page/" not in r.url and "type=" not in r.url
        ]
        for req in requests:
            assert req.callback == self.spider.parse_detail

    def test_yields_pagination_request(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "page/2" in r.url
        ]
        assert len(requests) == 1

    def test_transaction_type_in_meta(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/properties/" in r.url and "page/" not in r.url and "type=" not in r.url
        ]
        for req in requests:
            assert req.meta.get("transaction_type") == "sale"


# ─── Detail page parsing ─────────────────────────────────────────


class TestParseDetail:
    def setup_method(self):
        self.spider = PropertyhubSpider()
        self.response = _fake_response(
            "propertyhub_detail.html",
            url="https://propertyhub.al/properties/apartament-dupleks-ne-shitje-kodra-e-diellit-tirane/",
        )
        self.response.meta["transaction_type"] = "sale"
        results = list(self.spider.parse_detail(self.response))
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "propertyhub"

    def test_source_id(self):
        assert self.item["source_id"] == "apartament-dupleks-ne-shitje-kodra-e-diellit-tirane"

    def test_source_url(self):
        assert "propertyhub.al" in self.item["source_url"]

    def test_title(self):
        assert "APARTAMENT DUPLEKS" in self.item["title"]
        assert "KODRA E DIELLIT" in self.item["title"]

    def test_price(self):
        assert self.item["price"] == 260000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "sale"

    def test_price_period(self):
        assert self.item["price_period"] == "total"

    def test_city(self):
        assert self.item["city"] == "Tirana"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "Kodra e Diellit"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"

    def test_area(self):
        assert self.item["area_sqm"] == 113.0

    def test_rooms(self):
        assert self.item["rooms"] == 2

    def test_bathrooms(self):
        assert self.item["bathrooms"] == 2

    def test_furnished(self):
        assert self.item["is_furnished"] is True

    def test_images(self):
        assert len(self.item["images"]) == 3

    def test_image_count(self):
        assert self.item["image_count"] == 3

    def test_description(self):
        assert "Kodra e Diellit" in self.item["description"]
        assert "dupleks" in self.item["description"]

    def test_poster_name(self):
        assert self.item["poster_name"] == "Erlind"

    def test_poster_phone(self):
        assert self.item["poster_phone"] == "355674050125"


# ─── ID extraction ───────────────────────────────────────────────


class TestExtractId:
    def setup_method(self):
        self.spider = PropertyhubSpider()

    def test_standard_url(self):
        assert self.spider._extract_id(
            "https://propertyhub.al/properties/apartament-dupleks-ne-shitje-kodra-e-diellit-tirane/"
        ) == "apartament-dupleks-ne-shitje-kodra-e-diellit-tirane"

    def test_no_trailing_slash(self):
        assert self.spider._extract_id(
            "https://propertyhub.al/properties/garsoniere-ne-shitje-palasa-residence-vlore"
        ) == "garsoniere-ne-shitje-palasa-residence-vlore"


# ─── Price parsing ────────────────────────────────────────────────


class TestParsePrice:
    def setup_method(self):
        self.spider = PropertyhubSpider()

    def test_eur_price(self):
        price, currency = self.spider._parse_price("€ 260,000")
        assert price == 260000.0
        assert currency == "EUR"

    def test_monthly_rent(self):
        price, currency = self.spider._parse_price("€ 550/muaj")
        assert price == 550.0
        assert currency == "EUR"

    def test_empty(self):
        price, currency = self.spider._parse_price("")
        assert price is None


# ─── Start requests ──────────────────────────────────────────────


class TestStartRequests:
    def test_generates_sale_and_rent(self):
        spider = PropertyhubSpider()
        requests = list(spider.start_requests())
        assert len(requests) == 2

    def test_includes_transaction_types(self):
        spider = PropertyhubSpider()
        requests = list(spider.start_requests())
        urls = [r.url for r in requests]
        assert any("sale" in u for u in urls)
        assert any("rent" in u for u in urls)


# ─── New theme (v2) list page parsing ───────────────────────────────


class TestParseListPageV2:
    """Test list page parsing with new WPEstate theme (pack-listing-title)."""

    def setup_method(self):
        self.spider = PropertyhubSpider()
        self.response = _fake_response(
            "propertyhub_list_v2.html",
            url="https://propertyhub.al/properties/?type=sale",
        )
        self.response.meta["transaction_type"] = "sale"
        self.results = list(self.spider.parse(self.response))

    def test_yields_requests_for_listings(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/properties/" in r.url
            and "page/" not in r.url and "type=" not in r.url
        ]
        assert len(requests) == 3

    def test_listing_callbacks(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/properties/" in r.url
            and "page/" not in r.url and "type=" not in r.url
        ]
        for req in requests:
            assert req.callback == self.spider.parse_detail

    def test_yields_pagination_request(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "page/2" in r.url
        ]
        assert len(requests) == 1

    def test_transaction_type_in_meta(self):
        requests = [
            r for r in self.results
            if isinstance(r, Request) and "/properties/" in r.url
            and "page/" not in r.url and "type=" not in r.url
        ]
        for req in requests:
            assert req.meta.get("transaction_type") == "sale"


# ─── New theme (v2) detail page parsing ─────────────────────────────


class TestParseDetailV2:
    """Test detail page parsing with new WPEstate theme selectors."""

    def setup_method(self):
        self.spider = PropertyhubSpider()
        self.response = _fake_response(
            "propertyhub_detail_v2.html",
            url="https://propertyhub.al/properties/apartament-ne-shitje-212-currilat-durres/",
        )
        self.response.meta["transaction_type"] = "sale"
        results = list(self.spider.parse_detail(self.response))
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "propertyhub"

    def test_source_id(self):
        assert self.item["source_id"] == "apartament-ne-shitje-212-currilat-durres"

    def test_title(self):
        assert "APARTAMENT" in self.item["title"]
        assert "CURRILAT" in self.item["title"]

    def test_price(self):
        assert self.item["price"] == 215000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_transaction_type(self):
        assert self.item["transaction_type"] == "sale"

    def test_city(self):
        assert self.item["city"] == "Durrës"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "Currila"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"

    def test_area(self):
        assert self.item["area_sqm"] == 105.0

    def test_rooms(self):
        assert self.item["rooms"] == 2

    def test_bathrooms(self):
        assert self.item["bathrooms"] == 2

    def test_room_config(self):
        assert self.item["room_config"] == "2+1+2"

    def test_furnished(self):
        assert self.item["is_furnished"] is True

    def test_elevator(self):
        assert self.item["has_elevator"] is True

    def test_images(self):
        assert len(self.item["images"]) == 4

    def test_image_count(self):
        assert self.item["image_count"] == 4

    def test_description(self):
        assert "Currilat" in self.item["description"]
        assert "105 m2" in self.item["description"]

    def test_poster_name(self):
        assert self.item["poster_name"] == "Arian Kondakciu"

    def test_poster_phone(self):
        assert self.item["poster_phone"] == "0034671490600"
