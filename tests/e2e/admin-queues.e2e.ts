import { expect, test, type Page } from "@playwright/test";

const USER = { email: "user@test.com", password: "user-password" };
const ADMIN = { email: "admin@test.com", password: "admin-password" };

async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto("/sign-in?redirect=/dashboard");
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
}

test.describe("Admin queues page authorization", () => {
  test("returns 401 when there is no session", async ({ page }) => {
    const response = await page.goto("/admin/queues");
    expect(response?.status()).toBe(401);
  });

  test("returns 403 when signed in as a non-admin user", async ({ page }) => {
    await signIn(page, USER);
    const response = await page.goto("/admin/queues");
    expect(response?.status()).toBe(403);
  });

  test("loads the page when signed in as an admin user", async ({ page }) => {
    await signIn(page, ADMIN);
    const response = await page.goto("/admin/queues");
    expect(response?.ok()).toBe(true);
  });
});
