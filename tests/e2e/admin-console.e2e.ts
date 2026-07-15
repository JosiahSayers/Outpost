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

test.describe("Admin dashboard stat strip", () => {
  test("renders every stat returned by the API with its live value", async ({
    page,
  }) => {
    await signIn(page, ADMIN);
    await page.goto("/console");

    const statsResponse = await page.request.get("/admin/dashboard/stats");
    expect(statsResponse.ok()).toBe(true);
    const { statsWithSortPosition } = await statsResponse.json();
    const statNames = Object.keys(statsWithSortPosition);
    expect(statNames.length).toBeGreaterThan(0);

    for (const statName of statNames) {
      const statResponse = await page.request.get(
        `/admin/dashboard/stats/${statName}`,
      );
      expect(statResponse.ok()).toBe(true);
      const { stat } = await statResponse.json();

      const card = page
        .locator(".mantine-Card-root")
        .filter({ hasText: stat.label });
      await expect(card.getByText(stat.value, { exact: true })).toBeVisible();
      if (stat.delta) {
        await expect(card.getByText(stat.delta)).toBeVisible();
      }
    }
  });
});
