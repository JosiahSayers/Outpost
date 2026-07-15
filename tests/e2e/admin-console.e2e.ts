import { expect, test, type Page } from "@playwright/test";

const USER = { email: "user@test.com", password: "user-password" };
const ADMIN = { email: "admin@test.com", password: "admin-password" };

async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto("/sign-in?redirect=/dashboard");
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("Admin console access", () => {
  test("an admin sees a link to the admin console in their account menu", async ({
    page,
  }) => {
    await signIn(page, ADMIN);
    await page
      .locator("header")
      .getByRole("button", { name: "Account menu" })
      .click();
    await expect(
      page.getByRole("menu").getByRole("menuitem", { name: "Admin" }),
    ).toBeVisible();
  });

  test("a non-admin user does not see a link to the admin console in their account menu", async ({
    page,
  }) => {
    await signIn(page, USER);
    await page
      .locator("header")
      .getByRole("button", { name: "Account menu" })
      .click();
    await expect(
      page.getByRole("menu").getByRole("menuitem", { name: "Admin" }),
    ).not.toBeVisible();
  });

  test("an admin can load the /console route", async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto("/console");
    await expect(page).toHaveURL("/console");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });

  test("a non-admin cannot load the /console route", async ({ page }) => {
    await signIn(page, USER);
    await page.goto("/console");
    await expect(page).toHaveURL("/dashboard");
  });
});
