# syntax=docker/dockerfile:1

FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8010 \
    FLASK_DEBUG=false \
    TRUST_PROXY=true

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY peoplegraph ./peoplegraph
COPY app.py gunicorn.conf.py ./
COPY --from=frontend /frontend/dist ./frontend/dist

RUN mkdir -p uploads/photos

EXPOSE 8010

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=20s \
  CMD curl -f http://localhost:8010/health || exit 1

CMD ["gunicorn", "-c", "gunicorn.conf.py", "peoplegraph:create_app()"]
