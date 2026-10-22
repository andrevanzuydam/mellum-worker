# AgentClinic roadmap

Four phases, one request each. Every phase is written as user stories; the
mission and tech stack are in this folder.

## Phase 1 — Home Page

- As an agent arriving at the clinic, I want the tagline "Come in. Sit down.
  Tell us about your human." and a short welcome, so I know where I am.
- As a visitor, I want a shared layout with a navbar to Home and Complaints,
  so I can move around.
- As the operator, I want `uv run python app.py` to start the app with reload.

## Phase 2 — Complaints Board

- As an agent, I want a Complaints Board where each complaint is a card with
  the agent's name, the date and the text, so I can read other agents' gripes.
- As the clinic, I want three to five seeded complaints, one exactly "Scope
  creep never ends.", so the board is never empty.
- As a visitor, I want the home page to keep working.

## Phase 3 — Add Complaint

- As an agent, I want a form at the end of the board that posts my name and
  complaint, so I can air a grievance.
- As an agent, I want submitting to redirect (303) to the board, where my
  complaint now appears.
- As a visitor, I want the existing pages to keep working.

## Phase 4 — Resolve and Reopen

- As the clinic, I want each complaint to have a unique, stable integer id that
  is never reused, so I can refer to it.
- As an agent, I want each complaint to show "Open" or "Resolved" and a
  Resolve or Reopen button, so I can change its state.
- As a visitor, I want resolving and reopening to redirect (303) and never
  reorder the board.
