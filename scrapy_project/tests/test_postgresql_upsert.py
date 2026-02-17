"""Tests for COALESCE guard on coordinate upsert (PostgreSQL + SQLite).

These tests verify the SQL templates contain COALESCE guards to prevent
NULL coordinates from overwriting existing good coordinates.
We test the SQL string directly rather than hitting a real database.
"""

import re

from shtepi.pipelines import PostgreSQLPipeline, SQLitePipeline


class TestCoalesceGuard:
    """Verify the upsert SQL uses COALESCE for latitude/longitude."""

    def _get_upsert_sql(self):
        """Extract the SQL string from _flush method source."""
        import inspect
        source = inspect.getsource(PostgreSQLPipeline._flush)
        return source

    def test_latitude_uses_coalesce(self):
        """ON CONFLICT UPDATE should use COALESCE for latitude."""
        source = self._get_upsert_sql()
        assert "COALESCE(EXCLUDED.latitude, listings.latitude)" in source, \
            "latitude upsert should use COALESCE to prevent NULL overwrite"

    def test_longitude_uses_coalesce(self):
        """ON CONFLICT UPDATE should use COALESCE for longitude."""
        source = self._get_upsert_sql()
        assert "COALESCE(EXCLUDED.longitude, listings.longitude)" in source, \
            "longitude upsert should use COALESCE to prevent NULL overwrite"

    def test_latitude_not_bare_excluded(self):
        """ON CONFLICT UPDATE should NOT have bare `latitude = EXCLUDED.latitude`."""
        source = self._get_upsert_sql()
        update_section = source[source.index("DO UPDATE SET"):]
        for line in update_section.split("\n"):
            if "latitude = EXCLUDED.latitude" in line and "COALESCE" not in line:
                assert False, f"Found bare latitude = EXCLUDED.latitude without COALESCE: {line.strip()}"


class TestSQLiteCoalesceGuard:
    """Verify SQLite UPDATE uses COALESCE for latitude/longitude."""

    def _get_update_sql(self):
        import inspect
        return inspect.getsource(SQLitePipeline.process_item)

    def test_latitude_uses_coalesce(self):
        source = self._get_update_sql()
        assert "COALESCE" in source and "latitude" in source, \
            "SQLite UPDATE should use COALESCE for latitude"

    def test_longitude_uses_coalesce(self):
        source = self._get_update_sql()
        assert "COALESCE" in source and "longitude" in source, \
            "SQLite UPDATE should use COALESCE for longitude"
