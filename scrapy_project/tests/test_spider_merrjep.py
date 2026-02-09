"""Tests for MerrJep.al spider."""

import os

import pytest
from scrapy.http import HtmlResponse, Request

from shtepi.spiders.merrjep import MerrjepSpider


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def fake_response_from_file(filename, url=None, meta=None):
    """Create a Scrapy HtmlResponse from a local HTML file.

    Args:
        filename: HTML file name in the fixtures directory.
        url: URL to associate with the response (defaults to merrjep.al).
        meta: Optional dict of request meta to attach.

    Returns:
        HtmlResponse with the file's content.
    """
    filepath = os.path.join(FIXTURES_DIR, filename)
    if url is None:
        url = "https://www.merrjep.al/njoftime/imobiliare-vendbanime/apartamente/tirane"

    with open(filepath, "r", encoding="utf-8") as f:
        body = f.read()

    request = Request(url=url, meta=meta or {})
    return HtmlResponse(
        url=url,
        request=request,
        body=body,
        encoding="utf-8",
    )


class TestParseListingPage:
    """Test that the spider correctly parses a category/listing page."""

    def setup_method(self):
        self.spider = MerrjepSpider()
        self.response = fake_response_from_file(
            "merrjep_list.html",
            url="https://www.merrjep.al/njoftime/imobiliare-vendbanime/apartamente/ne-shitje/tirane",
        )

    def test_yields_requests_for_detail_pages(self):
        """Spider should yield Request objects for each listing detail page."""
        results = list(self.spider.parse(self.response))

        # Separate requests from items
        requests = [r for r in results if isinstance(r, Request)]

        # We should have requests for each listing card (4 cards) plus next page
        detail_requests = [
            r for r in requests
            if "/njoftim/" in r.url
        ]
        assert len(detail_requests) == 4

    def test_detail_urls_are_absolute(self):
        """All yielded detail page URLs should be absolute."""
        results = list(self.spider.parse(self.response))
        requests = [r for r in results if isinstance(r, Request)]
        detail_requests = [r for r in requests if "/njoftim/" in r.url]

        for req in detail_requests:
            assert req.url.startswith("https://"), f"URL not absolute: {req.url}"

    def test_yields_next_page_request(self):
        """Spider should follow pagination to the next page."""
        results = list(self.spider.parse(self.response))
        requests = [r for r in results if isinstance(r, Request)]

        next_page_requests = [
            r for r in requests
            if "Page=2" in r.url
        ]
        assert len(next_page_requests) >= 1, "Should follow next page link"

    def test_detail_requests_use_parse_detail_callback(self):
        """Detail page requests should use parse_detail as callback."""
        results = list(self.spider.parse(self.response))
        requests = [r for r in results if isinstance(r, Request)]
        detail_requests = [r for r in requests if "/njoftim/" in r.url]

        for req in detail_requests:
            assert req.callback == self.spider.parse_detail


class TestParseDetail:
    """Test that the spider correctly extracts fields from a detail page."""

    def setup_method(self):
        self.spider = MerrjepSpider()
        self.response = fake_response_from_file(
            "merrjep_listing.html",
            url="https://www.merrjep.al/njoftim/shitet-apartament-2-1-85m2-ne-bllok-tirane/10001001",
        )
        results = list(self.spider.parse_detail(self.response))
        # Should yield exactly one item
        assert len(results) == 1, f"Expected 1 item, got {len(results)}"
        self.item = results[0]

    def test_source(self):
        assert self.item["source"] == "merrjep"

    def test_source_url(self):
        assert self.item["source_url"] == (
            "https://www.merrjep.al/njoftim/"
            "shitet-apartament-2-1-85m2-ne-bllok-tirane/10001001"
        )

    def test_source_id(self):
        assert self.item["source_id"] == "10001001"

    def test_title(self):
        assert self.item["title"] == "Shitet Apartament 2+1, 85 m2, ne Bllok, Tirane"

    def test_price(self):
        assert self.item["price"] == 85000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_room_config(self):
        assert self.item["room_config"] == "2+1"

    def test_area_sqm(self):
        assert self.item["area_sqm"] == 85.0

    def test_floor(self):
        assert self.item["floor"] == 3

    def test_total_floors(self):
        assert self.item["total_floors"] == 8

    def test_city(self):
        assert self.item["city"] == "Tirane"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "Bllok"

    def test_images(self):
        images = self.item["images"]
        assert isinstance(images, list)
        assert len(images) == 3
        assert "media.merrjep.al" in images[0]

    def test_description_present(self):
        desc = self.item["description"]
        assert desc is not None
        assert len(desc) > 20
        assert "SHITET APARTAMENT" in desc

    def test_transaction_type_from_url(self):
        """Transaction type should be inferred from the URL path containing 'ne-shitje'."""
        assert self.item["transaction_type"] == "sale"

    def test_poster_name(self):
        assert self.item["poster_name"] == "ARKA HOME"

    def test_poster_phone(self):
        assert self.item["poster_phone"] == "+355694001234"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"


