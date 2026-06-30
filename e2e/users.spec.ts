/**
 * Users page — E2E tests for CRUD operations that span the auth service and DB.
 *
 * Component rendering (loading state, user list display, role badges, dates)
 * and modal open/close behaviour are covered by UsersPage and CreateUserModal
 * component tests and do not belong here.
 *
 * Only the full create → persist → appear-in-table flow (and the equivalent
 * for edit and delete) requires a real auth service + real DB, so only those
 * live here.
 *
 * Modal discovery strategy
 * ------------------------
 * The three modals are custom backdrop <div>s — not Radix Dialog — so they
 * do not carry role="dialog".  We locate them via their data-testid:
 *   Create  →  data-testid="modal-backdrop"
 *   Edit    →  data-testid="edit-modal-backdrop"
 *   Delete  →  data-testid="delete-modal-backdrop"
 *
 * Test isolation
 * --------------
 * Each mutating test creates its own user with a timestamp-derived email so
 * tests never step on each other or on the seeded admin / agent accounts.
 */

import { test, expect } from "./fixtures"

/** Returns unique user data for a single test run. */
function makeUser() {
  const ts = Date.now()
  return {
    name: `E2E User ${ts}`,
    email: `e2e.${ts}@test.local`,
    password: "TestE2E@Secure2024!",
    // Matches the native <select> option value (lowercase)
    role: "agent" as const,
  }
}

/**
 * Fill the Add User form inside the create modal and submit it.
 * Extracted to avoid copy-paste in Edit and Delete tests that need
 * to create a user as a prerequisite step.
 */
async function createUserViaModal(
  adminPage: import("@playwright/test").Page,
  user: ReturnType<typeof makeUser>,
) {
  await adminPage.getByRole("button", { name: "Add User" }).click()
  const modal = adminPage.getByTestId("modal-backdrop")
  await modal.getByLabel("Name").fill(user.name)
  await modal.getByLabel("Email").fill(user.email)
  await modal.getByLabel("Password").fill(user.password)
  await modal.getByLabel("Role").selectOption(user.role)
  await modal.getByRole("button", { name: "Create User" }).click()
  // Wait for the modal to unmount before proceeding
  await expect(adminPage.getByTestId("modal-backdrop")).not.toBeVisible()
  // Wait for the new row to appear in the table
  await expect(adminPage.getByText(user.email)).toBeVisible()
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

test.describe("Users page — Create", () => {
  test("filling the Add User form and submitting adds the new user to the table", async ({
    adminPage,
  }) => {
    const user = makeUser()

    await adminPage.goto("/users")

    // Open the create modal via the primary action button
    await adminPage.getByRole("button", { name: "Add User" }).click()

    const modal = adminPage.getByTestId("modal-backdrop")
    await expect(modal.getByRole("heading", { name: "Add User" })).toBeVisible()

    // Fill in every field
    await modal.getByLabel("Name").fill(user.name)
    await modal.getByLabel("Email").fill(user.email)
    await modal.getByLabel("Password").fill(user.password)
    // The Role field is a native <select>; option values are lowercase
    await modal.getByLabel("Role").selectOption(user.role)

    await modal.getByRole("button", { name: "Create User" }).click()

    // Modal unmounts on success
    await expect(adminPage.getByTestId("modal-backdrop")).not.toBeVisible()

    // New user is visible in the refreshed table
    await expect(adminPage.getByText(user.name)).toBeVisible()
    await expect(adminPage.getByText(user.email)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

test.describe("Users page — Edit", () => {
  test("editing a user's name via the pencil icon updates the row in the table", async ({
    adminPage,
  }) => {
    const user = makeUser()
    // Use a completely different prefix so the original name is not a
    // substring of the updated name — keeps the not.toBeVisible check clean.
    const updatedName = `Renamed ${Date.now()}`

    await adminPage.goto("/users")

    // Prerequisite: create the user we are going to edit
    await createUserViaModal(adminPage, user)

    // Click the pencil icon for the newly created user
    await adminPage.getByRole("button", { name: `Edit ${user.name}` }).click()

    const editModal = adminPage.getByTestId("edit-modal-backdrop")
    await expect(editModal.getByRole("heading", { name: "Edit User" })).toBeVisible()

    // The Name field is pre-populated — clear it and type the new value
    const nameField = editModal.getByLabel("Name")
    await nameField.clear()
    await nameField.fill(updatedName)

    await editModal.getByRole("button", { name: "Save Changes" }).click()

    // Modal unmounts on success
    await expect(adminPage.getByTestId("edit-modal-backdrop")).not.toBeVisible()

    // Updated name is now in the table; original name is gone
    await expect(adminPage.getByText(updatedName)).toBeVisible()
    await expect(adminPage.getByText(user.name)).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

test.describe("Users page — Delete", () => {
  test("confirming the delete modal removes the user from the table", async ({ adminPage }) => {
    const user = makeUser()

    await adminPage.goto("/users")

    // Prerequisite: create the user we are going to delete
    await createUserViaModal(adminPage, user)

    // Click the trash icon for this user
    await adminPage.getByRole("button", { name: `Delete ${user.name}` }).click()

    const deleteModal = adminPage.getByTestId("delete-modal-backdrop")
    await expect(deleteModal.getByRole("heading", { name: "Delete User" })).toBeVisible()

    // The confirmation modal must display the target user's identity
    await expect(deleteModal.getByText(user.name)).toBeVisible()
    await expect(deleteModal.getByText(user.email)).toBeVisible()

    // Scope the final click to the modal so it cannot accidentally hit the
    // trash icon in the table row (which carries a different aria-label)
    await deleteModal.getByRole("button", { name: "Delete" }).click()

    // Modal unmounts on success
    await expect(adminPage.getByTestId("delete-modal-backdrop")).not.toBeVisible()

    // The deleted user's email no longer appears anywhere in the table
    await expect(adminPage.getByText(user.email)).not.toBeVisible()
  })
})
