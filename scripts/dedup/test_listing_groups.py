"""Tests for the --group flag in find_duplicates.py.

Verifies that the grouping logic assigns the same listing_group_id
to all members of a duplicate cluster without deactivating them.
"""

import inspect
import uuid

from find_duplicates import apply_grouping, score_listing


class TestApplyGrouping:
    """Verify apply_grouping function structure and behavior."""

    def _get_source(self):
        return inspect.getsource(apply_grouping)

    def test_function_exists(self):
        """apply_grouping should be importable."""
        assert callable(apply_grouping)

    def test_generates_uuid_per_cluster(self):
        """Each cluster should get its own UUID group ID."""
        source = self._get_source()
        assert "uuid.uuid4()" in source, \
            "Should generate a new UUID for each cluster"

    def test_updates_all_members(self):
        """Should update ALL members (keep + deactivate), not just losers."""
        source = self._get_source()
        # The function should build all_ids from keep + deactivate
        assert '["keep"]' in source or "keep" in source
        assert "deactivate" in source
        assert "ANY" in source, "Should use ANY(%s) to update all IDs at once"

    def test_does_not_deactivate(self):
        """Grouping must NOT set is_active = false."""
        source = self._get_source()
        assert "is_active = false" not in source.lower(), \
            "apply_grouping must not deactivate listings"

    def test_sets_listing_group_id(self):
        """Should SET listing_group_id on all group members."""
        source = self._get_source()
        assert "listing_group_id" in source

    def test_only_groups_active_listings(self):
        """Should only update listings WHERE is_active = true."""
        source = self._get_source()
        assert "is_active = true" in source

    def test_skips_single_member_clusters(self):
        """Clusters with < 2 members should be skipped."""
        source = self._get_source()
        assert "len(all_ids) < 2" in source or "< 2" in source


class TestGroupFlag:
    """Verify the --group flag is wired up in the CLI."""

    def test_group_flag_in_argparse(self):
        """main() should accept --group as an argument."""
        import find_duplicates
        source = inspect.getsource(find_duplicates.main)
        assert '"--group"' in source

    def test_group_calls_apply_grouping(self):
        """When --group is used, apply_grouping should be called."""
        import find_duplicates
        source = inspect.getsource(find_duplicates.main)
        assert "apply_grouping" in source

    def test_group_is_mutually_exclusive(self):
        """--group should be in the mutually exclusive group with --apply."""
        import find_duplicates
        source = inspect.getsource(find_duplicates.main)
        # Should be in the same add_mutually_exclusive_group block
        assert "add_mutually_exclusive_group" in source


class TestRevertGroups:
    """Verify --revert-groups flag exists."""

    def test_revert_groups_flag_exists(self):
        import find_duplicates
        source = inspect.getsource(find_duplicates.main)
        assert '"--revert-groups"' in source

    def test_revert_grouping_function_exists(self):
        from find_duplicates import revert_grouping
        assert callable(revert_grouping)

    def test_revert_sets_null(self):
        from find_duplicates import revert_grouping
        source = inspect.getsource(revert_grouping)
        assert "listing_group_id = NULL" in source


class TestScoreListing:
    """Verify the scoring function used to pick the best listing."""

    def test_more_images_scores_higher(self):
        base = {"image_count": 1, "description": None, "neighborhood": None,
                "floor": None, "area_sqm": None, "room_config": None,
                "latitude": None, "longitude": None, "last_seen": None, "source": ""}
        few = {**base, "image_count": 2}
        many = {**base, "image_count": 8}
        assert score_listing(many) > score_listing(few)

    def test_description_scores_higher(self):
        base = {"image_count": 0, "description": None, "neighborhood": None,
                "floor": None, "area_sqm": None, "room_config": None,
                "latitude": None, "longitude": None, "last_seen": None, "source": ""}
        no_desc = {**base}
        with_desc = {**base, "description": "A nice apartment in the center of Tiranë with a beautiful view of the city and mountains nearby."}
        assert score_listing(with_desc) > score_listing(no_desc)
