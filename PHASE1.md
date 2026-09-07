# PeopleGraph Phase 1 — Auth, invites, multi-tenant spaces

## What shipped

Private kinship graphs with:

- **Invite-only registration** (after first bootstrap user)
- **Signed auth tokens** (`Authorization: Bearer <token>`) via itsdangerous
- **Spaces** (tenant = one kinship graph)
- **Roles**: `owner` | `editor` | `viewer`
- **UUID** ids for User, Space, Person, Invite
- All person/relationship APIs **scoped by `spaceId` + membership**

Legacy unauthenticated `/api/persons` routes are removed. Use space-scoped routes.

## Quick start

```bash
source .venv/bin/activate
# ensure .env has NEO4J_* and SECRET_KEY / JWT_SECRET
python3 app.py
```

Auth tokens are signed with Flask/`itsdangerous` (no extra JWT package required).
### 1. Bootstrap first owner (only when DB has zero users)

```bash
curl -s -X POST http://localhost:8010/api/auth/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "you@example.com",
    "password": "password123",
    "name": "You",
    "spaceName": "Our Family"
  }'
```

Save `data.token` and `data.space.id`.

### 2. Create an invite

```bash
TOKEN=...   # from bootstrap
SPACE=...   # space id

curl -s -X POST http://localhost:8010/api/spaces/$SPACE/invites \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"role": "editor"}'
```

### 3. Register with invite

```bash
curl -s -X POST http://localhost:8010/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "cousin@example.com",
    "password": "password123",
    "name": "Cousin",
    "inviteToken": "TOKEN_FROM_INVITE"
  }'
```

### 4. Use space-scoped graph APIs

```bash
curl -s http://localhost:8010/api/spaces/$SPACE/persons \
  -H "Authorization: Bearer $TOKEN"
```

## Endpoint map

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/api/auth/bootstrap` | none | First user only |
| POST | `/api/auth/register` | invite token | Invite-only |
| POST | `/api/auth/login` | none | Returns JWT |
| GET | `/api/auth/me` | JWT | User + spaces |
| PATCH | `/api/auth/me` | JWT | Change name, email, password (current password required) |
| GET/POST | `/api/spaces` | JWT | List / create |
| GET/PATCH | `/api/spaces/<id>` | member / owner | Detail + members |
| GET/POST | `/api/spaces/<id>/invites` | owner | Create/list invites |
| POST | `/api/spaces/<id>/invites/<inviteId>/revoke` | owner | Revoke |
| GET | `/api/invites/<token>` | none | Preview invite |
| GET/POST | `/api/spaces/<id>/persons` | viewer / editor | CRUD |
| GET/PUT/DELETE | `/api/spaces/<id>/persons/<personId>` | viewer / editor | |
| POST/DELETE | `.../persons/<id>/upload-photo` etc. | editor | |
| GET/POST | `/api/spaces/<id>/relationships` | viewer / editor | |
| GET/POST | `/api/spaces/<id>/relationship-tags` | viewer / editor | Catalog of kinship types |
| PATCH/DELETE | `/api/spaces/<id>/relationship-tags/<tagId>` | editor | Custom tags; built-ins cannot be deleted |
| GET | `/api/spaces/<id>/path/<a>/<b>` | viewer | Shortest path |
| GET | `/api/spaces/<id>/stats` | viewer | |

## Data model

```
(:User)-[:MEMBER_OF {role}]->(:Space)
(:User)-[:REPRESENTS]->(:Person)
(:Person {spaceId})-[:HAS_CHILD|SPOUSE_OF|...]->(:Person {spaceId})
(:Invite {token, spaceId, role})-[:FOR_SPACE]->(:Space)
```

## Frontend note

`family-tree-radial-v2.html` (now in `legacy/`) still called the old unauthenticated API. Phase 2 added login/invite UI and space-scoped endpoints with JWT.

## Security checklist (before public deploy)

- [x] Set strong `SECRET_KEY` and `JWT_SECRET` ([SCRUM-15](https://ajith.atlassian.net/browse/SCRUM-15); app refuses weak keys when `FLASK_DEBUG=false`)
- [ ] Set `FLASK_DEBUG=false`
- [ ] Restrict `CORS_ORIGINS`
- [x] Ensure `.env` is gitignored (tracked dummy `.env` removed; `.env.example` only)
- [ ] Use HTTPS and managed Neo4j backups
