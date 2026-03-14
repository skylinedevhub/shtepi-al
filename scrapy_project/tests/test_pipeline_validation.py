"""Tests for ValidationPipeline price bounds and required fields."""

import pytest

from shtepi.pipelines import ValidationPipeline, DropItem


def _item(**overrides):
    """Build a minimal valid listing item."""
    defaults = {
        "source": "merrjep",
        "source_id": "123",
        "source_url": "https://merrjep.al/123",
        "title": "Apartament 2+1",
        "transaction_type": "sale",
        "images": ["https://example.com/img.jpg"],
        "price": 50000,
    }
    defaults.update(overrides)
    return defaults


class TestValidationPipeline:
    def setup_method(self):
        self.pipeline = ValidationPipeline()
        self.spider = None

    def test_valid_sale_passes(self):
        item = _item(price=85000, transaction_type="sale")
        result = self.pipeline.process_item(item, self.spider)
        assert result["price"] == 85000

    def test_valid_rent_passes(self):
        item = _item(price=500, transaction_type="rent")
        result = self.pipeline.process_item(item, self.spider)
        assert result["price"] == 500

    def test_no_price_passes(self):
        """Listings without a price should not be rejected."""
        item = _item(price=None)
        result = self.pipeline.process_item(item, self.spider)
        assert result["price"] is None

    def test_sale_price_too_low(self):
        item = _item(price=1, transaction_type="sale")
        with pytest.raises(DropItem, match="Price outlier"):
            self.pipeline.process_item(item, self.spider)

    def test_sale_price_too_high(self):
        item = _item(price=999_999_999, transaction_type="sale")
        with pytest.raises(DropItem, match="Price outlier"):
            self.pipeline.process_item(item, self.spider)

    def test_rent_price_too_low(self):
        item = _item(price=5, transaction_type="rent")
        with pytest.raises(DropItem, match="Price outlier"):
            self.pipeline.process_item(item, self.spider)

    def test_rent_price_too_high(self):
        item = _item(price=100_000, transaction_type="rent")
        with pytest.raises(DropItem, match="Price outlier"):
            self.pipeline.process_item(item, self.spider)

    def test_boundary_sale_min(self):
        item = _item(price=500, transaction_type="sale")
        result = self.pipeline.process_item(item, self.spider)
        assert result["price"] == 500

    def test_boundary_rent_max(self):
        item = _item(price=50_000, transaction_type="rent")
        result = self.pipeline.process_item(item, self.spider)
        assert result["price"] == 50_000

    def test_missing_title_drops(self):
        item = _item(title="")
        with pytest.raises(DropItem, match="Missing required field"):
            self.pipeline.process_item(item, self.spider)

    def test_no_images_drops(self):
        item = _item(images=[])
        with pytest.raises(DropItem, match="No images"):
            self.pipeline.process_item(item, self.spider)
