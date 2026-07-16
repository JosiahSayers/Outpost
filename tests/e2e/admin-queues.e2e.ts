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
