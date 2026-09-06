# PeopleGraph Phase 2 — Auth UI + space-scoped frontend

## What shipped

- Login / invite register / bootstrap screens (now in `frontend/`; archived HTML in [legacy/family-tree-radial-v2.html](legacy/family-tree-radial-v2.html))
- Session stored in `localStorage` (`peoplegraph_session`)
- All graph calls use `Authorization: Bearer …` and `/api/spaces/<spaceId>/…`
- Role-aware UI: viewers explore; editors add/edit; owners invite
- **Invite** button generates a shareable `/?invite=<token>` link
- UI served by Flask at **http://localhost:8010/** (same origin as API)

## How to run

1. Restart the API (required after Phase 1/2 code changes):

```bash
# stop old process, then:
python3 app.py
```

2. Open **http://localhost:8010/** in the browser (do not open the HTML as a file:// URL).

3. Sign in with your Phase 1 bootstrap user, or use **Create account** with an invite token.

### Invite a relative

1. Sign in as **owner**
2. Click **Invite** → choose viewer/editor → **Generate invite link** → Copy
3. Relative opens the link → fills name/email/password → joins the space

## Files touched

| File | Change |
|------|--------|
| `legacy/family-tree-radial-v2.html` | Archived Babel-in-browser UI (replaced by the SPA) |
| `peoplegraph/__init__.py` | Serves `/` and `/app` UI |
| `peoplegraph/config.py` | CORS includes `:8010` |

## Next (Phase 3 ideas)

- Plain-language path explanations
- Mobile-responsive graph chrome
- Object storage for photos
- Proper React/Vite app build (leave CDN Babel behind)
