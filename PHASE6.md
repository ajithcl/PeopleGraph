# PeopleGraph Phase 6 — Vite / React frontend (Option A)

## What shipped

Replaced the Babel-in-browser single HTML app with a proper **Vite + React + Tailwind** SPA under `frontend/`.

- Auth (login / invite register / bootstrap)
- Claim Person onboarding
- Kinship explorer, path finder, D3 radial tree, invites, add/edit person & relationships
- Flask serves `frontend/dist` when built; the old HTML explorer is archived under `legacy/` (`/legacy` returns 410)
- Legacy UI still available at `/legacy`

## Dev workflow

**Terminal 1 — API**

```bash
.venv/bin/python app.py
```

**Terminal 2 — Vite (hot reload, proxies `/api` + `/uploads` → :8010)**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Production / single-port

```bash
cd frontend && npm run build
.venv/bin/python app.py
```

Open http://localhost:8010 — Flask serves the SPA from `frontend/dist`.

`GET /health` reports `"phase": 6` and `"frontend": "spa"` or `"legacy-html"`.

## Layout

| Path | Role |
|------|------|
| `frontend/src/api.js` | Auth session + space-scoped API client |
| `frontend/src/App.jsx` | Boot, auth routing, claim gate |
| `frontend/src/components/` | Screens, modals, D3 `FamilyTree` |
| `peoplegraph/factory.py` | Serves dist + `/legacy` |

## Notes

- CORS defaults include `http://localhost:5173` for Vite.
- Optional `VITE_API_BASE` if the API is on another origin (leave empty when using the Vite proxy or same-origin Flask).
- The old HTML file is kept for rollback; prefer the SPA going forward.
