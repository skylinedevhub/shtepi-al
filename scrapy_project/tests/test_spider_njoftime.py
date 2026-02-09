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
            url="https://njoftime.com/forums/shtepi-ne-shitje.4/",
        )
        self.results = list(self.spider.parse(self.response))

    def test_yields_requests_for_threads(self):
        """Should yield Request objects for each thread link."""
        requests = [r for r in self.results if isinstance(r, Request)]
        # 3 thread requests from the fixture
        thread_requests = [
            r for r in requests
            if "/threads/" in r.url and "page-" not in r.url
        ]
        assert len(thread_requests) == 3

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


# ─── Thread detail page (with custom fields) ─────────────────────


class TestParseThread:
    """Test parsing of a XenForo thread detail page with custom fields."""

    def setup_method(self):
        self.spider = NjoftimeSpider()
        self.response = _fake_response(
            "njoftime_detail.html",
            url="https://njoftime.com/threads/tirane-shitet-apartament-2-1-kati-5-64-m2-85000-eur-don-bosko.20001/",
        )
        results = list(self.spider.parse_thread(self.response))
        # Should yield exactly one item
        self.items = [r for r in results if not isinstance(r, Request)]
        assert len(self.items) == 1
        self.item = self.items[0]

    def test_source(self):
        assert self.item["source"] == "njoftime"

    def test_source_url(self):
        assert "20001" in self.item["source_url"]

    def test_source_id(self):
        assert self.item["source_id"] == "20001"

    def test_title_from_message_attribution(self):
        """Title should be extracted from div.message-attribution--title h1."""
        assert "apartament" in self.item["title"].lower()
        assert "Don Bosko" in self.item["title"]

    def test_city_from_custom_fields(self):
        """City should come from field-location custom field."""
        assert self.item["city"] == "Tirane"

    def test_neighborhood_from_custom_fields(self):
        """Neighborhood should come from field_9_zona custom field."""
        assert "Don Bosko" in self.item["neighborhood"]

    def test_property_type_from_custom_fields(self):
        """Property type should come from field_1_banimit custom field."""
        assert self.item["property_type"] == "apartament"

    def test_area_from_custom_fields(self):
        """Area should come from field_6_sip custom field."""
        assert self.item["area_sqm"] == 64.0

    def test_room_config_from_custom_fields(self):
        """Room config should come from field_7_dhomat custom field."""
        assert self.item["room_config"] == "2+1"

    def test_floor_from_custom_fields(self):
        """Floor should come from field_8_kati custom field."""
        assert self.item["floor"] == 5

    def test_price_from_custom_fields(self):
        """Price should come from field_4_cmimi custom field."""
        assert self.item["price"] == 85000.0

    def test_currency_from_custom_fields(self):
        """Currency should be detected from field_4_cmimi custom field."""
        assert self.item["currency_original"] == "EUR"

    def test_description_from_first_post(self):
        """Description should come from the first post body bbWrapper."""
        assert "apartament" in self.item["description"].lower()
        assert "Don Bosko" in self.item["description"]
        # Should not include text from reply posts
        assert "diskutueshem" not in self.item["description"].lower()

    def test_images_from_swiper_carousel(self):
        """Should extract image URLs from the Swiper carousel."""
        images = self.item["images"]
        assert len(images) == 3
        assert all("njoftime.com" in url for url in images)
        # All URLs should be full-size (from href, not thumb)
        assert all("?thumb" not in url for url in images)

    def test_image_count(self):
        assert self.item["image_count"] == 3

    def test_poster_name(self):
        assert self.item["poster_name"] == "agjencia_alba"

    def test_raw_custom_fields_stored(self):
        """Raw custom fields should be stored in raw_json."""
        raw = self.item["raw_json"]
        assert "field-location" in raw
        assert "field_4_cmimi" in raw
        assert raw["field-location"] == "Tirane"


# ─── Custom fields extraction ─────────────────────────────────────


class TestExtractCustomFields:
    """Test the _extract_custom_fields method directly."""

    def setup_method(self):
        self.spider = NjoftimeSpider()
        self.response = _fake_response(
            "njoftime_detail.html",
            url="https://njoftime.com/threads/test.20001/",
        )

    def test_extracts_city(self):
        fields = self.spider._extract_custom_fields(self.response)
        assert fields["city"] == "Tirane"

    def test_extracts_neighborhood(self):
        fields = self.spider._extract_custom_fields(self.response)
        assert "Don Bosko" in fields["neighborhood"]

    def test_extracts_property_type(self):
        fields = self.spider._extract_custom_fields(self.response)
        assert fields["property_type"] == "apartament"

    def test_extracts_area(self):
        fields = self.spider._extract_custom_fields(self.response)
        assert fields["area_sqm"] == 64.0

    def test_extracts_room_config(self):
        fields = self.spider._extract_custom_fields(self.response)
        assert fields["room_config"] == "2+1"

    def test_extracts_floor(self):
        fields = self.spider._extract_custom_fields(self.response)
        assert fields["floor"] == 5

    def test_extracts_price(self):
        fields = self.spider._extract_custom_fields(self.response)
        assert fields["price"] == 85000.0

    def test_extracts_currency(self):
        fields = self.spider._extract_custom_fields(self.response)
        assert fields["currency"] == "EUR"

    def test_raw_dict_has_all_fields(self):
        fields = self.spider._extract_custom_fields(self.response)
        raw = fields["raw"]
        assert "field-location" in raw
        assert "field_9_zona" in raw
        assert "field_1_banimit" in raw
        assert "field_6_sip" in raw
        assert "field_7_dhomat" in raw
        assert "field_8_kati" in raw
        assert "field_4_cmimi" in raw

    def test_returns_empty_when_no_custom_fields(self):
        """Should return empty dict when page has no custom fields."""
        response = _fake_response(
            "njoftime_list.html",
            url="https://njoftime.com/threads/test.99999/",
        )
        fields = self.spider._extract_custom_fields(response)
        assert fields["city"] is None
        assert fields["price"] is None
        assert fields["raw"] == {}


