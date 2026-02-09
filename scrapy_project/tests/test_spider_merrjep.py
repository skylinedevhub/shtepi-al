"""Tests for MerrJep.al spider (Albania version)."""

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
        url = "https://www.merrjep.al/njoftime/imobiliare-vendbanime/apartamente"

    with open(filepath, "r", encoding="utf-8") as f:
        body = f.read()

    request = Request(url=url, meta=meta or {})
    return HtmlResponse(
        url=url,
        request=request,
        body=body,
        encoding="utf-8",
    )


# ─── Listing page ──────────────────────────────────────────────────


class TestParseListingPage:
    """Test that the spider correctly parses a category/listing page."""

    def setup_method(self):
        self.spider = MerrjepSpider()
        self.response = fake_response_from_file(
            "merrjep_list.html",
            url="https://www.merrjep.al/njoftime/imobiliare-vendbanime/apartamente/ne-shitje",
            meta={"property_type": "apartment", "transaction_type": "sale"},
        )

    def test_yields_three_detail_requests(self):
        """Spider should yield a Request for each of the 3 listing cards."""
        results = list(self.spider.parse(self.response))
        requests = [r for r in results if isinstance(r, Request)]

        detail_requests = [
            r for r in requests
            if "/njoftim/" in r.url
        ]
        assert len(detail_requests) == 3

    def test_detail_urls_are_absolute(self):
        """All yielded detail page URLs should be absolute."""
        results = list(self.spider.parse(self.response))
        requests = [r for r in results if isinstance(r, Request)]
        detail_requests = [r for r in requests if "/njoftim/" in r.url]

        for req in detail_requests:
            assert req.url.startswith("https://"), f"URL not absolute: {req.url}"

    def test_yields_next_page_request(self):
        """Spider should follow the 'Tjetra' pagination link."""
        results = list(self.spider.parse(self.response))
        requests = [r for r in results if isinstance(r, Request)]

        next_page_requests = [
            r for r in requests
            if "Page=2" in r.url
        ]
        assert len(next_page_requests) >= 1, "Should follow Tjetra next page link"

    def test_total_requests_is_four(self):
        """Should yield 3 detail requests + 1 pagination request = 4 total."""
        results = list(self.spider.parse(self.response))
        requests = [r for r in results if isinstance(r, Request)]
        assert len(requests) == 4

    def test_detail_requests_use_parse_detail_callback(self):
        """Detail page requests should use parse_detail as callback."""
        results = list(self.spider.parse(self.response))
        requests = [r for r in results if isinstance(r, Request)]
        detail_requests = [r for r in requests if "/njoftim/" in r.url]

        for req in detail_requests:
            assert req.callback == self.spider.parse_detail

    def test_meta_propagated_to_detail_requests(self):
        """Property type meta should be passed to detail requests."""
        results = list(self.spider.parse(self.response))
        requests = [r for r in results if isinstance(r, Request)]
        detail_requests = [r for r in requests if "/njoftim/" in r.url]

        for req in detail_requests:
            assert req.meta.get("property_type") == "apartment"
            assert req.meta.get("transaction_type") == "sale"


# ─── Detail page ────────────────────────────────────────────────────


class TestParseDetail:
    """Test that the spider correctly extracts fields from a detail page."""

    def setup_method(self):
        self.spider = MerrjepSpider()
        self.response = fake_response_from_file(
            "merrjep_listing.html",
            url="https://www.merrjep.al/njoftim/shitet-apartament-2plus1-fresk-tirane/19211398",
            meta={"property_type": "apartment", "transaction_type": "sale"},
        )
        results = list(self.spider.parse_detail(self.response))
        assert len(results) == 1, f"Expected 1 item, got {len(results)}"
        self.item = results[0]

    def test_source(self):
        assert self.item["source"] == "merrjep"

    def test_source_url(self):
        assert self.item["source_url"] == (
            "https://www.merrjep.al/njoftim/"
            "shitet-apartament-2plus1-fresk-tirane/19211398"
        )

    def test_source_id(self):
        assert self.item["source_id"] == "19211398"

    def test_title(self):
        assert self.item["title"] == (
            "Shitet , Apartament 2+1+2 , Fresk, Tirane."
        )

    def test_price(self):
        assert self.item["price"] == 155000.0

    def test_currency(self):
        assert self.item["currency_original"] == "EUR"

    def test_rooms(self):
        assert self.item["rooms"] == 2

    def test_area_sqm(self):
        assert self.item["area_sqm"] == 107.0

    def test_city(self):
        assert self.item["city"] == "Tirane"

    def test_neighborhood(self):
        assert self.item["neighborhood"] == "FRESKU"

    def test_images(self):
        images = self.item["images"]
        assert isinstance(images, list)
        assert len(images) == 2
        assert "media.merrjep.al" in images[0]
        assert "photo1-full" in images[0]
        assert "photo2-full" in images[1]

    def test_description_present(self):
        desc = self.item["description"]
        assert desc is not None
        assert len(desc) > 20
        assert "Disponojme" in desc

    def test_transaction_type(self):
        """Transaction type should be 'sale' from the Lloji i njoftimit tag."""
        assert self.item["transaction_type"] == "sale"

    def test_property_type(self):
        assert self.item["property_type"] == "apartment"

    def test_poster_name(self):
        assert self.item["poster_name"] == "Future Home City"

    def test_poster_phone(self):
        assert self.item["poster_phone"] == "+355684950094"

    def test_poster_type_agency(self):
        """Poster type should be 'agency' when Njoftim nga is Kompani."""
        assert self.item["poster_type"] == "agency"

    def test_room_config_from_title(self):
        """Room config should be extracted from the title."""
        assert self.item["room_config"] == "2+1+2"


