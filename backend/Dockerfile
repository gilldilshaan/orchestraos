FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app/ ./app/
COPY prompts/ ./prompts/
COPY migrations/ ./migrations/
COPY migrations/alembic.ini ./
COPY start.sh ./
RUN pip install --no-cache-dir -e ".[dev]" \
    && chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
