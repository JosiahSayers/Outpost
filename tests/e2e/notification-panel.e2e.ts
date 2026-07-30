import { expect, seedNotification, test } from "./support/fixtures";
import type { Page } from "@playwright/test";

// Both the desktop popover trigger and the mobile drawer trigger share the
// aria-label "Notifications" (see header.tsx) and are simultaneously present
// in the DOM — Mantine's visibleFrom/hiddenFrom hide the inactive one with
// CSS rather than removing it. `:visible` scopes down to whichever one the
// current viewport actually shows.
function bellButton(page: Page) {
  return page.locator('[aria-label="Notifications"]:visible');
}

test.describe("Notification bell badge", () => {
  test("shows no badge when there are no unread notifications", async ({
    page,
    user,
  }) => {
    void user;
    await page.goto("/dashboard");
    await expect(bellButton(page).getByText("0")).not.toBeVisible();
  });

  test("shows the unread count", async ({ page, user }) => {
    await seedNotification(user.id, { read: false, dismissed: false });
    await seedNotification(user.id, { read: false, dismissed: false });
    await page.goto("/dashboard");
    await expect(bellButton(page).getByText("2")).toBeVisible();
  });

  test("caps the badge at 9+", async ({ page, user }) => {
    for (let i = 0; i < 10; i++) {
      await seedNotification(user.id, { read: false, dismissed: false });
    }
    await page.goto("/dashboard");
    await expect(bellButton(page).getByText("9+")).toBeVisible();
  });
});

test.describe("Notification panel - desktop popover", () => {
  test.beforeEach(async ({ page, user }) => {
    void user;
    await page.goto("/dashboard");
  });

  test("shows an empty state when there are no notifications", async ({
    page,
  }) => {
    await bellButton(page).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByText("You're all caught up.")).toBeVisible();
  });

  test("shows recent notifications with title and description", async ({
    page,
    user,
  }) => {
    await seedNotification(user.id, {
      title: "Trip reminder",
      description: "Your trip starts tomorrow",
      read: false,
      dismissed: false,
    });
    await page.reload();

    await bellButton(page).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByText("Trip reminder")).toBeVisible();
    await expect(menu.getByText("Your trip starts tomorrow")).toBeVisible();
    await expect(menu.getByText("1 new")).toBeVisible();
  });

  test("clicking a notification with a link navigates and closes the panel", async ({
    page,
    user,
  }) => {
    await seedNotification(user.id, {
      title: "Gear list updated",
      referenceUrl: "/gear-inventory",
      read: false,
      dismissed: false,
    });
    await page.reload();

    await bellButton(page).click();
    await page.getByRole("menu").getByText("Gear list updated").click();

    await page.waitForURL("/gear-inventory");
    await expect(page.getByRole("menu")).not.toBeVisible();
  });

  test("dismissing a notification removes it from the panel", async ({
    page,
    user,
  }) => {
    await seedNotification(user.id, {
      title: "Trip reminder",
      read: false,
      dismissed: false,
    });
    await page.reload();

    await bellButton(page).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByText("Trip reminder")).toBeVisible();
    // The dismiss control only becomes visible on hover (touch devices get
    // it unconditionally) — hover the row first so Playwright has a visible
    // target to click.
    await menu.getByText("Trip reminder").hover();
    await menu.getByRole("button", { name: "Dismiss notification" }).click();

    await expect(menu.getByText("Trip reminder")).not.toBeVisible();
    // Dismissing doesn't navigate, so the panel stays open.
    await expect(menu).toBeVisible();
  });

  test("View all in Notifications navigates to the full page and closes the panel", async ({
    page,
    user,
  }) => {
    await seedNotification(user.id, { read: false, dismissed: false });
    await page.reload();

    await bellButton(page).click();
    await page
      .getByRole("menu")
      .getByRole("link", { name: "View all in Notifications →" })
      .click();

    await page.waitForURL("/notifications");
    await expect(page.getByRole("menu")).not.toBeVisible();
  });
});

test.describe("Notification panel - mobile drawer", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page, user }) => {
    void user;
    await page.goto("/dashboard");
  });

  test("opening the bell shows a left drawer with the panel content", async ({
    page,
    user,
  }) => {
    await seedNotification(user.id, {
      title: "Trip reminder",
      read: false,
      dismissed: false,
    });
    await page.reload();

    await bellButton(page).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByText("Trip reminder")).toBeVisible();
  });

  test("clicking a notification in the drawer navigates and closes it", async ({
    page,
    user,
  }) => {
    await seedNotification(user.id, {
      title: "Gear list updated",
      referenceUrl: "/gear-inventory",
      read: false,
      dismissed: false,
    });
    await page.reload();

    await bellButton(page).click();
    await page.getByRole("dialog").getByText("Gear list updated").click();

    await page.waitForURL("/gear-inventory");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
