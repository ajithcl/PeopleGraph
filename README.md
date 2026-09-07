# PeopleGraph

Private, invite-only kinship graphs. Relatives join a family space and see how they connect — not a public social network.

## Stack

- **API:** Flask (`peoplegraph/`, `app.py` → `create_app()`)
- **Graph:** Neo4j (`:Person` and `:Space` are space-scoped; roles `owner` | `editor` | `viewer`)
- **App:** Vite + React + Tailwind + D3 in `frontend/`
- **Auth:** first-user bootstrap, then invite-only register; Bearer tokens (`itsdangerous`)

Flask serves `frontend/dist` when built. Graph APIs are always space-scoped: `/api/spaces/<spaceId>/...`.

## Run locally

Prefer `.venv` — system Python may not have dependencies.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env   # then set Neo4j password and signing keys
.venv/bin/python app.py          # http://localhost:8010
```

SPA (optional hot reload):

```bash
cd frontend && npm install && npm run dev   # http://localhost:5173 proxies /api
```

Production-style (gunicorn + HTTPS):

```bash
cd frontend && npm run build
docker compose up --build -d     # https://localhost  — see DEPLOY.md
```

Health: `GET /health` → `phase: 7`, `frontend: spa` when `frontend/dist` exists.

## First-time setup

1. Copy `.env.example` to `.env`. Set `NEO4J_*`, and generate two different long keys:
   `python -c "import secrets; print(secrets.token_urlsafe(48))"` for `SECRET_KEY` and `JWT_SECRET`.
2. Start Neo4j (Desktop or Docker) on the bolt URL in `.env`.
3. Open the app and use **Create first family** (bootstrap) once. After that, registration requires an invite.
4. After invite signup, each person **claims who they are** on the graph (`needsClaim`). The bootstrap owner is auto-claimed.

Do not commit `.env`. Dummy values in `.env.example` must not be used in production (`FLASK_DEBUG=false` refuses weak/identical keys).

## How families use it

1. Owner invites a relative (email if SMTP is configured, otherwise copy / Share / WhatsApp).
2. Relative opens `/?invite=…`, creates an account, then confirms their listing (photo, nickname, year of birth, relatives).
3. Explorer: search recenters the tree, path finder typeahead, **How am I related?** on a profile, generation rings on the canvas.
4. **Account** (header) changes sign-in name, email, and password. That is separate from who you are on the family tree.
5. **Tags** (header) manages kinship types used by Add Link — built-in plus custom names like cousin.

SMTP is optional (console fallback, or Mailpit/Gmail in `DEPLOY.md`). Backups: `scripts/backup.py` / `scripts/restore.py`.

## Tests

```bash
.venv/bin/pip install pytest
.venv/bin/pytest
```

Unit tests do not need Neo4j. API tests create a throwaway `SCRUM26-test-*` space using `owner@peoplegraph.local` / `password123` when that account exists, then delete it.

## Docs

| Doc | What it covers |
|-----|----------------|
| [DEPLOY.md](DEPLOY.md) | Docker, Caddy HTTPS, SMTP, backups |
| [PHASE1.md](PHASE1.md)–[PHASE6.md](PHASE6.md) | Shipped phases |
| [PHASE7.md](PHASE7.md) | Pilot UX backlog |
| [STATUS.md](STATUS.md) | Current Jira focus |
| [legacy/](legacy/) | Archived Babel-in-browser HTML (`/legacy` is retired) |

## License

Private family project. Not a general social product.
