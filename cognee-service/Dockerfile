# Build context is the repo root (see docker-compose.yml) so this can also
# COPY in the sibling cognee-onto package until it's published to PyPI.
FROM python:3.11-slim

WORKDIR /service

COPY cognee-onto /cognee-onto
COPY cognee-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY cognee-service/app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
