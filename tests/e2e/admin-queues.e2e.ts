import { test, expect } from "./support/fixtures";

test.describe("Admin queues page authorization", () => {
  test("returns 401 when there is no session", async ({ page }) => {
    const response = await page.goto("/admin/queues");
    expect(response?.status()).toBe(401);
  });

  test("returns 403 when signed in as a non-admin user", async ({
    page,
    user,
  }) => {
    void user;
    const response = await page.goto("/admin/queues");
    expect(response?.status()).toBe(403);
  });

  test("loads the page when signed in as an admin user", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    await signInAs(await makeUser({ admin: true }));
    const response = await page.goto("/admin/queues");
    expect(response?.ok()).toBe(true);
  });
});

test.describe("Queues console page", () => {
  test("a non-admin cannot load the /console/queues route", async ({
    page,
    user,
  }) => {
    void user;
    await page.goto("/console/queues");
    await expect(page).toHaveURL("/dashboard");
  });

  test("an admin sees the bull board rendered inside the iframe", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/queues");

    const queuesFrame = page.frameLocator('iframe[title="Queues"]');
    await expect(
      queuesFrame.getByText("trips__move_to_in_progress"),
    ).toBeVisible();
  });
});
