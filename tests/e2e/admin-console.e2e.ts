import { test, expect } from "./support/fixtures";

test.describe("Admin console access", () => {
  test("an admin sees a link to the admin console in their account menu", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/dashboard");
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
    user,
  }) => {
    void user;
    await page.goto("/dashboard");
    await page
      .locator("header")
      .getByRole("button", { name: "Account menu" })
      .click();
    await expect(
      page.getByRole("menu").getByRole("menuitem", { name: "Admin" }),
    ).not.toBeVisible();
  });

  test("an admin can load the /console route", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console");
    await expect(page).toHaveURL("/console");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });

  test("a non-admin cannot load the /console route", async ({ page, user }) => {
    void user;
    await page.goto("/console");
    await expect(page).toHaveURL("/dashboard");
  });
});

test.describe("Admin dashboard stat strip", () => {
  test("renders every stat returned by the API with its live value", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    await signInAs(await makeUser({ admin: true }));

    // Some stats (e.g. Active Sessions) are global, live counts that other
    // parallel tests churn constantly. Asserting the card against a *separate*
    // fetch would race against that churn, so instead capture the exact
    // per-stat responses the page itself renders from and assert against those.
    type Stat = { label: string; value: unknown; delta?: string };
    const captured = new Map<string, Stat>();
    await page.route("**/admin/dashboard/stats/*", async (route) => {
      const response = await route.fetch();
      const name = new URL(route.request().url()).pathname.split("/").pop()!;
      const { stat } = await response.json();
      captured.set(name, stat);
      await route.fulfill({ response });
    });

    await page.goto("/console");

    // The index endpoint (no trailing segment, so it bypasses the route above)
    // lists the supported stats — a stable set independent of live data.
    const statsResponse = await page.request.get("/admin/dashboard/stats");
    expect(statsResponse.ok()).toBe(true);
    const { statsWithSortPosition } = await statsResponse.json();
    const statNames = Object.keys(statsWithSortPosition);
    expect(statNames.length).toBeGreaterThan(0);

    for (const statName of statNames) {
      await expect.poll(() => captured.has(statName)).toBe(true);
      const stat = captured.get(statName)!;

      const card = page
        .locator(".mantine-Card-root")
        .filter({ hasText: stat.label });
      await expect(
        card.getByText(String(stat.value), { exact: true }),
      ).toBeVisible();
      if (stat.delta) {
        await expect(card.getByText(stat.delta)).toBeVisible();
      }
    }
  });
});
