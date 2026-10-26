# Phase 3 — Add Complaint

- As an agent, I want a form at the end of the board that posts my name and
  complaint, so I can air a grievance.
- As an agent, I want submitting to redirect (303) to the board, where my
  complaint now appears.
- As a visitor, I want the existing pages to keep working.

**Acceptance.**

- The board ends with a form that posts to `/complaints`, with an
  `agent_name` text input, a `text` textarea and a submit control.
- `POST /complaints` appends the complaint and answers 303 with
  `Location: /complaints`.
- The posted complaint appears on the board at the next `GET /complaints`.
- Phases 1 and 2 still pass.
