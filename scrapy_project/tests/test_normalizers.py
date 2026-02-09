"""Comprehensive tests for Albanian real estate normalizers."""

import pytest

from shtepi.normalizers import (
    detect_currency,
    extract_features,
    normalize_city,
    normalize_price,
    normalize_property_type,
    normalize_room_config,
    normalize_transaction_type,
    parse_area,
    parse_floor,
    parse_price_text,
)


# ─── City normalization ────────────────────────────────────────────


class TestNormalizeCity:
    """Test Albanian city name normalization."""

    @pytest.mark.parametrize(
        "raw, expected",
        [
            ("Tirane", "Tiranë"),
            ("Tirana", "Tiranë"),
            ("Tiranë", "Tiranë"),
            ("tirane", "Tiranë"),
            ("TIRANE", "Tiranë"),  # lowercased before lookup
            ("  Tirane  ", "Tiranë"),
        ],
    )
    def test_tirane_variants(self, raw, expected):
        assert normalize_city(raw) == expected

    @pytest.mark.parametrize(
        "raw, expected",
        [
            ("Durres", "Durrës"),
            ("Durrës", "Durrës"),
            ("durres", "Durrës"),
            ("Vlore", "Vlorë"),
            ("Vlorë", "Vlorë"),
            ("Sarande", "Sarandë"),
            ("Sarandë", "Sarandë"),
            ("Shkoder", "Shkodër"),
            ("Shkodër", "Shkodër"),
            ("Korce", "Korçë"),
            ("Korçë", "Korçë"),
        ],
    )
    def test_major_cities(self, raw, expected):
        assert normalize_city(raw) == expected

    @pytest.mark.parametrize(
        "raw, expected",
        [
            ("Elbasan", "Elbasan"),
            ("Fier", "Fier"),
            ("Berat", "Berat"),
            ("Lushnje", "Lushnjë"),
            ("Pogradec", "Pogradec"),
            ("Kamez", "Kamëz"),
            ("Vore", "Vorë"),
            ("Golem", "Golem"),
            ("Dhermi", "Dhërmi"),
            ("Himare", "Himarë"),
            ("Ksamil", "Ksamil"),
        ],
    )
    def test_smaller_cities(self, raw, expected):
        assert normalize_city(raw) == expected

    def test_none_input(self):
        assert normalize_city(None) is None

    def test_empty_string(self):
        assert normalize_city("") is None

    def test_unknown_city_passthrough(self):
        assert normalize_city("Bulqizë") == "Bulqizë"

    def test_prefix_removal(self):
        assert normalize_city("Qyteti Tirane") == "Tiranë"
        assert normalize_city("në Durres") == "Durrës"


# ─── Room config parsing ───────────────────────────────────────────


class TestNormalizeRoomConfig:
    """Test Albanian room config format parsing."""

    def test_standard_one_plus_one(self):
        config, rooms, baths = normalize_room_config("1+1")
        assert config == "1+1"
        assert rooms == 1
        assert baths is None

    def test_two_plus_one(self):
        config, rooms, baths = normalize_room_config("2+1")
        assert config == "2+1"
        assert rooms == 2
        assert baths is None

    def test_three_plus_one(self):
        config, rooms, baths = normalize_room_config("3+1")
        assert config == "3+1"
        assert rooms == 3

    def test_with_bathrooms(self):
        config, rooms, baths = normalize_room_config("2+1+2")
        assert config == "2+1+2"
        assert rooms == 2
        assert baths == 2

    def test_with_balcony_code(self):
        config, rooms, baths = normalize_room_config("3+1+BLK")
        assert config == "3+1+BLK"
        assert rooms == 3
        assert baths is None  # BLK is not a bathroom count

    def test_garsoniere(self):
        config, rooms, baths = normalize_room_config("garsoniere")
        assert config == "garsoniere"
        assert rooms == 0
        assert baths is None

    def test_garsoniere_with_diacritics(self):
        config, rooms, baths = normalize_room_config("Garsonierë")
        assert config == "garsoniere"
        assert rooms == 0

    def test_studio(self):
        config, rooms, baths = normalize_room_config("studio")
        assert config == "garsoniere"
        assert rooms == 0

    def test_just_number(self):
        config, rooms, baths = normalize_room_config("3")
        assert config == "3"
        assert rooms == 3

    def test_spaces_around_plus(self):
        config, rooms, baths = normalize_room_config("2 + 1")
        assert config == "2+1"
        assert rooms == 2

    def test_none_input(self):
        config, rooms, baths = normalize_room_config(None)
        assert config is None
        assert rooms is None
        assert baths is None

    def test_empty_string(self):
        config, rooms, baths = normalize_room_config("")
        assert config is None


