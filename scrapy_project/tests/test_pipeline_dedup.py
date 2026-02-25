"""Tests for cross-source dedup logic in PostgreSQLPipeline.

Tests the scoring function and dedup method without a real database.
"""

import json
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from shtepi.pipelines import PostgreSQLPipeline

SCORE_COLS = PostgreSQLPipeline._SCORE_COLS


def _row_tuple(**overrides):
    """Build a tuple matching _SCORE_COLS order for cursor.fetchall()."""
    defaults = {
        "id": "aaa-111",
        "source": "merrjep",
        "title": "Test apartment Tiranë",
        "image_count": 5,
        "description": "Nice apartment",
        "neighborhood": "Bllok",
        "floor": 3,
        "area_sqm": 80.0,
        "room_config": "2+1",
        "latitude": 41.33,
        "longitude": 19.82,
        "last_seen": "2026-02-25",
    }
    defaults.update(overrides)
    return tuple(defaults[col] for col in SCORE_COLS)


class MockCursor:
    """Test cursor that dispatches fetchall results based on the last SQL executed."""

    def __init__(self, rules=None):
        self.rules = rules or []  # list of (sql_pattern, result)
        self._last_sql = ""
        self._last_params = None
        self.rowcount = 1
        self.execute_log = []

    def execute(self, sql, params=None):
        self._last_sql = sql
        self._last_params = params
        self.execute_log.append((sql, params))

    def fetchall(self):
        for pattern, result in self.rules:
            if pattern in self._last_sql:
                if callable(result):
                    return result(self._last_params)
                return result
        return []

    def close(self):
        pass

    @property
    def update_calls(self):
        return [
            (sql, params) for sql, params in self.execute_log
            if "UPDATE" in sql and "is_active = false" in sql
        ]


