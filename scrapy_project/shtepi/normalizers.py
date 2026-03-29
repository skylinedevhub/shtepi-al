"""Normalization functions for Albanian real estate data.

Handles city names, room configs, prices, and property types
with Albanian-specific parsing rules.
"""

import os
import re
from typing import Optional

# EUR/ALL exchange rate — configurable via env, default Bank of Albania approximate rate
EUR_ALL_RATE = float(os.environ.get("EUR_ALL_RATE", "100.0"))
USD_EUR_RATE = float(os.environ.get("USD_EUR_RATE", "0.92"))

# City name normalization map: variant → canonical form
CITY_MAP: dict[str, str] = {
    # Tiranë
    "tirane": "Tiranë",
    "tirana": "Tiranë",
    "tiranë": "Tiranë",
    "tirané": "Tiranë",
    # Durrës
    "durres": "Durrës",
    "durrës": "Durrës",
    "durrs": "Durrës",
    # Vlorë
    "vlore": "Vlorë",
    "vlorë": "Vlorë",
    "vlora": "Vlorë",
    # Sarandë
    "sarande": "Sarandë",
    "sarandë": "Sarandë",
    "saranda": "Sarandë",
    # Shkodër
    "shkoder": "Shkodër",
    "shkodër": "Shkodër",
    "shkodra": "Shkodër",
    # Korçë
    "korce": "Korçë",
    "korçë": "Korçë",
    "korca": "Korçë",
    # Others
    "elbasan": "Elbasan",
    "fier": "Fier",
    "berat": "Berat",
    "lushnje": "Lushnjë",
    "lushnjë": "Lushnjë",
    "pogradec": "Pogradec",
    "kamez": "Kamëz",
    "kamëz": "Kamëz",
    "vore": "Vorë",
    "vorë": "Vorë",
    "golem": "Golem",
    "dhermi": "Dhërmi",
    "dhërmi": "Dhërmi",
    "himare": "Himarë",
    "himarë": "Himarë",
    "ksamil": "Ksamil",
    "gjirokaster": "Gjirokastër",
    "gjirokastër": "Gjirokastër",
    "kavaje": "Kavajë",
    "kavajë": "Kavajë",
    "lezhe": "Lezhë",
    "lezhë": "Lezhë",
    "permet": "Përmet",
    "përmet": "Përmet",
}

# Property type normalization
PROPERTY_TYPE_MAP: dict[str, str] = {
    "apartament": "apartment",
    "apartamente": "apartment",
    "apartment": "apartment",
    "shtepi": "house",
    "shtëpi": "house",
    "shtepi private": "house",
    "house": "house",
    "vila": "villa",
    "vilë": "villa",
    "villa": "villa",
    "pjese vile": "villa",
    "trual": "land",
    "toke": "land",
    "tokë": "land",
    "land": "land",
    "dyqan": "commercial",
    "lokal": "commercial",
    "zyre": "commercial",
    "zyrë": "commercial",
    "commercial": "commercial",
    "garazh": "garage",
    "garazhd": "garage",
    "garage": "garage",
    "parking": "garage",
}

# Transaction type normalization
TRANSACTION_TYPE_MAP: dict[str, str] = {
    "shitje": "sale",
    "ne shitje": "sale",
    "në shitje": "sale",
    "sale": "sale",
    "sell": "sale",
    "shitet": "sale",
    "qera": "rent",
    "me qera": "rent",
    "me qira": "rent",
    "qira": "rent",
    "rent": "rent",
    "jepet me qera": "rent",
    "jepet me qira": "rent",
}


def normalize_city(raw: Optional[str]) -> Optional[str]:
    """Normalize city name to canonical Albanian form.

    Args:
        raw: Raw city string from listing

    Returns:
        Canonical city name or original if no mapping found
    """
    if not raw:
        return None
    cleaned = raw.strip().lower()
    # Remove common prefixes
    for prefix in ("qyteti ", "qyteti i ", "në "):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):]
    return CITY_MAP.get(cleaned, raw.strip())


