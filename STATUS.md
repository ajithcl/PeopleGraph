# PeopleGraph — STATUS

Last updated: 2026-09-06

## Current focus

- **Next story:** [SCRUM-12](https://ajith.atlassian.net/browse/SCRUM-12) — Run legacy Person → space migration for pilot family (**Highest**, To Do)
- **Epic:** [SCRUM-6](https://ajith.atlassian.net/browse/SCRUM-6) — Pilot & legacy data migration
- **Then (Highest):** [SCRUM-13](https://ajith.atlassian.net/browse/SCRUM-13) → [SCRUM-15](https://ajith.atlassian.net/browse/SCRUM-15) → [SCRUM-16](https://ajith.atlassian.net/browse/SCRUM-16)

## Jira

| | |
|---|---|
| **Site** | https://ajith.atlassian.net |
| **Project** | `SCRUM` — “My Software Team” (team-managed) |
| **Board** | https://ajith.atlassian.net/jira/software/projects/SCRUM/boards/1 |
| **Label** | `peoplegraph` (all PeopleGraph work) |
| **MCP** | Atlassian Rovo (`user-atlassian`) — connected in Cursor |

**Filter (all PeopleGraph work):**

```
project = SCRUM AND labels = peoplegraph ORDER BY priority DESC, key ASC
```

**Next open stories:**

```
project = SCRUM AND labels = peoplegraph AND issuetype = Story AND statusCategory != Done ORDER BY priority DESC, key ASC
```

### Epics

| Key | Epic | Priority | Status |
|-----|------|----------|--------|
| [SCRUM-6](https://ajith.atlassian.net/browse/SCRUM-6) | Pilot & legacy data migration | Highest | To Do |
| [SCRUM-9](https://ajith.atlassian.net/browse/SCRUM-9) | Production deploy & ops hardening | Highest | To Do |
| [SCRUM-7](https://ajith.atlassian.net/browse/SCRUM-7) | Invite & growth UX | High | To Do |
| [SCRUM-5](https://ajith.atlassian.net/browse/SCRUM-5) | Richer kinship visualization | High | To Do |
| [SCRUM-8](https://ajith.atlassian.net/browse/SCRUM-8) | Mobile & SPA polish | Medium | To Do |
| [SCRUM-10](https://ajith.atlassian.net/browse/SCRUM-10) | Testing, docs & cleanup | Medium | To Do |
| [SCRUM-11](https://ajith.atlassian.net/browse/SCRUM-11) | Activity & notifications (later) | Low | To Do |
| [SCRUM-31](https://ajith.atlassian.net/browse/SCRUM-31) | Shipped — Phases 1–6 (reference) | Lowest | To Do |

### Stories by epic

**SCRUM-6 — Pilot & migration**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-12](https://ajith.atlassian.net/browse/SCRUM-12) | Run legacy Person → space migration for pilot family | Highest | To Do |
| [SCRUM-13](https://ajith.atlassian.net/browse/SCRUM-13) | Family pilot: invite relatives, claim profiles, validate paths | Highest | To Do |
| [SCRUM-14](https://ajith.atlassian.net/browse/SCRUM-14) | Collect pilot feedback into Phase 7 backlog items | High | To Do |

**SCRUM-9 — Production deploy**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-15](https://ajith.atlassian.net/browse/SCRUM-15) | Rotate production secrets (SECRET_KEY / JWT_SECRET) | Highest | To Do |
| [SCRUM-16](https://ajith.atlassian.net/browse/SCRUM-16) | Deploy Docker/gunicorn stack with HTTPS | Highest | To Do |
| [SCRUM-18](https://ajith.atlassian.net/browse/SCRUM-18) | Neo4j backup strategy + durable photo storage | High | To Do |
| [SCRUM-17](https://ajith.atlassian.net/browse/SCRUM-17) | Enable SMTP for invite email delivery | Medium | To Do |

**SCRUM-7 — Invite & growth UX**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-19](https://ajith.atlassian.net/browse/SCRUM-19) | Invite status list + revoke unused invites | High | To Do |
| [SCRUM-20](https://ajith.atlassian.net/browse/SCRUM-20) | WhatsApp / native share for invite links | High | To Do |
| [SCRUM-21](https://ajith.atlassian.net/browse/SCRUM-21) | Polish claim onboarding copy and empty states | Medium | To Do |

**SCRUM-5 — Visualization**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-22](https://ajith.atlassian.net/browse/SCRUM-22) | Multi-hop / multi-generation radial tree view | High | To Do |
| [SCRUM-23](https://ajith.atlassian.net/browse/SCRUM-23) | Path-centric tree highlight & focus | High | To Do |

**SCRUM-8 — Mobile & SPA**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-24](https://ajith.atlassian.net/browse/SCRUM-24) | Mobile layout for kinship explorer & modals | High | To Do |
| [SCRUM-25](https://ajith.atlassian.net/browse/SCRUM-25) | Touch pan/zoom for radial family tree | Medium | To Do |

**SCRUM-10 — Testing, docs & cleanup**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-26](https://ajith.atlassian.net/browse/SCRUM-26) | Automated tests: auth, space isolation, claim rules | High | To Do |
| [SCRUM-27](https://ajith.atlassian.net/browse/SCRUM-27) | Update README for production SPA + auth | Medium | To Do |
| [SCRUM-28](https://ajith.atlassian.net/browse/SCRUM-28) | Archive legacy Babel-in-browser HTML UI | Low | To Do |

**SCRUM-11 — Later**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-29](https://ajith.atlassian.net/browse/SCRUM-29) | Space activity timeline for kinship edits | Low | To Do |
| [SCRUM-30](https://ajith.atlassian.net/browse/SCRUM-30) | Notification hooks for invites (and later claims) | Low | To Do |

### Other SCRUM tickets (not PeopleGraph)

| Key | Note |
|-----|------|
| SCRUM-1, SCRUM-2, SCRUM-4 | Default sample tickets |
| [SCRUM-3](https://ajith.atlassian.net/browse/SCRUM-3) | Sample “Task 3” — **Done** (closed) |

### Notes

- Dedicated Jira project named **PeopleGraph** (e.g. key `PG`) was requested but not created yet (MCP cannot create software projects). Until then, all work stays in **SCRUM** with label `peoplegraph`.
- After creating `PG`, recreate or move these issues and update this section.
- When finishing a story: transition it to **Done** in Jira and update **Current focus** above.

## What’s done (product)

- Phases **1–6** shipped (see `PHASE1.md`–`PHASE6.md`)
- Repo: https://github.com/ajithcl/PeopleGraph (`master`)

## How to run

```bash
# API
.venv/bin/python app.py          # http://localhost:8010

# Frontend hot reload (optional)
cd frontend && npm run dev       # http://localhost:5173
```

- Health: `GET /health` → `phase: 6`, `frontend: spa` when `frontend/dist` exists
- Test account from earlier smoke tests (if still present): `owner@peoplegraph.local` / `password123`

## Env / secrets

- Local `.env` has real Neo4j credentials (git skip-worktree); do not push
- Remote has dummy `.env` / `.env.example` only
- Before production: rotate `SECRET_KEY` and `JWT_SECRET` ([SCRUM-15](https://ajith.atlassian.net/browse/SCRUM-15))

## Resume prompt (paste in a new Agent chat)

> Read `STATUS.md` and `.cursor/rules/peoplegraph.mdc`. Continue with SCRUM-12 (legacy Person → space migration). Confirm dry-run first. Sync Jira status when done.
