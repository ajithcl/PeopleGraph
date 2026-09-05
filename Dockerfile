FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8010 \
    FLASK_DEBUG=false

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY peoplegraph ./peoplegraph
COPY app.py gunicorn.conf.py family-tree-radial-v2.html ./
COPY PHASE1.md PHASE2.md PHASE3.md PHASE4.md PHASE5.md ./

RUN mkdir -p uploads/photos

EXPOSE 8010

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8010/health || exit 1

CMD ["gunicorn", "-c", "gunicorn.conf.py", "peoplegraph.factory:create_app()"]
