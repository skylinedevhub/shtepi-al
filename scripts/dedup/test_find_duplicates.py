"""Tests for the dedup scoring and clustering logic."""

import pytest
from find_duplicates import score_listing


class TestScoreListing:
    """Test the score_listing function used to pick canonical listings."""

    def _make_row(self, **overrides):
        defaults = {
            "id": "test-id",
            "source": "merrjep",
            "title": "Test listing",
            "image_count": 0,
            "description": None,
            "neighborhood": None,
            "floor": None,
            "area_sqm": None,
            "room_config": None,
            "latitude": None,
            "longitude": None,
            "last_seen": None,
        }
        defaults.update(overrides)
        return defaults

    def test_more_images_wins(self):
        few = score_listing(self._make_row(image_count=2))
        many = score_listing(self._make_row(image_count=8))
        assert many > few

    def test_description_adds_score(self):
        no_desc = score_listing(self._make_row())
        with_desc = score_listing(self._make_row(description="A" * 200))
        assert with_desc > no_desc

    def test_neighborhood_adds_score(self):
        no_nbhd = score_listing(self._make_row())
        with_nbhd = score_listing(self._make_row(neighborhood="Bllok"))
        assert with_nbhd > no_nbhd

    def test_floor_adds_score(self):
        no_floor = score_listing(self._make_row())
        with_floor = score_listing(self._make_row(floor=3))
        assert with_floor > no_floor

    def test_source_preference(self):
        """duashpi should score higher than mirlir (more structured data)."""
        duashpi = score_listing(self._make_row(source="duashpi"))
        mirlir = score_listing(self._make_row(source="mirlir"))
        assert duashpi > mirlir

    def test_source_preference_order(self):
        """duashpi > njoftime > merrjep > mirlir."""
        scores = {
            src: score_listing(self._make_row(source=src))
            for src in ["duashpi", "njoftime", "merrjep", "mirlir"]
        }
        assert scores["duashpi"] > scores["njoftime"]
        assert scores["njoftime"] > scores["merrjep"]
        assert scores["merrjep"] > scores["mirlir"]

    def test_images_capped_at_10(self):
        """Image bonus shouldn't grow infinitely."""
        ten = score_listing(self._make_row(image_count=10))
        twenty = score_listing(self._make_row(image_count=20))
        assert ten == twenty

    def test_comprehensive_wins_over_sparse(self):
        """A listing with all fields should beat one with only source bonus."""
        sparse = score_listing(self._make_row(source="duashpi"))
        comprehensive = score_listing(self._make_row(
            source="mirlir",
            image_count=8,
            description="Long detailed description " * 20,
            neighborhood="Bllok",
            floor=5,
            area_sqm=85.0,
            room_config="2+1",
            latitude=41.33,
            longitude=19.82,
            last_seen="2026-02-25",
        ))
        assert comprehensive > sparse
