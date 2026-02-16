"""Scrapy item definitions for ShtëpiAL listings."""

import scrapy


class ListingItem(scrapy.Item):
    """Normalized listing item matching the ShtëpiAL schema."""

    # Identity
    source = scrapy.Field()
    source_url = scrapy.Field()
    source_id = scrapy.Field()

    # Core
    title = scrapy.Field()
    description = scrapy.Field()
    price = scrapy.Field()           # normalized to EUR
    price_all = scrapy.Field()       # price in Albanian Lek
    currency_original = scrapy.Field()
    price_period = scrapy.Field()    # "total" | "monthly"

    # Classification
    transaction_type = scrapy.Field()  # "sale" | "rent"
    property_type = scrapy.Field()     # "apartment" | "house" | "villa" | "land" | "commercial" | "garage"
    room_config = scrapy.Field()       # raw Albanian: "1+1", "2+1+2", "garsoniere"

    # Dimensions
    area_sqm = scrapy.Field()
    area_net_sqm = scrapy.Field()
    floor = scrapy.Field()
    total_floors = scrapy.Field()
    rooms = scrapy.Field()
    bathrooms = scrapy.Field()

    # Location
    city = scrapy.Field()
    neighborhood = scrapy.Field()
    address_raw = scrapy.Field()
    latitude = scrapy.Field()      # float, WGS84
    longitude = scrapy.Field()     # float, WGS84

    # Media
    images = scrapy.Field()         # list of image URLs
    image_count = scrapy.Field()

    # Contact
    poster_name = scrapy.Field()
    poster_phone = scrapy.Field()
    poster_type = scrapy.Field()    # "private" | "agency"

    # Status
    is_active = scrapy.Field()
    created_at = scrapy.Field()

    # Features
    has_elevator = scrapy.Field()
    has_parking = scrapy.Field()
    is_furnished = scrapy.Field()
    is_new_build = scrapy.Field()

    # Raw data
    raw_json = scrapy.Field()