# ─── ID extraction ──────────────────────────────────────────────────


class TestExtractId:
    """Test _extract_id with various URL formats."""

    def test_standard_url(self):
        url = "https://www.merrjep.al/njoftim/apartament-ne-shitje/19211398"
        assert MerrjepSpider._extract_id(url) == "19211398"

    def test_url_with_trailing_slash(self):
        url = "https://www.merrjep.al/njoftim/apartament-ne-shitje/19211398/"
        assert MerrjepSpider._extract_id(url) == "19211398"

    def test_url_with_long_slug(self):
        url = "https://www.merrjep.al/njoftim/shitet-apartament-2plus1-fresk-tirane/99887766"
        assert MerrjepSpider._extract_id(url) == "99887766"


# ─── Transaction type detection ─────────────────────────────────────


class TestDetectTransactionType:
    """Test _detect_transaction_type with tag values from the real site."""

    def test_shitet_is_sale(self):
        assert MerrjepSpider._detect_transaction_type("Shitet") == "sale"

    def test_jepet_me_qira_is_rent(self):
        assert MerrjepSpider._detect_transaction_type("Jepet me qira") == "rent"

    def test_jepet_me_qera_is_rent(self):
        assert MerrjepSpider._detect_transaction_type("Jepet me qera") == "rent"

    def test_qira_is_rent(self):
        assert MerrjepSpider._detect_transaction_type("Qira") == "rent"

    def test_none_defaults_to_sale(self):
        assert MerrjepSpider._detect_transaction_type(None) == "sale"

    def test_empty_defaults_to_sale(self):
        assert MerrjepSpider._detect_transaction_type("") == "sale"

    def test_unknown_defaults_to_sale(self):
        """Unknown value should default to sale."""
        assert MerrjepSpider._detect_transaction_type("Kembim") == "sale"


# ─── Missing data handling ──────────────────────────────────────────


class TestHandlesMissingPrice:
    """Test spider handles listings with missing or zero price."""

    def setup_method(self):
        self.spider = MerrjepSpider()

    def test_missing_price_yields_item(self):
        """Spider should still yield an item even if price is missing/zero."""
        html = """
        <html>
        <body>
            <h1 class="ci-text-base">Apartament ne Tirane</h1>
            <bdi class="new-price">
                <span class="format-money-int" value="0">Me marreveshje</span>
                <span>EUR</span>
            </bdi>
            <div class="tags-area">
                <a class="tag-item">
                    <span>Komuna:</span>
                    <bdi>Tirane</bdi>
                </a>
            </div>
            <div class="description-area">
                <span>Apartament per shitje ne Tirane.</span>
            </div>
        </body>
        </html>
        """
        url = "https://www.merrjep.al/njoftim/apartament-ne-tirane/55555555"
        request = Request(url=url)
        response = HtmlResponse(url=url, request=request, body=html, encoding="utf-8")

        results = list(self.spider.parse_detail(response))
        assert len(results) == 1
        item = results[0]

        assert item["price"] is None
        assert item["title"] == "Apartament ne Tirane"
        assert item["source_id"] == "55555555"
        assert item["city"] == "Tirane"

    def test_no_price_element_yields_item(self):
        """Spider should handle pages where the price element is entirely absent."""
        html = """
        <html>
        <body>
            <h1 class="ci-text-base">Toke ne Elbasan</h1>
            <div class="tags-area">
                <a class="tag-item">
                    <span>Komuna:</span>
                    <bdi>Elbasan</bdi>
                </a>
            </div>
            <div class="description-area">
                <span>Toke per shitje.</span>
            </div>
        </body>
        </html>
        """
        url = "https://www.merrjep.al/njoftim/toke-ne-elbasan/66666666"
        request = Request(url=url)
        response = HtmlResponse(url=url, request=request, body=html, encoding="utf-8")

        results = list(self.spider.parse_detail(response))
        assert len(results) == 1
        item = results[0]
        assert item["price"] is None
        assert item["currency_original"] is None
        assert item["title"] == "Toke ne Elbasan"

    def test_missing_images_yields_empty_list(self):
        """Spider should yield an empty image list if no images found."""
        html = """
        <html>
        <body>
            <h1 class="ci-text-base">Apartament ne Vlore</h1>
            <bdi class="new-price">
                <span class="format-money-int" value="35000">35 000</span>
                <span>EUR</span>
            </bdi>
            <div class="tags-area"></div>
            <div class="description-area">
                <span>Apartament i vogel.</span>
            </div>
        </body>
        </html>
        """
        url = "https://www.merrjep.al/njoftim/apartament-ne-vlore/77777777"
        request = Request(url=url)
        response = HtmlResponse(url=url, request=request, body=html, encoding="utf-8")

        results = list(self.spider.parse_detail(response))
        assert len(results) == 1
        item = results[0]
        assert item["images"] == []
        assert item["price"] == 35000.0