def normalize_room_config(raw: Optional[str]) -> tuple[Optional[str], Optional[int], Optional[int]]:
    """Parse Albanian room config format.

    Albanian listings use X+Y format:
    - "1+1" = 1 bedroom + 1 living room
    - "2+1+2" = 2 bed + 1 living + 2 bathrooms
    - "garsoniere" / "garsonierë" = studio (0 bedrooms)
    - "3+1+BLK" = 3 bed + 1 living + balcony

    Args:
        raw: Raw room config string

    Returns:
        Tuple of (config_string, bedroom_count, bathroom_count)
    """
    if not raw:
        return None, None, None

    cleaned = raw.strip().lower()

    # Studio / garsoniere
    if cleaned in ("garsoniere", "garsonierë", "garsonier", "studio"):
        return "garsoniere", 0, None

    # Match X+Y or X+Y+Z patterns (numbers and optional text like BLK)
    # Use original (not lowered) for preserving case in third group
    original = raw.strip()
    match = re.match(r'^(\d+)\s*\+\s*(\d+)(?:\s*\+\s*(\w+))?$', cleaned)
    orig_match = re.match(r'^(\d+)\s*\+\s*(\d+)(?:\s*\+\s*(\w+))?$', original)
    if match:
        bedrooms = int(match.group(1))
        # group(2) is living rooms (always counted)
        group3 = orig_match.group(3) if orig_match and orig_match.group(3) else match.group(3)
        bathrooms = None
        if group3:
            try:
                bathrooms = int(group3)
            except ValueError:
                pass  # Non-numeric like "BLK" — ignore for bathroom count

        # Reconstruct clean config string
        config = f"{match.group(1)}+{match.group(2)}"
        if group3:
            config += f"+{group3}"

        return config, bedrooms, bathrooms

    # Just a number (e.g. "3" meaning 3 rooms)
    if cleaned.isdigit():
        rooms = int(cleaned)
        return cleaned, rooms, None

    return raw.strip(), None, None


def normalize_price(
    raw_price: Optional[float],
    currency: Optional[str] = None,
    raw_text: Optional[str] = None,
) -> tuple[Optional[float], Optional[float], str]:
    """Normalize price to both EUR and ALL.

    Args:
        raw_price: Numeric price value
        currency: Currency code ("EUR", "ALL", "USD") or None
        raw_text: Raw price text for currency detection

    Returns:
        Tuple of (price_eur, price_all, detected_currency)
    """
    if raw_price is None or raw_price <= 0:
        return None, None, currency or "EUR"

    # Detect currency from text if not specified
    if not currency and raw_text:
        currency = detect_currency(raw_text)
    if not currency:
        currency = "EUR"

    currency = currency.upper().strip()

    if currency == "EUR" or currency == "€":
        price_eur = raw_price
        price_all = raw_price * EUR_ALL_RATE
        return price_eur, price_all, "EUR"
    elif currency in ("ALL", "LEK", "LEKË", "L"):
        price_all = raw_price
        price_eur = raw_price / EUR_ALL_RATE
        return price_eur, price_all, "ALL"
    elif currency in ("USD", "$"):
        price_eur = raw_price * USD_EUR_RATE
        price_all = price_eur * EUR_ALL_RATE
        return price_eur, price_all, "USD"
    else:
        # Default to EUR
        return raw_price, raw_price * EUR_ALL_RATE, "EUR"


def detect_currency(text: str) -> str:
    """Detect currency from price text.

    Args:
        text: Raw price text like "50,000 Lekë" or "120.000 €"

    Returns:
        Currency code string
    """
    text_lower = text.lower().strip()
    if "€" in text or "eur" in text_lower:
        return "EUR"
    if "lek" in text_lower or "all" in text_lower or "lekë" in text_lower:
        return "ALL"
    if "$" in text or "usd" in text_lower:
        return "USD"
    return "EUR"


