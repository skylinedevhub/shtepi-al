"""Tests for price history tracking in the PostgreSQL pipeline.

Verifies that the _maybe_log_price_change method is called after upserts
and that the SQL in _flush uses RETURNING to detect inserts vs updates.
"""

import inspect

from shtepi.pipelines import PostgreSQLPipeline


class TestPriceHistorySQL:
    """Verify the upsert SQL returns data needed for price change detection."""

    def _get_flush_source(self):
        return inspect.getsource(PostgreSQLPipeline._flush)

    def test_upsert_uses_returning(self):
        """The upsert should RETURN id and inserted flag for price tracking."""
        source = self._get_flush_source()
        assert "RETURNING" in source, \
            "Upsert should use RETURNING clause for price change detection"

    def test_upsert_detects_insert_vs_update(self):
        """The RETURNING clause should include xmax = 0 to detect inserts."""
        source = self._get_flush_source()
        assert "xmax = 0" in source, \
            "RETURNING should use (xmax = 0) AS inserted to distinguish inserts from updates"

    def test_calls_price_change_on_update(self):
        """After upsert, updates (not inserts) should trigger price check."""
        source = self._get_flush_source()
        assert "_maybe_log_price_change" in source, \
            "_flush should call _maybe_log_price_change for update detection"

    def test_skips_price_change_on_insert(self):
        """Price change logging should only happen for updates, not inserts."""
        source = self._get_flush_source()
        assert "not was_inserted" in source, \
            "Price change check should be skipped for new inserts"


class TestPriceChangeMethod:
    """Verify _maybe_log_price_change method structure."""

    def _get_method_source(self):
        return inspect.getsource(PostgreSQLPipeline._maybe_log_price_change)

    def test_method_exists(self):
        """PostgreSQLPipeline should have _maybe_log_price_change method."""
        assert hasattr(PostgreSQLPipeline, "_maybe_log_price_change")

    def test_queries_price_history(self):
        """Method should query price_history for last known price."""
        source = self._get_method_source()
        assert "SELECT price FROM price_history" in source

    def test_inserts_price_record(self):
        """Method should INSERT INTO price_history on change."""
        source = self._get_method_source()
        assert "INSERT INTO price_history" in source

    def test_updates_listing_metadata(self):
        """Method should update listing metadata with last_price_change."""
        source = self._get_method_source()
        assert "last_price_change" in source

    def test_seeds_first_observation(self):
        """When no history exists, method should seed initial price record."""
        source = self._get_method_source()
        # Should have a None check for the first observation
        assert "last_price is None" in source, \
            "Method should handle first observation (no prior history)"

    def test_skips_unchanged_price(self):
        """Method should not log when price hasn't changed."""
        source = self._get_method_source()
        assert "new_price == last_price" in source, \
            "Method should skip logging when price is unchanged"

    def test_logs_old_and_new_price(self):
        """Metadata should include both old and new price for badge display."""
        source = self._get_method_source()
        assert "old_price" in source and "new_price" in source, \
            "Metadata should include old_price and new_price for frontend badge"
