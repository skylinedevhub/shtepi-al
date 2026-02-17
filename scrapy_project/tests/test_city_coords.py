"""Tests for the shared CITY_COORDS module."""

from shtepi.city_coords import CITY_COORDS

EXPECTED_CITIES = [
    "Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër",
    "Korçë", "Elbasan", "Fier", "Berat", "Lushnjë",
    "Kamëz", "Pogradec", "Kavajë", "Lezhë", "Gjirokastër",
    "Vorë", "Golem", "Himarë", "Ksamil", "Dhërmi",
    "Përmet", "Prishtinë",
]


class TestCityCoords:
    """Verify CITY_COORDS is complete and well-formed."""

    def test_contains_all_22_cities(self):
        for city in EXPECTED_CITIES:
            assert city in CITY_COORDS, f"Missing city: {city}"

    def test_count_is_22(self):
        assert len(CITY_COORDS) == 22

    def test_coordinates_are_tuples_of_floats(self):
        for city, coords in CITY_COORDS.items():
            assert isinstance(coords, tuple), f"{city}: not a tuple"
            assert len(coords) == 2, f"{city}: not a 2-tuple"
            lat, lng = coords
            assert isinstance(lat, float), f"{city}: lat not float"
            assert isinstance(lng, float), f"{city}: lng not float"

    def test_coordinates_are_in_albania_region(self):
        """All cities should be roughly in Albania/Kosovo region."""
        for city, (lat, lng) in CITY_COORDS.items():
            assert 39.0 <= lat <= 43.0, f"{city}: latitude {lat} out of range"
            assert 19.0 <= lng <= 22.0, f"{city}: longitude {lng} out of range"


class TestPipelineUsesSharedCoords:
    """Verify the pipeline uses the shared CITY_COORDS, not its own copy."""

    def test_pipeline_city_coords_is_shared(self):
        from shtepi.pipelines import CITY_COORDS as pipeline_coords
        from shtepi.city_coords import CITY_COORDS as shared_coords
        assert pipeline_coords is shared_coords


class TestBackfillUsesSharedCoords:
    """Verify the backfill script uses the shared CITY_COORDS."""

    def test_backfill_imports_from_city_coords(self):
        import os
        backfill_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "scripts", "backfill_geocode.py"
        )
        with open(backfill_path) as f:
            content = f.read()
        assert "from shtepi.city_coords import CITY_COORDS" in content