def parse_price_text(text: Optional[str]) -> tuple[Optional[float], str]:
    """Extract numeric price and currency from raw price text.

    Handles Albanian number formats:
    - "120.000 €" → (120000.0, "EUR")
    - "50,000 Lekë" → (50000.0, "ALL")
    - "85 000€" → (85000.0, "EUR")

    Args:
        text: Raw price text from listing

    Returns:
        Tuple of (numeric_price, currency_code)
    """
    if not text:
        return None, "EUR"

    currency = detect_currency(text)

    # Remove currency symbols and text
    cleaned = re.sub(r'[€$]', '', text)
    cleaned = re.sub(r'\b(eur|all|lek|lekë|usd)\b', '', cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip()

    # Handle different number formats
    # "120.000" (European format, dots as thousands)
    # "50,000" (US format, commas as thousands)
    # "85 000" (space as thousands)

    # Remove spaces between digits
    cleaned = re.sub(r'(\d)\s+(\d)', r'\1\2', cleaned)

    # Determine if dots/commas are decimal or thousands separators
    # If there's a dot followed by exactly 3 digits at the end → thousands separator
    # If there's a dot followed by 1-2 digits at the end → decimal separator
    dot_match = re.search(r'\.(\d+)$', cleaned)
    comma_match = re.search(r',(\d+)$', cleaned)

    if dot_match and len(dot_match.group(1)) == 3:
        # European format: dots are thousands separators
        cleaned = cleaned.replace('.', '')
    elif dot_match and len(dot_match.group(1)) <= 2:
        # Dot is decimal separator
        cleaned = cleaned.replace(',', '')
    elif comma_match and len(comma_match.group(1)) == 3:
        # US format: commas are thousands separators
        cleaned = cleaned.replace(',', '')
    elif comma_match and len(comma_match.group(1)) <= 2:
        # Comma is decimal separator
        cleaned = cleaned.replace('.', '').replace(',', '.')

    # Remove any remaining non-numeric chars except dot
    cleaned = re.sub(r'[^\d.]', '', cleaned)

    try:
        return float(cleaned), currency
    except (ValueError, TypeError):
        return None, currency


def normalize_property_type(raw: Optional[str]) -> str:
    """Normalize property type to canonical English form.

    Args:
        raw: Raw property type string from listing

    Returns:
        Canonical property type
    """
    if not raw:
        return "apartment"
    cleaned = raw.strip().lower()
    return PROPERTY_TYPE_MAP.get(cleaned, "apartment")


def normalize_transaction_type(raw: Optional[str]) -> str:
    """Normalize transaction type to 'sale' or 'rent'.

    Args:
        raw: Raw transaction type string

    Returns:
        'sale' or 'rent'
    """
    if not raw:
        return "sale"
    cleaned = raw.strip().lower()
    return TRANSACTION_TYPE_MAP.get(cleaned, "sale")


def parse_area(text: Optional[str]) -> Optional[float]:
    """Extract area in square meters from text.

    Handles: "85 m²", "120m2", "85.5 m²", "85,5m²"

    Args:
        text: Raw area text

    Returns:
        Area in sqm or None
    """
    if not text:
        return None
    match = re.search(r'([\d.,]+)\s*m[²2]?', text, re.IGNORECASE)
    if match:
        num_str = match.group(1).replace(',', '.')
        try:
            return float(num_str)
        except ValueError:
            return None
    # Try just a number
    match = re.search(r'^([\d.,]+)$', text.strip())
    if match:
        num_str = match.group(1).replace(',', '.')
        try:
            return float(num_str)
        except ValueError:
            return None
    return None


def parse_floor(text: Optional[str]) -> tuple[Optional[int], Optional[int]]:
    """Extract floor and total floors from text.

    Handles: "Kati 3/8", "3/8", "Kati 3", "3"

    Args:
        text: Raw floor text

    Returns:
        Tuple of (floor, total_floors)
    """
    if not text:
        return None, None
    # "Kati 3/8" or "3/8"
    match = re.search(r'(\d+)\s*/\s*(\d+)', text)
    if match:
        return int(match.group(1)), int(match.group(2))
    # "Kati 3" or just "3"
    match = re.search(r'(\d+)', text)
    if match:
        return int(match.group(1)), None
    return None, None


def extract_features(text: Optional[str]) -> dict[str, Optional[bool]]:
    """Extract boolean features from listing description.

    Scans Albanian text for keywords indicating features.

    Args:
        text: Listing description text

    Returns:
        Dict with feature boolean values
    """
    if not text:
        return {
            "has_elevator": None,
            "has_parking": None,
            "is_furnished": None,
            "is_new_build": None,
        }

    text_lower = text.lower()

    return {
        "has_elevator": _check_feature(text_lower, [
            "ashensor", "ashensori", "elevator", "lift",
        ]),
        "has_parking": _check_feature(text_lower, [
            "parking", "parkimi", "garazh", "garazhd", "parkim",
        ]),
        "is_furnished": _check_feature(text_lower, [
            "mobiluar", "mobiluar", "i mobiluar", "e mobiluar",
            "mobilier", "furnished",
        ]),
        "is_new_build": _check_feature(text_lower, [
            "ndërtim i ri", "ndertim i ri", "godinë e re",
            "godine e re", "new build", "i ri", "e re",
        ]),
    }


def _check_feature(text: str, keywords: list[str]) -> Optional[bool]:
    """Check if any keyword appears in text."""
    for keyword in keywords:
        if keyword in text:
            return True
    return None
