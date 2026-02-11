FROM python:3.12-slim

WORKDIR /app

COPY scrapy_project/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scrapy_project/ .

CMD ["scrapy", "crawl", "merrjep"]