# ─── Price normalization ───────────────────────────────────────────


class TestNormalizePrice:
    """Test price normalization (EUR/ALL/USD)."""

    def test_eur_price(self):
        eur, all_, currency = normalize_price(75000, "EUR")
        assert eur == 75000
        assert all_ == 7500000  # 75000 * 100
        assert currency == "EUR"

    def test_all_price(self):
        eur, all_, currency = normalize_price(7500000, "ALL")
        assert all_ == 7500000
        assert eur == 75000  # 7500000 / 100
        assert currency == "ALL"

    def test_usd_price(self):
        eur, all_, currency = normalize_price(100000, "USD")
        assert eur == pytest.approx(92000, abs=100)
        assert currency == "USD"

    def test_lek_synonym(self):
        eur, all_, currency = normalize_price(5000000, "LEK")
        assert all_ == 5000000
        assert currency == "ALL"

    def test_leke_synonym(self):
        eur, all_, currency = normalize_price(5000000, "LEKË")
        assert all_ == 5000000
        assert currency == "ALL"

    def test_none_price(self):
        eur, all_, currency = normalize_price(None)
        assert eur is None
        assert all_ is None

    def test_zero_price(self):
        eur, all_, currency = normalize_price(0)
        assert eur is None

    def test_negative_price(self):
        eur, all_, currency = normalize_price(-1000)
        assert eur is None

    def test_default_currency_eur(self):
        eur, all_, currency = normalize_price(50000)
        assert currency == "EUR"
        assert eur == 50000

    def test_currency_symbol_euro(self):
        eur, all_, currency = normalize_price(50000, "€")
        assert currency == "EUR"

    def test_currency_symbol_dollar(self):
        eur, all_, currency = normalize_price(50000, "$")
        assert currency == "USD"


class TestParsePriceText:
    """Test raw price text parsing."""

    def test_euro_with_dots(self):
        price, currency = parse_price_text("120.000 €")
        assert price == 120000
        assert currency == "EUR"

    def test_lek_with_commas(self):
        price, currency = parse_price_text("50,000 Lekë")
        assert price == 50000
        assert currency == "ALL"

    def test_euro_no_space(self):
        price, currency = parse_price_text("85000€")
        assert price == 85000
        assert currency == "EUR"

    def test_space_thousands(self):
        price, currency = parse_price_text("85 000€")
        assert price == 85000
        assert currency == "EUR"

    def test_eur_text(self):
        price, currency = parse_price_text("75000 EUR")
        assert price == 75000
        assert currency == "EUR"

    def test_all_text(self):
        price, currency = parse_price_text("5000000 ALL")
        assert price == 5000000
        assert currency == "ALL"

    def test_none_input(self):
        price, currency = parse_price_text(None)
        assert price is None

    def test_empty_input(self):
        price, currency = parse_price_text("")
        assert price is None

    def test_decimal_price(self):
        price, currency = parse_price_text("120.50 €")
        # 120.50 has 2 decimal digits → decimal separator
        assert price == 120.50
        assert currency == "EUR"


class TestDetectCurrency:
    """Test currency detection from text."""

    def test_euro_symbol(self):
        assert detect_currency("120.000 €") == "EUR"

    def test_eur_text(self):
        assert detect_currency("75000 EUR") == "EUR"

    def test_lek_text(self):
        assert detect_currency("5000000 Lek") == "ALL"

    def test_leke_text(self):
        assert detect_currency("5000000 Lekë") == "ALL"

    def test_all_text(self):
        assert detect_currency("5000000 ALL") == "ALL"

    def test_dollar_symbol(self):
        assert detect_currency("$100000") == "USD"

    def test_usd_text(self):
        assert detect_currency("100000 USD") == "USD"

    def test_default_eur(self):
        assert detect_currency("75000") == "EUR"


# ─── Property type ─────────────────────────────────────────────────


