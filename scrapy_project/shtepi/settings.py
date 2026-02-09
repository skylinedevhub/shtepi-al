"""Scrapy settings for ShtëpiAL project."""

BOT_NAME = "shtepi"
SPIDER_MODULES = ["shtepi.spiders"]
NEWSPIDER_MODULE = "shtepi.spiders"

# Obey robots.txt
ROBOTSTXT_OBEY = True

# Crawl responsibly
DOWNLOAD_DELAY = 1.5
CONCURRENT_REQUESTS = 4
CONCURRENT_REQUESTS_PER_DOMAIN = 2

# User-Agent rotation
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Pipeline chain: validate → normalize → dedup → store
ITEM_PIPELINES = {
    "shtepi.pipelines.ValidationPipeline": 100,
    "shtepi.pipelines.NormalizationPipeline": 200,
    "shtepi.pipelines.DedupPipeline": 300,
    "shtepi.pipelines.SQLitePipeline": 400,
}

# SQLite database path
SQLITE_DB_PATH = "db/shtepi.db"

# Retry settings
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# Auto-throttle
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 10

# Cache for development
HTTPCACHE_ENABLED = True
HTTPCACHE_EXPIRATION_SECS = 86400  # 24 hours
HTTPCACHE_DIR = "httpcache"

# Logging
LOG_LEVEL = "INFO"

# Request fingerprinting
REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
FEED_EXPORT_ENCODING = "utf-8"
