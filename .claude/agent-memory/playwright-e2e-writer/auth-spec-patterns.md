---
name: auth-spec-patterns
description: Selectors, error element distinction, data-testid gaps, and sign-out test pattern established in e2e/auth.spec.ts
metadata:
  type: project
---

## Error element selectors in LoginPage.tsx

Two distinct error element types:
| Error kind | CSS classes | Playwright selector |
|------------|------------|---------------------|
| Field-level (email / password) | `text-xs text-destructive` | `page.getByText("Enter a valid email address")` etc. |
| Root / server error | `text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg` | `page.locator("p.text-sm.text-destructive")` |

The `text-sm` vs `text-xs` distinction is what makes `p.text-sm.text-destructive` unique to root errors.

**data-testid gap:** Adding `data-testid="login-root-error"` to the root error `<p>` in `client/src/pages/LoginPage.tsx` would allow using `page.getByTestId("login-root-error")` instead of the class-based selector.

## Key navbar selectors
- Users link (admin only): `page.getByRole("link", { name: "Users" })`
- Sign out button: `page.getByRole("button", { name: "Sign out" })`
- Signed-in user name: `page.getByText(TEST_ADMIN.name)` / `page.getByText(TEST_AGENT.name)`

## "No server request" assertion pattern
Use `page.route()` to intercept before filling the form:
```ts
let signInRequestMade = false
await page.route("**/sign-in/email**", (route) => {
  signInRequestMade = true
  route.continue()
})
// ... fill and submit ...
expect(signInRequestMade).toBe(false)
```

## Sign-out test pattern
Use `adminPage` fixture (pre-authenticated), click Sign out, wait for `/login`, then do a second `goto("/")` to confirm the session cookie is actually cleared (not just navigated away from).

## AdminRoute redirect behavior
`AdminRoute` in `App.tsx` redirects unauthenticated users to `/login` and non-admin authenticated users to `/`. Test for the agent case uses `agentPage.goto("/users")` then `waitForURL("/")`.

## Spec file location
`e2e/auth.spec.ts`
