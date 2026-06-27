import { test as base, expect, type Page } from "@playwright/test"
import { TEST_ADMIN, TEST_AGENT } from "./test-credentials"

type Fixtures = {
  adminPage: Page
  agentPage: Page
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL("/")
}

export const test = base.extend<Fixtures>({
  adminPage: async ({ page }, use) => {
    await signIn(page, TEST_ADMIN.email, TEST_ADMIN.password)
    await use(page)
  },

  agentPage: async ({ page }, use) => {
    await signIn(page, TEST_AGENT.email, TEST_AGENT.password)
    await use(page)
  },
})

export { expect }
