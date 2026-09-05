# PeopleGraph Phase 5 — Claim Person profile onboarding

## What shipped

After invite signup, users no longer get an automatic duplicate Person. They **claim who they are** on the kinship graph:

1. **I'm already listed** — search unclaimed people → Claim  
2. **Add me as new** — create a Person and claim it  

Owners/bootstrap still get an auto-created Person.

### API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/spaces/<id>/profile/me` | Your claimed person / `needsClaim` |
| GET | `/api/spaces/<id>/profile/claimable?query=` | Unclaimed (or self-claimed) people |
| POST | `/api/spaces/<id>/profile/claim` | `{ personId }` claim existing |
| POST | `/api/spaces/<id>/profile/claim/new` | Create + claim |
| DELETE | `/api/spaces/<id>/profile/claim` | Unclaim (Person kept) |
| GET | `/api/auth/me?spaceId=` | Includes `needsClaim`, `personName`, `claimsBySpace` |

### Rules

- One User claim per Person (other accounts cannot steal a claimed Person)
- One claimed Person per User **per space** (re-claim replaces previous link)
- Register via invite → `needsClaim: true` → onboarding UI before the graph

### UI

- Claim screen after login/register when no claim
- Header shows **graph profile: Name**
- **Who I am** reopens claim flow

## Try it

1. Restart: `.venv/bin/python app.py`
2. As owner, invite a relative
3. Register with invite → claim flow appears
4. Pick an existing person (after migrate) or create new

## Health

`GET /health` → `phase: 5`
