import { test, expect, seedActiveSessions } from "./support/fixtures";

function uniqueName(): string {
  return `Search Target ${crypto.randomUUID().slice(0, 8)}`;
}

test.describe("Viewing a user's sessions", () => {
  test("shows the account's active session", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const target = await makeUser({ name: uniqueName() });
    await signInAs(await makeUser({ admin: true }));
    await page.goto(`/console/users/${target.id}/sessions`);

    // Signing up itself creates a session, so a fresh user starts with one.
    // Scoped to the table so it targets the status badge, not the "Active"
    // filter pill in the segmented control above it.
    await expect(
      page.getByRole("table").getByText("Active", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("Paginating a user's sessions", () => {
  test("moves to the second page of sessions", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const target = await makeUser({ name: uniqueName() });
    // Sign-up already creates one active session; add ten more for 11 total
    // (2 pages at the page size of 10).
    await seedActiveSessions(target.id, 10);
    await signInAs(await makeUser({ admin: true }));
    await page.goto(`/console/users/${target.id}/sessions`);

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(10);

    await page.getByRole("button", { name: "2" }).click();

    await expect(rows).toHaveCount(1);
  });
});