class TestScoreListing:
    """Test the score_listing static method on PostgreSQLPipeline."""

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
        few = PostgreSQLPipeline.score_listing(self._make_row(image_count=2))
        many = PostgreSQLPipeline.score_listing(self._make_row(image_count=8))
        assert many > few

    def test_description_adds_score(self):
        no_desc = PostgreSQLPipeline.score_listing(self._make_row())
        with_desc = PostgreSQLPipeline.score_listing(self._make_row(description="A" * 200))
        assert with_desc > no_desc

    def test_neighborhood_adds_score(self):
        no_nbhd = PostgreSQLPipeline.score_listing(self._make_row())
        with_nbhd = PostgreSQLPipeline.score_listing(self._make_row(neighborhood="Bllok"))
        assert with_nbhd > no_nbhd

    def test_floor_adds_score(self):
        no_floor = PostgreSQLPipeline.score_listing(self._make_row())
        with_floor = PostgreSQLPipeline.score_listing(self._make_row(floor=3))
        assert with_floor > no_floor

    def test_source_preference_order(self):
        """duashpi > njoftime > merrjep > mirlir."""
        scores = {
            src: PostgreSQLPipeline.score_listing(self._make_row(source=src))
            for src in ["duashpi", "njoftime", "merrjep", "mirlir"]
        }
        assert scores["duashpi"] > scores["njoftime"]
        assert scores["njoftime"] > scores["merrjep"]
        assert scores["merrjep"] > scores["mirlir"]

    def test_images_capped_at_10(self):
        ten = PostgreSQLPipeline.score_listing(self._make_row(image_count=10))
        twenty = PostgreSQLPipeline.score_listing(self._make_row(image_count=20))
        assert ten == twenty

    def test_comprehensive_beats_sparse(self):
        sparse = PostgreSQLPipeline.score_listing(self._make_row(source="duashpi"))
        comprehensive = PostgreSQLPipeline.score_listing(self._make_row(
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


class TestCrossSourceDedup:
    """Test _cross_source_dedup with MockCursor."""

    def _make_pipeline(self):
        pipeline = PostgreSQLPipeline.__new__(PostgreSQLPipeline)
        pipeline.database_url = "postgresql://test"
        pipeline.conn = MagicMock()
        pipeline.buffer = []
        return pipeline

    def test_no_items_does_nothing(self):
        pipeline = self._make_pipeline()
        pipeline._cross_source_dedup([])
        pipeline.conn.cursor.assert_not_called()

    def test_no_matches_skips_dedup(self):
        """Item with short title and no phone should find no matches."""
        pipeline = self._make_pipeline()
        cursor = MockCursor()
        pipeline.conn.cursor.return_value = cursor

        items = [{"source": "merrjep", "source_id": "123", "title": "Short", "city": None,
                  "price": None, "poster_phone": None, "area_sqm": None}]
        pipeline._cross_source_dedup(items)

        assert len(cursor.update_calls) == 0

    def test_cross_source_title_match_deactivates_loser(self):
        """When two sources have the same title+city, the lower-scored one gets deactivated."""
        pipeline = self._make_pipeline()

        title = "Apartament 2+1, 85m2, Bllok, Tiranë"
        match_id = "bbb-222"

        # duashpi listing: high score (8 images, neighborhood, full data)
        current_row = _row_tuple(
            id="aaa-111", source="duashpi", image_count=8,
            title=title, neighborhood="Bllok",
        )
        # mirlir listing: low score (2 images, sparse data)
        match_row = _row_tuple(
            id=match_id, source="mirlir", image_count=2,
            title=title, neighborhood=None,
            description=None, floor=None, area_sqm=None, room_config=None,
            latitude=None, longitude=None,
        )

        cursor = MockCursor(rules=[
            ("source != %s", [(match_id,)]),              # cross-source title match
            ("source = %s AND source_id = %s", [current_row]),  # current listing
            ("id::text = ANY", [match_row]),               # match details
        ])
        pipeline.conn.cursor.return_value = cursor

        item = {
            "source": "duashpi", "source_id": "d-100",
            "title": title, "city": "tirane",
            "price": None, "poster_phone": None, "area_sqm": None,
        }
        pipeline._cross_source_dedup([item])

        assert len(cursor.update_calls) == 1
        _, params = cursor.update_calls[0]
        meta = json.loads(params[0])
        assert meta["dedup_reason"] == "cross_source_pipeline"
        assert params[1] == match_id  # mirlir listing deactivated

    def test_within_source_match_deactivates_loser(self):
        """Same source, different source_id, same title+price → dedup."""
        pipeline = self._make_pipeline()

        title = "Shitet apartament 2+1 ne Tirane"
        existing_id = "ccc-333"

        current_row = _row_tuple(
            id="ddd-444", source="merrjep", image_count=6, title=title,
        )
        old_row = _row_tuple(
            id=existing_id, source="merrjep", image_count=1, title=title,
            description=None, neighborhood=None, floor=None,
            area_sqm=None, room_config=None, latitude=None, longitude=None,
        )

        cursor = MockCursor(rules=[
            ("source_id != %s", [(existing_id,)]),         # within-source match
            ("source = %s AND source_id = %s", [current_row]),
            ("id::text = ANY", [old_row]),
        ])
        pipeline.conn.cursor.return_value = cursor

        item = {
            "source": "merrjep", "source_id": "m-200",
            "title": title, "city": None,
            "price": 95000.0, "poster_phone": None, "area_sqm": None,
        }
        pipeline._cross_source_dedup([item])

        assert len(cursor.update_calls) == 1
        _, params = cursor.update_calls[0]
        meta = json.loads(params[0])
        assert meta["dedup_reason"] == "within_source_pipeline"
        assert params[1] == existing_id

    def test_phone_price_area_match(self):
        """Cross-source match via phone + price + area deactivates loser."""
        pipeline = self._make_pipeline()

        match_id = "eee-555"
        current_row = _row_tuple(
            id="fff-666", source="merrjep", image_count=5, title="Short",
        )
        match_row = _row_tuple(
            id=match_id, source="mirlir", image_count=2,
            title="Different short", description=None, neighborhood=None,
        )

        cursor = MockCursor(rules=[
            ("poster_phone = %s", [(match_id,)]),
            ("source = %s AND source_id = %s", [current_row]),
            ("id::text = ANY", [match_row]),
        ])
        pipeline.conn.cursor.return_value = cursor

        item = {
            "source": "merrjep", "source_id": "m-300",
            "title": "Short", "city": "tirane",
            "price": 120000.0, "poster_phone": "+355691234567", "area_sqm": 85.0,
        }
        pipeline._cross_source_dedup([item])

        assert len(cursor.update_calls) == 1

    def test_batch_dedup_tracks_already_handled(self):
        """IDs deduped in one item shouldn't be re-deduped for another item."""
        pipeline = self._make_pipeline()

        shared_match_id = "ggg-777"
        title = "Apartament i bukur ne qender te Tiranes"

        current_1 = _row_tuple(id="hhh-888", source="duashpi", image_count=8, title=title)
        current_2 = _row_tuple(id="iii-999", source="njoftime", image_count=6, title=title)
        match_row = _row_tuple(
            id=shared_match_id, source="mirlir", image_count=1, title=title,
            description=None, neighborhood=None,
        )

        call_count = [0]

        def cross_source_result(params):
            """Return the shared match for the first item, empty for the second
            (since it was already deduped and removed from match_ids)."""
            return [(shared_match_id,)]

        def current_result(params):
            call_count[0] += 1
            if params and params[1] == "d-1":
                return [current_1]
            elif params and params[1] == "n-1":
                return [current_2]
            return []

        cursor = MockCursor(rules=[
            ("source != %s", cross_source_result),
            ("source = %s AND source_id = %s", current_result),
            ("id::text = ANY", [match_row]),
        ])
        pipeline.conn.cursor.return_value = cursor

        items = [
            {"source": "duashpi", "source_id": "d-1", "title": title,
             "city": "tirane", "price": None, "poster_phone": None, "area_sqm": None},
            {"source": "njoftime", "source_id": "n-1", "title": title,
             "city": "tirane", "price": None, "poster_phone": None, "area_sqm": None},
        ]
        pipeline._cross_source_dedup(items)

        # The shared match should only be deactivated ONCE
        deactivated_ids = [params[1] for _, params in cursor.update_calls]
        assert deactivated_ids.count(shared_match_id) == 1

    def test_higher_scored_listing_kept_as_canonical(self):
        """When new listing scores lower than existing, the new one gets deactivated."""
        pipeline = self._make_pipeline()

        title = "Apartament luksoz ne Bllok Tirane"

        # New listing: mirlir, sparse data (low score)
        new_row = _row_tuple(
            id="new-111", source="mirlir", image_count=1, title=title,
            description=None, neighborhood=None, floor=None,
            area_sqm=None, room_config=None, latitude=None, longitude=None,
        )
        # Existing: duashpi, rich data (high score)
        existing_row = _row_tuple(
            id="old-222", source="duashpi", image_count=10, title=title,
        )

        cursor = MockCursor(rules=[
            ("source != %s", [("old-222",)]),
            ("source = %s AND source_id = %s", [new_row]),
            ("id::text = ANY", [existing_row]),
        ])
        pipeline.conn.cursor.return_value = cursor

        item = {
            "source": "mirlir", "source_id": "mir-1", "title": title,
            "city": "tirane", "price": None, "poster_phone": None, "area_sqm": None,
        }
        pipeline._cross_source_dedup([item])

        assert len(cursor.update_calls) == 1
        _, params = cursor.update_calls[0]
        # The NEW listing (mirlir) should be deactivated, not the existing (duashpi)
        assert params[1] == "new-111"
        meta = json.loads(params[0])
        assert meta["dedup_canonical"] == "old-222"
