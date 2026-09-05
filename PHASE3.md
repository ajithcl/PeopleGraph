# PeopleGraph Phase 3 — Path explanations, relationship delete, production basics

## What shipped

### Product
- **Plain-language path explanations** on `GET /api/spaces/<id>/path/<a>/<b>`
  - Returns `explanation.summary`, `explanation.hops`, and `steps`
  - UI shows narrative + numbered hops under “How they connect”
- **Delete relationship** — `DELETE /api/spaces/<id>/relationships` with `{fromId,toId,type}`
  - Profile modal unlink button for editors/owners

### Ops / data
- [Dockerfile](Dockerfile) + [docker-compose.yml](docker-compose.yml)
- [gunicorn.conf.py](gunicorn.conf.py) for multi-worker serving
- [migrate_legacy_persons.py](migrate_legacy_persons.py) — attach old Person nodes (no `spaceId`/UUID) to a space

## Restart & try

```bash
python3 app.py
# open http://localhost:8010/
# Path Finder → pick two people → see English explanation
```

### Migrate legacy people (optional)

```bash
python migrate_legacy_persons.py --space-id YOUR_SPACE_UUID --dry-run
python migrate_legacy_persons.py --space-id YOUR_SPACE_UUID
```

### Production-style run

```bash
# set SECRET_KEY, JWT_SECRET, NEO4J_*, FLASK_DEBUG=false in .env
gunicorn -c gunicorn.conf.py "peoplegraph:create_app()"
# or
docker compose up --build
```

## Path response shape (excerpt)

```json
{
  "success": true,
  "data": {
    "nodeIds": ["…", "…"],
    "length": 2,
    "steps": [
      {"fromName": "Ajith", "toName": "Parent", "type": "CHILD_OF", "outgoing": true}
    ],
    "explanation": {
      "summary": "Ajith and Cousin are connected through 2 relationships: …",
      "hops": ["Ajith is a child of Parent", "…"],
      "degree": 2
    }
  }
}
```

## Next (Phase 4 ideas)

- Object storage (S3/R2) for photos
- Vite/React app build (leave in-browser Babel)
- Email invite delivery
- Activity log inside a space
