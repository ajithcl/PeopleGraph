# PeopleGraph — STATUS

Last updated: 2026-09-06

## Current focus

- **Next:** Phase 7 stories **SCRUM-21–SCRUM-35** are implemented (skip **SCRUM-25**, already Done). Remaining work is live family use, SMTP for real mail, and public HTTPS/DNS — not more backlog tickets unless the pilot files them.
- **Epic hygiene:** [SCRUM-31](https://ajith.atlassian.net/browse/SCRUM-31) is the Phases 1–6 reference epic.

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
| [SCRUM-31](https://ajith.atlassian.net/browse/SCRUM-31) | Shipped — Phases 1–6 (reference) | Lowest | Done |

### Stories by epic

**SCRUM-6 — Pilot & migration**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-12](https://ajith.atlassian.net/browse/SCRUM-12) | Run legacy Person → space migration for pilot family | Highest | Done |
| [SCRUM-13](https://ajith.atlassian.net/browse/SCRUM-13) | Family pilot: invite relatives, claim profiles, validate paths | Highest | Done |
| [SCRUM-14](https://ajith.atlassian.net/browse/SCRUM-14) | Collect pilot feedback into Phase 7 backlog items | High | Done |

**SCRUM-9 — Production deploy**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-15](https://ajith.atlassian.net/browse/SCRUM-15) | Rotate production secrets (SECRET_KEY / JWT_SECRET) | Highest | Done |
| [SCRUM-16](https://ajith.atlassian.net/browse/SCRUM-16) | Deploy Docker/gunicorn stack with HTTPS | Highest | Done |
| [SCRUM-18](https://ajith.atlassian.net/browse/SCRUM-18) | Neo4j backup strategy + durable photo storage | High | Done |
| [SCRUM-17](https://ajith.atlassian.net/browse/SCRUM-17) | Enable SMTP for invite email delivery | Medium | Done |

**SCRUM-7 — Invite & growth UX**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-19](https://ajith.atlassian.net/browse/SCRUM-19) | Invite status list + revoke unused invites | High | Done |
| [SCRUM-20](https://ajith.atlassian.net/browse/SCRUM-20) | WhatsApp / native share for invite links | High | Done |
| [SCRUM-21](https://ajith.atlassian.net/browse/SCRUM-21) | Polish claim onboarding copy and empty states | Medium | Done |
| [SCRUM-32](https://ajith.atlassian.net/browse/SCRUM-32) | Confirm claim and disambiguate people with the same name | High | Done |
| [SCRUM-35](https://ajith.atlassian.net/browse/SCRUM-35) | Invite join screen: magic-link first, hide raw token | High | Done |

**SCRUM-5 — Visualization**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-22](https://ajith.atlassian.net/browse/SCRUM-22) | Multi-hop / multi-generation radial tree view | High | Done |
| [SCRUM-23](https://ajith.atlassian.net/browse/SCRUM-23) | Path-centric tree highlight & focus | High | Done |
| [SCRUM-33](https://ajith.atlassian.net/browse/SCRUM-33) | Searchable typeahead for path-finder From/To pickers | High | Done |
| [SCRUM-34](https://ajith.atlassian.net/browse/SCRUM-34) | “How am I related?” action on person profile | High | Done |

**SCRUM-8 — Mobile & SPA**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-24](https://ajith.atlassian.net/browse/SCRUM-24) | Mobile layout for kinship explorer & modals | High | Done |
| [SCRUM-25](https://ajith.atlassian.net/browse/SCRUM-25) | Touch pan/zoom for radial family tree | Medium | Done |

**SCRUM-10 — Testing, docs & cleanup**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-26](https://ajith.atlassian.net/browse/SCRUM-26) | Automated tests: auth, space isolation, claim rules | High | Done |
| [SCRUM-27](https://ajith.atlassian.net/browse/SCRUM-27) | Update README for production SPA + auth | Medium | Done |
| [SCRUM-28](https://ajith.atlassian.net/browse/SCRUM-28) | Archive legacy Babel-in-browser HTML UI | Low | Done |

**SCRUM-11 — Later**

| Key | Summary | Priority | Status |
|-----|---------|----------|--------|
| [SCRUM-29](https://ajith.atlassian.net/browse/SCRUM-29) | Space activity timeline for kinship edits | Low | Done |
| [SCRUM-30](https://ajith.atlassian.net/browse/SCRUM-30) | Notification hooks for invites (and later claims) | Low | Done |

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

- Phases **1–6** shipped (see `PHASE1.md`–`PHASE6.md`); Phase 7 UX in `PHASE7.md` and this STATUS
- [SCRUM-21](https://ajith.atlassian.net/browse/SCRUM-21)–[SCRUM-24](https://ajith.atlassian.net/browse/SCRUM-24), [SCRUM-26](https://ajith.atlassian.net/browse/SCRUM-26)–[SCRUM-35](https://ajith.atlassian.net/browse/SCRUM-35): claim confirm + family copy, magic-link register, multi-generation tree, path highlight/typeahead/How am I related, mobile layout, pytest, README, archived HTML, activity feed, invite/claim notification hooks
- [SCRUM-12](https://ajith.atlassian.net/browse/SCRUM-12): legacy Person nodes assigned to space `Test Family` (`b11fde03-0e07-4249-b1ed-62939ab52a4c`)
- [SCRUM-15](https://ajith.atlassian.net/browse/SCRUM-15): rotated local signing keys; `.env` untracked; production boot refuses dummy `SECRET_KEY` / `JWT_SECRET`
- [SCRUM-16](https://ajith.atlassian.net/browse/SCRUM-16): gunicorn + Caddy HTTPS via Docker Compose (`DEPLOY.md`)
- [SCRUM-17](https://ajith.atlassian.net/browse/SCRUM-17)–[SCRUM-20](https://ajith.atlassian.net/browse/SCRUM-20): SMTP, backups, invite list/revoke, WhatsApp/share
- Repo: https://github.com/ajithcl/PeopleGraph (`master`)

## How to run

```bash
# Local API (no proxy)
.venv/bin/python app.py          # http://localhost:8010

# Production-style (gunicorn + HTTPS)
docker compose up --build -d     # https://localhost  (see DEPLOY.md)

# Frontend hot reload (optional)
cd frontend && npm run dev       # http://localhost:5173

# Tests
.venv/bin/pytest
```

- Health: `GET /health` → `phase: 7`, `frontend: spa` when `frontend/dist` exists (Compose builds the SPA into the image)
- Test account from earlier smoke tests (if still present): `owner@peoplegraph.local` / `password123`

## Env / secrets

- Local `.env` is **gitignored** (untracked). It has Neo4j credentials plus rotated `SECRET_KEY` / `JWT_SECRET` — do not commit or paste them
- Repo only has `.env.example` with dummy placeholders
- With `FLASK_DEBUG=false`, the app refuses to start if signing keys are missing, short, dummy, or identical ([SCRUM-15](https://ajith.atlassian.net/browse/SCRUM-15))
- Rotating `JWT_SECRET` invalidates existing login tokens; sign in again

## Resume prompt (paste in a new Agent chat)

> Read `STATUS.md`, `PHASE7.md`, `DEPLOY.md`, and `.cursor/rules/peoplegraph.mdc`. Phase 7 stories 21–35 are implemented. Next is live family use (real SMTP + public HTTPS) unless new pilot tickets appear.

## Family pilot notes (SCRUM-13)

- Owner `owner@peoplegraph.local` now claims the **real** migrated “Ajith kumar CL” (bootstrap duplicate + leftover Tester node deleted).
- Path finder only walks `:Person` nodes in the same space (no User/Space shortcuts). Legacy `SIBLING` / `SPOUSE` / `FRIEND` types get the same explanations as `*_OF`.
- Dress rehearsal: 3 invited accounts registered, 2 claimed existing people (Anuja CL, Ishaani Ajith), 1 claimed new + `FRIEND_OF` link; path explanations validated (1-hop sibling/parent/friend, 2-hop aunt, 3-hop Ammukutty → Ishaani). Claims on real people were released; rehearsal users deleted.
- UX friction from that rehearsal is the Phase 7 backlog ([PHASE7.md](PHASE7.md) / [SCRUM-14](https://ajith.atlassian.net/browse/SCRUM-14)).
- SMTP is optional: empty/dummy `.env` → console log; Mailpit or Gmail in `DEPLOY.md`. Share from **Invite** (copy / Share / WhatsApp). Local HTTPS is [SCRUM-16](https://ajith.atlassian.net/browse/SCRUM-16).
