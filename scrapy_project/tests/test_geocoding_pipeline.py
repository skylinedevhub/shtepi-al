"""Tests for GeocodingPipeline."""

import pytest
from unittest.mock import patch, MagicMock

from shtepi.items import ListingItem
from shtepi.pipelines import GeocodingPipeline


# ─── City fallback ─────────────────────────────────────────────


class TestCityFallback:
    """When no address data and no spider coords, use city center."""

    def setup_method(self):
        self.pipeline = GeocodingPipeline()
        self.spider = MagicMock()

    def test_tirane_fallback(self):
        item = ListingItem(
            source="test", source_id="1", source_url="http://test.al/1",
            title="Test", transaction_type="sale",
            city="Tiranë", images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result["latitude"] == pytest.approx(41.3275, abs=0.001)
        assert result["longitude"] == pytest.approx(19.8187, abs=0.001)

    def test_durres_fallback(self):
        item = ListingItem(
            source="test", source_id="2", source_url="http://test.al/2",
            title="Test", transaction_type="sale",
            city="Durrës", images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result["latitude"] == pytest.approx(41.3246, abs=0.001)
        assert result["longitude"] == pytest.approx(19.4565, abs=0.001)

    def test_unknown_city_no_coords(self):
        item = ListingItem(
            source="test", source_id="3", source_url="http://test.al/3",
            title="Test", transaction_type="sale",
            city="UnknownVillage", images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result.get("latitude") is None
        assert result.get("longitude") is None

    def test_no_city_no_coords(self):
        item = ListingItem(
            source="test", source_id="4", source_url="http://test.al/4",
            title="Test", transaction_type="sale",
            images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result.get("latitude") is None
        assert result.get("longitude") is None


# ─── Spider-provided coords passthrough ────────────────────────


class TestSpiderCoordsPassthrough:
    """When spider already provides lat/lng, skip geocoding."""

    def setup_method(self):
        self.pipeline = GeocodingPipeline()
        self.spider = MagicMock()

    def test_passthrough(self):
        item = ListingItem(
            source="test", source_id="5", source_url="http://test.al/5",
            title="Test", transaction_type="sale",
            city="Tiranë", images=["http://img.al/1.jpg"],
            latitude=41.35, longitude=19.85,
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result["latitude"] == 41.35
        assert result["longitude"] == 19.85


# ─── Nominatim geocoding ───────────────────────────────────────


class TestNominatimGeocoding:
    """When address_raw or neighborhood available, try Nominatim."""

    def setup_method(self):
        self.pipeline = GeocodingPipeline()
        self.spider = MagicMock()

    @patch("shtepi.pipelines.requests.get")
    def test_geocode_with_neighborhood(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"lat": "41.3285", "lon": "19.8200"}
        ]
        mock_get.return_value = mock_response

        item = ListingItem(
            source="test", source_id="6", source_url="http://test.al/6",
            title="Test", transaction_type="sale",
            city="Tiranë", neighborhood="Blloku",
            images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result["latitude"] == pytest.approx(41.3285, abs=0.0001)
        assert result["longitude"] == pytest.approx(19.82, abs=0.0001)
        mock_get.assert_called_once()

    @patch("shtepi.pipelines.requests.get")
    def test_geocode_with_address_raw(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"lat": "41.3300", "lon": "19.8100"}
        ]
        mock_get.return_value = mock_response

        item = ListingItem(
            source="test", source_id="7", source_url="http://test.al/7",
            title="Test", transaction_type="sale",
            city="Tiranë", address_raw="Rruga Myslym Shyri",
            images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result["latitude"] == pytest.approx(41.33, abs=0.001)

    @patch("shtepi.pipelines.requests.get")
    def test_nominatim_empty_response_falls_back_to_city(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_get.return_value = mock_response

        item = ListingItem(
            source="test", source_id="8", source_url="http://test.al/8",
            title="Test", transaction_type="sale",
            city="Tiranë", neighborhood="SomeObscurePlace",
            images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        # Falls back to city center
        assert result["latitude"] == pytest.approx(41.3275, abs=0.001)

    @patch("shtepi.pipelines.requests.get")
    def test_nominatim_error_falls_back_to_city(self, mock_get):
        mock_get.side_effect = Exception("Network error")

        item = ListingItem(
            source="test", source_id="9", source_url="http://test.al/9",
            title="Test", transaction_type="sale",
            city="Tiranë", neighborhood="Blloku",
            images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        # Falls back to city center
        assert result["latitude"] == pytest.approx(41.3275, abs=0.001)

    @patch("shtepi.pipelines.requests.get")
    def test_cache_avoids_duplicate_requests(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"lat": "41.3285", "lon": "19.8200"}
        ]
        mock_get.return_value = mock_response

        item1 = ListingItem(
            source="test", source_id="10", source_url="http://test.al/10",
            title="Test1", transaction_type="sale",
            city="Tiranë", neighborhood="Blloku",
            images=["http://img.al/1.jpg"],
        )
        item2 = ListingItem(
            source="test", source_id="11", source_url="http://test.al/11",
            title="Test2", transaction_type="sale",
            city="Tiranë", neighborhood="Blloku",
            images=["http://img.al/1.jpg"],
        )
        self.pipeline.process_item(item1, self.spider)
        self.pipeline.process_item(item2, self.spider)
        # Only one HTTP call — second was cached
        assert mock_get.call_count == 1
