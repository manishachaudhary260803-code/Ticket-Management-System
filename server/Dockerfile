# Root directory for this service in Railway must stay at the repo root
# with "Custom Dockerfile Path" set to server/Dockerfile — see DEPLOYMENT.md.
FROM python:3.11-slim

WORKDIR /app

# psycopg2-binary needs libpq at runtime; build-essential covers any source
# builds that slip through for other wheels.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY server/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ ./

ENV PORT=3000
EXPOSE 3000

# Apply pending Alembic migrations, then start the API. No --reload in production.
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
