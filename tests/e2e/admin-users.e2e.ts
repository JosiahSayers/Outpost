import { test, expect } from "./support/fixtures";
import type { Page } from "@playwright/test";
import type { TestUser } from "./support/auth";

function uniqueName(): string {
  return `Search Target ${crypto.randomUUID().slice(0, 8)}`;
}

async function search(page: Page, term: string) {
  await page.getByPlaceholder("Search by name or email…").fill(term);
}

function resultRow(page: Page, name: string) {
  return page.getByRole("row", { name: new RegExp(name) });
}

async function openUserDetailPanel(page: Page, target: TestUser) {
  await page.goto("/console/users");
  await search(page, target.name);
  await resultRow(page, target.name).click();
}

function adminActionCard(page: Page, label: string) {
  return page.locator(".mantine-Card-root").filter({ hasText: label });
}

test.describe("Admin user search authorization", () => {
  test("returns 401 when there is no session", async ({ page }) => {
    const response = await page.goto("/admin/users?search=a");
    expect(response?.status()).toBe(401);
  });

  test("returns 403 when signed in as a non-admin user", async ({
    page,
    user,
  }) => {
    void user;
    const response = await page.goto("/admin/users?search=a");
    expect(response?.status()).toBe(403);
  });

  test("a non-admin cannot load the /console/users route", async ({
    page,
    user,
  }) => {
    void user;
    await page.goto("/console/users");
    await expect(page).toHaveURL("/dashboard");
  });

  test("an admin can load the /console/users route", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/users");
    await expect(page).toHaveURL("/console/users");
    await expect(
      page.getByRole("heading", { name: "User Search" }),
    ).toBeVisible();
  });
});

test.describe("Searching for a user", () => {
  test("shows a prompt before any search is entered", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/users");
    await expect(page.getByText("Find an account")).toBeVisible();
  });

  test("finds a user by name and shows their summary in the results list", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const target = await makeUser({ name: uniqueName() });
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/users");
    await search(page, target.name);

    const row = resultRow(page, target.name);
    await expect(row).toBeVisible();
    await expect(row.getByText(target.email)).toBeVisible();
    await expect(row.getByText("Verified")).toBeVisible();
  });

  test("finds a user by email", async ({ page, makeUser, signInAs }) => {
    const target = await makeUser({ name: uniqueName() });
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/users");
    await search(page, target.email);

    await expect(resultRow(page, target.name)).toBeVisible();
  });

  test("shows a no-results state for a query that matches nobody", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/users");
    const nonsense = `nobody-${crypto.randomUUID()}`;
    await search(page, nonsense);

    await expect(
      page.getByText(`No accounts match “${nonsense}”`),
    ).toBeVisible();
  });
});

test.describe("Paginating search results", () => {
  test("moves to the second page of results and keeps it across a reload", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    // A shared, unique substring lets one search match a whole batch of
    // users without picking up leftovers from other tests' data.
    const term = `Pager ${crypto.randomUUID().slice(0, 8)}`;
    await Promise.all(
      Array.from({ length: 11 }, (_, i) =>
        makeUser({ name: `${term} ${String(i).padStart(2, "0")}` }),
      ),
    );
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/users");
    await search(page, term);

    const matches = page.getByRole("row").filter({ hasText: term });
    await expect(matches).toHaveCount(10);

    await page.getByRole("button", { name: "2" }).click();

    await expect(matches).toHaveCount(1);
    expect(new URL(page.url()).searchParams.get("page")).toBe("2");

    await page.reload();

    await expect(matches).toHaveCount(1);
  });
});

test.describe("User detail panel", () => {
  test("selecting a result opens the detail panel with the user's stats", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const target = await makeUser({ name: uniqueName() });
    await signInAs(await makeUser({ admin: true }));
    await openUserDetailPanel(page, target);

    // Scoped to the detail panel, not the results table beside it, since both
    // render the user's name and email.
    const panel = page
      .locator(".mantine-Paper-root")
      .filter({ hasText: "Admin actions" });
    await expect(
      panel.getByRole("heading", { name: target.name, level: 3 }),
    ).toBeVisible();
    await expect(panel.getByText(target.email)).toBeVisible();

    // A freshly created user has no trips, gear, or packing lists yet.
    for (const label of ["Trips", "Gear Items", "Packing Lists"]) {
      const tile = panel
        .locator(".mantine-Card-root")
        .filter({ hasText: label });
      await expect(tile.getByText("0", { exact: true })).toBeVisible();
    }

    // Signing up itself creates a session, so a fresh user starts at 1.
    const activeSessions = panel
      .locator(".mantine-Card-root")
      .filter({ hasText: "Active Sessions" });
    await expect(activeSessions.getByText("1", { exact: true })).toBeVisible();
  });
});

test.describe("The 'Manage sessions' admin action", () => {
  test("appears on the user detail panel", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const target = await makeUser({ name: uniqueName() });
    await signInAs(await makeUser({ admin: true }));
    await openUserDetailPanel(page, target);

    await expect(adminActionCard(page, "Manage sessions")).toBeVisible();
  });

  test("navigates to the sessions page when clicked", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const target = await makeUser({ name: uniqueName() });
    await signInAs(await makeUser({ admin: true }));
    await openUserDetailPanel(page, target);

    await adminActionCard(page, "Manage sessions").click();

    await expect(page).toHaveURL(`/console/users/${target.id}/sessions`);
    await expect(page.getByRole("heading", { name: "Sessions" })).toBeVisible();
  });
});

// These admin actions are wired up as navigation targets but not implemented
// yet — for now they just need to exist on the page marked as coming soon.
// Replace each with a real test once its page is built.
test.describe("Admin actions (not yet implemented)", () => {
  test("shows an 'Impersonate user' action marked as coming soon", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const target = await makeUser({ name: uniqueName() });
    await signInAs(await makeUser({ admin: true }));
    await openUserDetailPanel(page, target);

    const card = adminActionCard(page, "Impersonate user");
    await expect(card).toBeVisible();
    await expect(card.getByText("Soon")).toBeVisible();
  });

  test("shows a 'Reset password' action marked as coming soon", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const target = await makeUser({ name: uniqueName() });
    await signInAs(await makeUser({ admin: true }));
    await openUserDetailPanel(page, target);

    const card = adminActionCard(page, "Reset password");
    await expect(card).toBeVisible();
    await expect(card.getByText("Soon")).toBeVisible();
  });

  test("shows a 'View audit log' action marked as coming soon", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const target = await makeUser({ name: uniqueName() });
    await signInAs(await makeUser({ admin: true }));
    await openUserDetailPanel(page, target);

    const card = adminActionCard(page, "View audit log");
    await expect(card).toBeVisible();
    await expect(card.getByText("Soon")).toBeVisible();
  });
});
