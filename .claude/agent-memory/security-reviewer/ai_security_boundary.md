---
name: ai-security-boundary
description: Where the human-approval gate for AI draft replies is enforced architecturally
metadata:
  type: project
---

## AI Draft Reply Security Boundary

The constraint "AI draft replies require human approval before sending — never fully automatic" is enforced at the data model level:

- `Ticket.ai_draft_reply` (server/app/models/ticket.py) is a plain `Text` column — storing the draft, not triggering a send.
- There is no auto-send mechanism in the current codebase (email/SMTP code not yet implemented).
- The security gate must be enforced when the send-reply endpoint is built: the endpoint must require an explicit agent action (e.g., a `POST /api/tickets/{id}/reply` with `approved: true`) and must NOT allow the AI draft to bypass this step.

**When reviewing future email/send-reply code, verify:**
1. The send endpoint is protected by `get_current_user` (at minimum) — students cannot trigger sends.
2. No background job or AI callback can call the send path without an agent session.
3. The `ai_draft_reply` field is treated as editable by the agent before sending — it is not a read-only auto-send payload.
4. Sent email content is logged for audit purposes (important for student communication accountability).
