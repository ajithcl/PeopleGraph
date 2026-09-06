# PeopleGraph Phase 7 — Pilot feedback backlog

Captured 2026-09-06 as [SCRUM-14](https://ajith.atlassian.net/browse/SCRUM-14).

Phase 7 is **not a feature drop**. It is the work after Phases 1–6 to get a real family onto the graph and to fix the friction that shows up when they try: claim, invite, and tree/path.

## Source

- **SCRUM-12** (Done): legacy Person → space migrate for **Test Family** (112 people).
- **SCRUM-13** (Done): dress rehearsal — 3 invited accounts, claim existing + new, path explanations (1–3 hops). Real-relative claims were released afterward.
- **This review:** SPA walkthrough of claim / invite / explorer plus the rehearsal notes (not a public social product).

## Themes

### 1. Claim confusion

After invite signup the user is blocked until they claim a Person. That is the right product rule; the UI is easy to get wrong.

| Friction | Ticket |
|----------|--------|
| “Who are you on the graph?”, **Claim**, **graph profile**, **Root Person** are jargon | [SCRUM-21](https://ajith.atlassian.net/browse/SCRUM-21) |
| **Add me as new** omits nickname / DOB / photo even though the API accepts them | [SCRUM-21](https://ajith.atlassian.net/browse/SCRUM-21) |
| No success confirmation after claim; profile shows a raw UUID | [SCRUM-21](https://ajith.atlassian.net/browse/SCRUM-21) |
| One-click claim; list is name + nickname only. Rehearsal found **two Ajith nodes**; the owner had to be moved onto the real migrated person | [SCRUM-32](https://ajith.atlassian.net/browse/SCRUM-32) |
| **Who I am** unclaims immediately with no confirm | [SCRUM-32](https://ajith.atlassian.net/browse/SCRUM-32) |

### 2. Invite steps

Owners generate a link; relatives must register with it. SMTP is optional (console fallback, or Mailpit/Gmail — [DEPLOY.md](DEPLOY.md)).

| Friction | Ticket |
|----------|--------|
| No pending/used/expired list; fumbled signup burns a single-use invite | [SCRUM-19](https://ajith.atlassian.net/browse/SCRUM-19) **Done** |
| Share is Copy + `alert()` — no WhatsApp / native share | [SCRUM-20](https://ajith.atlassian.net/browse/SCRUM-20) **Done** |
| Register always shows an **Invite token** field even when `?invite=` is already in the URL | [SCRUM-35](https://ajith.atlassian.net/browse/SCRUM-35) |
| SMTP off in rehearsal — share the UI link; `localhost` only works on this machine | [SCRUM-17](https://ajith.atlassian.net/browse/SCRUM-17) **Done** / [SCRUM-16](https://ajith.atlassian.net/browse/SCRUM-16) |

### 3. Tree / path usability

The product promise is “see how we connect.” The canvas only shows 1-hop spokes (max 24) around a root. Path Finder uses two native `<select>`s of the entire space.

| Friction | Ticket |
|----------|--------|
| Native From/To dropdowns do not scale past a handful of people | [SCRUM-33](https://ajith.atlassian.net/browse/SCRUM-33) |
| No one-tap “How am I related?” from a profile | [SCRUM-34](https://ajith.atlassian.net/browse/SCRUM-34) |
| Grandparents / cousins not on the current spoke disappear | [SCRUM-22](https://ajith.atlassian.net/browse/SCRUM-22) |
| Path highlight only restyles 1-hop spokes; search does not re-root | [SCRUM-23](https://ajith.atlassian.net/browse/SCRUM-23) |
| Explorer / modals on a phone | [SCRUM-24](https://ajith.atlassian.net/browse/SCRUM-24) |
| Pinch pan/zoom on the SVG tree | [SCRUM-25](https://ajith.atlassian.net/browse/SCRUM-25) **Done** |

## Suggested order (after this story)

Pilot-facing UX first, then ops that unblock sharing:

1. [SCRUM-32](https://ajith.atlassian.net/browse/SCRUM-32) + [SCRUM-21](https://ajith.atlassian.net/browse/SCRUM-21) — claim without picking the wrong cousin
2. [SCRUM-35](https://ajith.atlassian.net/browse/SCRUM-35) + [SCRUM-20](https://ajith.atlassian.net/browse/SCRUM-20) + [SCRUM-19](https://ajith.atlassian.net/browse/SCRUM-19) — invite a relative without a token form
3. [SCRUM-33](https://ajith.atlassian.net/browse/SCRUM-33) + [SCRUM-34](https://ajith.atlassian.net/browse/SCRUM-34) + [SCRUM-23](https://ajith.atlassian.net/browse/SCRUM-23) — find a path on a large graph
4. [SCRUM-22](https://ajith.atlassian.net/browse/SCRUM-22) / [SCRUM-24](https://ajith.atlassian.net/browse/SCRUM-24) / [SCRUM-25](https://ajith.atlassian.net/browse/SCRUM-25) — deeper tree + mobile
5. Parallel Highest ops: [SCRUM-15](https://ajith.atlassian.net/browse/SCRUM-15) → [SCRUM-16](https://ajith.atlassian.net/browse/SCRUM-16)

## Not new tickets

These stayed as notes, not extra stories:

- Gender is still male/female only (claim + add person) — fold into a later profile-fields story if the pilot asks.
- Editors cannot create invites (owner-only) — called out on SCRUM-19; do not change unless the family needs it.
- Activity / notifications remain [SCRUM-11](https://ajith.atlassian.net/browse/SCRUM-11) (Phase 8-ish).