# ─── Image extraction ─────────────────────────────────────────────


class TestImageExtraction:
    """Test image extraction from Swiper carousel and bbImage fallback."""

    def setup_method(self):
        self.spider = NjoftimeSpider()

    def test_swiper_images_extracted(self):
        """Images should come from Swiper carousel a.swiper-slide.js-lbImage href."""
        response = _fake_response(
            "njoftime_detail.html",
            url="https://njoftime.com/threads/test.20001/",
        )
        results = list(self.spider.parse_thread(response))
        item = [r for r in results if not isinstance(r, Request)][0]
        images = item["images"]
        assert len(images) == 3
        # Check they are from href (full-size URLs)
        assert "img-20250110-001.jpg" in images[0]
        assert "img-20250110-002.jpg" in images[1]
        assert "img-20250110-003.jpg" in images[2]

    def test_bbimage_fallback(self):
        """When no Swiper carousel, should fall back to bbImage."""
        # Use old-style fixture (njoftime_thread.html) which has bbImage
        response = _fake_response(
            "njoftime_thread.html",
            url="https://njoftime.com/threads/test.10001/",
        )
        results = list(self.spider.parse_thread(response))
        item = [r for r in results if not isinstance(r, Request)][0]
        images = item["images"]
        assert len(images) == 3
        assert all("njoftime.com" in url for url in images)


# ─── Title extraction ─────────────────────────────────────────────


class TestTitleExtraction:
    """Test title extraction from message-attribution with fallback."""

    def setup_method(self):
        self.spider = NjoftimeSpider()

    def test_title_from_message_attribution(self):
        """Should extract title from div.message-attribution--title h1."""
        response = _fake_response(
            "njoftime_detail.html",
            url="https://njoftime.com/threads/test.20001/",
        )
        results = list(self.spider.parse_thread(response))
        item = [r for r in results if not isinstance(r, Request)][0]
        assert "Don Bosko" in item["title"]

    def test_title_fallback_to_p_title_value(self):
        """Should fall back to h1.p-title-value when message-attribution missing."""
        response = _fake_response(
            "njoftime_thread.html",
            url="https://njoftime.com/threads/test.10001/",
        )
        results = list(self.spider.parse_thread(response))
        item = [r for r in results if not isinstance(r, Request)][0]
        # Old fixture uses h1.p-title-value
        assert "shitet" in item["title"].lower()
        assert "2+1" in item["title"]


# ─── Fallback to title regex when custom fields missing ────────────


class TestFallbackToTitleRegex:
    """Test that title regex is used when custom fields are absent."""

    def setup_method(self):
        self.spider = NjoftimeSpider()

    def test_city_from_title_when_no_custom_fields(self):
        """Should extract city from title when custom fields are absent."""
        response = _fake_response(
            "njoftime_thread.html",
            url="https://njoftime.com/threads/tirane-shitet-apartament-2-1-kati-3-85-m2-75000-e-bllok.10001/",
        )
        results = list(self.spider.parse_thread(response))
        item = [r for r in results if not isinstance(r, Request)][0]
        # Old fixture has no custom fields, so data comes from title regex
        assert item["city"] == "Tiranë"
        assert item["property_type"] == "apartament"
        assert item["room_config"] == "2+1"
        assert item["floor"] == 3
        assert item["area_sqm"] == 85.0
        assert item["price"] == 75000.0
        assert item["currency_original"] == "EUR"
        assert item["neighborhood"] == "Bllok"


# ─── Thread ID extraction ─────────────────────────────────────────


class TestExtractThreadId:
    """Test _extract_thread_id with various URL formats."""

    def setup_method(self):
        self.spider = NjoftimeSpider()

    def test_standard_url(self):
        tid = self.spider._extract_thread_id(
            "https://njoftime.com/threads/some-slug.10001/"
        )
        assert tid == "10001"

    def test_url_without_trailing_slash(self):
        tid = self.spider._extract_thread_id(
            "https://njoftime.com/threads/slug.5678"
        )
        assert tid == "5678"

    def test_url_with_page(self):
        """Thread ID extraction should work even with page suffix."""
        tid = self.spider._extract_thread_id(
            "https://njoftime.com/threads/slug.1234/page-2"
        )
        assert tid == "1234"

    def test_real_world_url(self):
        tid = self.spider._extract_thread_id(
            "https://njoftime.com/threads/tirane-shitet-apartament-2-1-kati-5-64-m2.20001/"
        )
        assert tid == "20001"


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

    def test_non_matching_title(self):
        """Non-standard title should return all None values."""
        result = self.spider.parse_thread_title(
            "Some random thread title that doesn't match"
        )
        assert result["city"] is None
        assert result["transaction_type"] is None
        assert result["price"] is None
        assert result["price_period"] == "total"


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


# ─── Start URLs ────────────────────────────────────────────────────


class TestStartUrls:
    """Test that start_urls point to the correct forum categories."""

    def test_start_urls_contain_real_forums(self):
        spider = NjoftimeSpider()
        assert "https://njoftime.com/forums/shtepi-ne-shitje.4/" in spider.start_urls
        assert "https://njoftime.com/forums/shtepi-me-qira.5/" in spider.start_urls

    def test_start_urls_count(self):
        spider = NjoftimeSpider()
        assert len(spider.start_urls) == 2
