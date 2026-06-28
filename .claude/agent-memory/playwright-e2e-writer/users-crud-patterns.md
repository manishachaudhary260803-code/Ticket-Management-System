---
name: users-crud-patterns
description: Selectors, modal discovery strategy, and test isolation patterns for the Users page CRUD E2E tests
metadata:
  type: project
---

## Modal discovery

The three Users page modals are **custom backdrop divs**, not Radix Dialog — they have no `role="dialog"`. Locate them by `data-testid`:

| Modal  | data-testid              |
|--------|--------------------------|
| Create | `modal-backdrop`         |
| Edit   | `edit-modal-backdrop`    |
| Delete | `delete-modal-backdrop`  |

When a modal unmounts (`component returns null`), `not.toBeVisible()` passes correctly in Playwright.

## Form field IDs

**Create modal** — label `htmlFor` + input `id` pairs:
- `name` / `email` / `password` / `role`

**Edit modal** — prefixed to avoid conflicts:
- `edit-name` / `edit-email` / `edit-password` / `edit-role`

The edit password label includes a span: "New Password (leave blank to keep current)" — use `getByLabel(/new password/i)` or scope to the modal and use `getByLabel("New Password")` — but in practice the edit test does not fill the password field (leaving it blank keeps the current password).

## Role select

Both modals use a native `<select>` element. Option `value` attributes are **lowercase**: `"agent"` / `"admin"`. Use `selectOption("agent")` not `selectOption("Agent")`.

## Table buttons

- Edit: `getByRole("button", { name: \`Edit ${user.name}\` })`
- Delete: `getByRole("button", { name: \`Delete ${user.name}\` })`  
  (Delete button is only rendered for non-admin users — `user.role !== "admin"`)

The confirm Delete button inside the delete modal has no aria-label — just button text "Delete". Scope to the modal before clicking to avoid ambiguity with the row-level trash icon.

## Test isolation strategy

Each mutating test calls `makeUser()` which uses `Date.now()` for a unique email (`e2e.{ts}@test.local`) and name (`E2E User {ts}`). No two tests share user data.

For **Edit** tests: the `updatedName` must use a clearly different prefix (e.g., `Renamed ${ts}`) so the original name is not a substring of the updated name — otherwise `getByText(originalName).not.toBeVisible()` could falsely pass if Playwright matched a substring in the new name.

## Shared helper

`createUserViaModal(page, user)` is a local helper in `users.spec.ts` that opens the Add User modal, fills all fields, submits, and waits for the modal to unmount and the new row to appear. Used as a prerequisite step in both Edit and Delete tests to avoid duplicating UI setup.

**Why:** The Edit and Delete tests need a fresh user that definitely exists — creating via UI also exercises the Create flow as a side effect without any direct API calls.

**How to apply:** Copy this pattern for other spec files that need to set up a prerequisite via the UI before testing a secondary operation.