class TestParseDetailRentListing:
    """Test transaction_type detection for rent listings."""

    def setup_method(self):
        self.spider = MerrjepSpider()
        self.response = fake_response_from_file(
            "merrjep_listing.html",
            url="https://www.merrjep.al/njoftim/qera-apartament-1-1-laprake/10001002",
        )

    def test_transaction_type_rent_from_url(self):
        """Transaction type should be 'rent' when URL contains 'qera' or 'qira'."""
        results = list(self.spider.parse_detail(self.response))
        item = results[0]
        assert item["transaction_type"] == "rent"


class TestHandlesMissingPrice:
    """Test spider handles listings with missing or zero price."""

    def setup_method(self):
        self.spider = MerrjepSpider()

    def test_missing_price_yields_item(self):
        """Spider should still yield an item even if price is missing/zero."""
        # Create a response with price value="0"
        html = """
        <html>
        <body>
            <h1 class="listing-title">Apartament ne Shitje, Durres</h1>
            <div class="listing-price">
                <span class="format-money" value="0">Me marreveshje</span>
                <span class="currency">EUR</span>
            </div>
            <div class="listing-properties">
                <div class="property-row">
                    <a href="#">
                        <span class="property-label">Komuna:</span>
                        <span class="property-value">Durres</span>
                    </a>
                </div>
            </div>
            <div class="listing-description">
                <div class="description-text">Apartament per shitje ne Durres.</div>
            </div>
            <div id="carouselExampleIndicators" class="carousel slide">
                <div class="carousel-inner"></div>
            </div>
            <div class="seller-info">
                <div class="seller-contact">
                    <a href="tel:+355691234567" class="phone-number">+355691234567</a>
                </div>
            </div>
        </body>
        </html>
        """
        url = "https://www.merrjep.al/njoftim/apartament-ne-shitje-durres/10001004"
        request = Request(url=url)
        response = HtmlResponse(url=url, request=request, body=html, encoding="utf-8")

        results = list(self.spider.parse_detail(response))
        assert len(results) == 1
        item = results[0]

        # Price should be None when value is 0 or missing
        assert item["price"] is None
        # Other fields should still be populated
        assert item["title"] == "Apartament ne Shitje, Durres"
        assert item["source_id"] == "10001004"
        assert item["city"] == "Durres"

    def test_no_price_element_yields_item(self):
        """Spider should handle pages where the price element is entirely absent."""
        html = """
        <html>
        <body>
            <h1 class="listing-title">Vila ne Vlore</h1>
            <div class="listing-properties">
                <div class="property-row">
                    <a href="#">
                        <span class="property-label">Komuna:</span>
                        <span class="property-value">Vlore</span>
                    </a>
                </div>
            </div>
            <div class="listing-description">
                <div class="description-text">Vila e bukur ne bregdet.</div>
            </div>
            <div id="carouselExampleIndicators" class="carousel slide">
                <div class="carousel-inner"></div>
            </div>
            <div class="seller-info">
                <div class="seller-contact"></div>
            </div>
        </body>
        </html>
        """
        url = "https://www.merrjep.al/njoftim/vila-ne-vlore/10001005"
        request = Request(url=url)
        response = HtmlResponse(url=url, request=request, body=html, encoding="utf-8")

        results = list(self.spider.parse_detail(response))
        assert len(results) == 1
        item = results[0]
        assert item["price"] is None
        assert item["currency_original"] is None
        assert item["title"] == "Vila ne Vlore"

    def test_missing_images_yields_empty_list(self):
        """Spider should yield an empty image list if no images found."""
        html = """
        <html>
        <body>
            <h1 class="listing-title">Garsoniere ne Tirane</h1>
            <div class="listing-price">
                <span class="format-money" value="35000">35.000</span>
                <span class="currency">EUR</span>
            </div>
            <div class="listing-properties"></div>
            <div class="listing-description">
                <div class="description-text">Garsoniere e vogel.</div>
            </div>
            <div id="carouselExampleIndicators" class="carousel slide">
                <div class="carousel-inner"></div>
            </div>
            <div class="seller-info">
                <div class="seller-contact"></div>
            </div>
        </body>
        </html>
        """
        url = "https://www.merrjep.al/njoftim/garsoniere-ne-tirane/10001006"
        request = Request(url=url)
        response = HtmlResponse(url=url, request=request, body=html, encoding="utf-8")

        results = list(self.spider.parse_detail(response))
        assert len(results) == 1
        item = results[0]
        assert item["images"] == []
        assert item["price"] == 35000.0
