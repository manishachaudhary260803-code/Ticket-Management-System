# Playwright E2E Writer — Memory Index

- [Test Infrastructure](infra.md) — fixtures, global-setup, teardown, test ports, seed pattern
- [Auth Spec Patterns](auth-spec-patterns.md) — selectors, error distinction, data-testid gap, sign-out pattern
- [Users CRUD Patterns](users-crud-patterns.md) — modal data-testid discovery, form field IDs, role select values, test isolation, shared createUserViaModal helper
- [Tickets Spec Patterns](tickets-spec-patterns.md) — direct pg INSERT seeding (no create API), enum casts, TicketsTable selectors, empty-state/data ordering
- [Webhook API Patterns](webhook-api-patterns.md) — header-auth endpoints use `request` fixture (not page), sentinel from_email cleanup, mixing request+adminPage, adding WEBHOOK_SECRET to server env