# ─── Rent listing via tag ────────────────────────────────────────────


class TestParseDetailRentListing:
    """Test transaction_type detection for rent listings via tag value."""

    def setup_method(self):
        self.spider = MerrjepSpider()
        html = """
        <html>
        <body>
            <h1 class="ci-text-base">Apartament 1+1 me qira ne Tirane</h1>
            <bdi class="new-price">
                <span class="format-money-int" value="300">300</span>
                <span>EUR</span>
                / muaj
            </bdi>
            <div class="tags-area">
                <a class="tag-item">
                    <span>Lloji i njoftimit:</span>
                    <bdi>Jepet me qera</bdi>
                </a>
                <a class="tag-item">
                    <span>Komuna:</span>
                    <bdi>Tirane</bdi>
                </a>
            </div>
            <div class="description-area">
                <span>Apartament jepet me qira.</span>
            </div>
        </body>
        </html>
        """
        url = "https://www.merrjep.al/njoftim/apartament-me-qira-tirane/88888888"
        request = Request(url=url)
        self.response = HtmlResponse(
            url=url, request=request, body=html, encoding="utf-8"
        )

    def test_transaction_type_rent_from_tag(self):
        """Transaction type should be 'rent' when tag says 'Jepet me qera'."""
        results = list(self.spider.parse_detail(self.response))
        item = results[0]
        assert item["transaction_type"] == "rent"

    def test_price_period_monthly(self):
        """Price period should be 'monthly' when '/ muaj' is present."""
        results = list(self.spider.parse_detail(self.response))
        item = results[0]
        assert item["price_period"] == "monthly"


# ─── Private seller (no badge) ──────────────────────────────────────


class TestPrivateSeller:
    """Test that poster_type is 'private' when no agency indicators."""

    def setup_method(self):
        self.spider = MerrjepSpider()
        html = """
        <html>
        <body>
            <h1 class="ci-text-base">Shtepi ne Shkoder</h1>
            <bdi class="new-price">
                <span class="format-money-int" value="150000">150 000</span>
                <span>EUR</span>
            </bdi>
            <div class="tags-area">
                <a class="tag-item">
                    <span>Njoftim nga:</span>
                    <bdi>Person fizik</bdi>
                </a>
            </div>
            <div class="description-area">
                <span>Shtepi per shitje.</span>
            </div>
            <div class="seller-info-area">
                <h4>
                    <span class="ci-valign-middle">Dritan H.</span>
                </h4>
            </div>
            <div class="contact-area">
                <a href="tel:+355694567890">
                    <bdi>+355694567890</bdi>
                </a>
            </div>
        </body>
        </html>
        """
        url = "https://www.merrjep.al/njoftim/shtepi-ne-shkoder/44444444"
        request = Request(url=url)
        self.response = HtmlResponse(
            url=url, request=request, body=html, encoding="utf-8"
        )

    def test_poster_type_private(self):
        results = list(self.spider.parse_detail(self.response))
        item = results[0]
        assert item["poster_type"] == "private"

    def test_private_poster_name(self):
        results = list(self.spider.parse_detail(self.response))
        item = results[0]
        assert item["poster_name"] == "Dritan H."

    def test_private_poster_phone(self):
        results = list(self.spider.parse_detail(self.response))
        item = results[0]
        assert item["poster_phone"] == "+355694567890"
