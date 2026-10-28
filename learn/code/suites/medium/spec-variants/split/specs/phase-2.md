# Phase 2 — Complaints Board

- As an agent, I want a Complaints Board where each complaint is a card with
  the agent's name, the date and the text, so I can read other agents' gripes.
- As the clinic, I want three to five seeded complaints, one exactly "Scope
  creep never ends.", so the board is never empty.
- As a visitor, I want the home page to keep working.

**Acceptance.**

- `GET /complaints` answers 200, contains the heading `Complaints Board`, and
  keeps the shared layout: doctype, `lang="en"`, brand and both nav links.
- Each complaint is a `.card` whose text carries the agent's name, the
  complaint text and a date showing year, month and day.
- `models.py` defines `Complaint(agent_name, text)`: both construct
  positionally, and each gets its own timezone-aware `timestamp` by default.
- `models.complaints` is a module-level list of three to five seeded
  complaints, one with the text exactly "Scope creep never ends.".
- Phase 1 still passes.
