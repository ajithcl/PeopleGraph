# PeopleGraph production deploy

Gunicorn serves the Flask API and built SPA (`frontend/dist`). Caddy terminates HTTPS. Neo4j is not exposed publicly.

`GET /health` should report `"phase": 6`, `"frontend": "spa"`, `"neo4j_connected": true`, `"secrets_configured": true`.

## Docker Compose (VPS / Linux, or Neo4j reachable from containers)

`.env` must have distinct strong `SECRET_KEY` and `JWT_SECRET` (`FLASK_DEBUG=false`).

```bash
# Optional: public URL used in invite links
# APP_PUBLIC_URL=https://family.example.com
# DOMAIN=family.example.com
# NEO4J_URI_DOCKER=bolt://host.docker.internal:7687   # or neo4j+s://… Aura

docker compose up --build -d
curl -k https://localhost/health
```

- **Local Neo4j Desktop** usually listens on `127.0.0.1` only, so containers cannot connect. Either bind Bolt to the host LAN / `0.0.0.0` in Neo4j, or use the host path below.
- **Aura / remote Neo4j:** set `NEO4J_URI` (and `NEO4J_URI_DOCKER`) to the private/Aura URI. Do not publish Neo4j ports on the proxy.

Let’s Encrypt: point DNS at the host, set `DOMAIN` and `APP_PUBLIC_URL` to `https://<domain>`, open 80 and 443.

## Host gunicorn + Caddy (this Mac + Neo4j Desktop)

```bash
.venv/bin/gunicorn -c gunicorn.conf.py "peoplegraph:create_app()"
caddy run --config deploy/Caddyfile.host
```

Then `curl -k https://localhost:8443/health`. Trust the local CA once with `caddy trust` (optional, removes the browser warning).

Invite links: set `APP_PUBLIC_URL=https://<lan-ip>:8443` in `.env` and restart gunicorn. Relatives off your network still need a public domain (Compose path) or a tunnel.

## SMTP invite email (SCRUM-17)

Leave `SMTP_HOST` empty for **console fallback** (invite body is logged on the server). Dummy values from `.env.example` (`example.com`, `dummy-smtp-password`) do **not** count as configured.

**Local Mailpit** (catch mail in a web UI, no real inbox):

```bash
docker compose --profile mail up -d mailpit
```

Then in `.env` (not the example.com placeholders):

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=PeopleGraph <invites@localhost>
SMTP_USE_TLS=false
SMTP_USE_SSL=false
SMTP_USER=
SMTP_PASSWORD=
```

Open http://localhost:8025 after sending an invite with an email address.

**Gmail:** app password + `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USE_TLS=true`, real `SMTP_FROM` / `SMTP_USER`. Restart the API after changing `.env`. `GET /health` → `smtp_configured: true`.

## Backups and photos (SCRUM-18)

```bash
.venv/bin/python scripts/backup.py --out backups/
# restore (writes graph + local photos; requires confirmation)
.venv/bin/python scripts/restore.py backups/<timestamp> --yes
```

- **Neo4j Desktop / Aura:** the script dumps spaces, users, memberships, people, relationships, claims, and invites by UUID. Backup folders include password hashes — keep them private. `backups/` is gitignored.
- **Local photos:** copied into the backup when S3 is not configured. Docker Compose mounts `photo_data` at `/app/uploads/photos` so photos survive `docker compose down`. **`docker compose down -v` deletes that volume.**
- **S3/R2:** set `S3_*` (see PHASE4.md). Objects stay in the bucket across deploys; the backup manifest records `storage: s3`.
- Cron example: `0 3 * * * cd /path/to/PeopleGraph && .venv/bin/python scripts/backup.py`

## Secrets

Never commit `.env`. Generate keys with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```