class TestNormalizePropertyType:
    """Test property type normalization."""

    @pytest.mark.parametrize(
        "raw, expected",
        [
            ("apartament", "apartment"),
            ("apartamente", "apartment"),
            ("apartment", "apartment"),
            ("Apartament", "apartment"),
            ("shtepi", "house"),
            ("shtëpi", "house"),
            ("shtepi private", "house"),
            ("vila", "villa"),
            ("vilë", "villa"),
            ("pjese vile", "villa"),
            ("trual", "land"),
            ("toke", "land"),
            ("tokë", "land"),
            ("dyqan", "commercial"),
            ("lokal", "commercial"),
            ("zyre", "commercial"),
            ("zyrë", "commercial"),
            ("garazh", "garage"),
            ("parking", "garage"),
        ],
    )
    def test_all_types(self, raw, expected):
        assert normalize_property_type(raw) == expected

    def test_none_defaults_apartment(self):
        assert normalize_property_type(None) == "apartment"

    def test_unknown_defaults_apartment(self):
        assert normalize_property_type("unknown_type") == "apartment"


# ─── Transaction type ──────────────────────────────────────────────


class TestNormalizeTransactionType:
    """Test transaction type normalization."""

    @pytest.mark.parametrize(
        "raw, expected",
        [
            ("shitje", "sale"),
            ("ne shitje", "sale"),
            ("në shitje", "sale"),
            ("sale", "sale"),
            ("shitet", "sale"),
            ("qera", "rent"),
            ("me qera", "rent"),
            ("me qira", "rent"),
            ("qira", "rent"),
            ("rent", "rent"),
            ("jepet me qera", "rent"),
            ("jepet me qira", "rent"),
        ],
    )
    def test_all_types(self, raw, expected):
        assert normalize_transaction_type(raw) == expected

    def test_none_defaults_sale(self):
        assert normalize_transaction_type(None) == "sale"


# ─── Area parsing ──────────────────────────────────────────────────


class TestParseArea:
    """Test area extraction from text."""

    @pytest.mark.parametrize(
        "text, expected",
        [
            ("85 m²", 85.0),
            ("120m2", 120.0),
            ("85.5 m²", 85.5),
            ("85,5m²", 85.5),
            ("100 m²", 100.0),
            ("65", 65.0),
            (None, None),
            ("", None),
        ],
    )
    def test_parse_area(self, text, expected):
        assert parse_area(text) == expected


# ─── Floor parsing ─────────────────────────────────────────────────


class TestParseFloor:
    """Test floor extraction from text."""

    def test_floor_with_total(self):
        floor, total = parse_floor("Kati 3/8")
        assert floor == 3
        assert total == 8

    def test_bare_fraction(self):
        floor, total = parse_floor("3/8")
        assert floor == 3
        assert total == 8

    def test_floor_only(self):
        floor, total = parse_floor("Kati 3")
        assert floor == 3
        assert total is None

    def test_bare_number(self):
        floor, total = parse_floor("5")
        assert floor == 5
        assert total is None

    def test_none(self):
        floor, total = parse_floor(None)
        assert floor is None
        assert total is None


# ─── Feature extraction ───────────────────────────────────────────


class TestExtractFeatures:
    """Test feature extraction from Albanian descriptions."""

    def test_elevator(self):
        features = extract_features("Apartament me ashensor, pamje e bukur")
        assert features["has_elevator"] is True

    def test_parking(self):
        features = extract_features("Ka parking nëntokësor")
        assert features["has_parking"] is True

    def test_furnished(self):
        features = extract_features("Apartament i mobiluar plotësisht")
        assert features["is_furnished"] is True

    def test_new_build(self):
        features = extract_features("Ndërtim i ri, cilësi e lartë")
        assert features["is_new_build"] is True

    def test_multiple_features(self):
        features = extract_features(
            "Apartament i mobiluar, me ashensor dhe parking"
        )
        assert features["is_furnished"] is True
        assert features["has_elevator"] is True
        assert features["has_parking"] is True

    def test_no_features(self):
        features = extract_features("Apartament në Tiranë")
        assert features["has_elevator"] is None
        assert features["has_parking"] is None
        assert features["is_furnished"] is None
        assert features["is_new_build"] is None

    def test_none_input(self):
        features = extract_features(None)
        assert all(v is None for v in features.values())
