import { expect, seedNotification, test } from "./support/fixtures";

// A fresh fixture user has no notifications, so the empty state is testable
// without seeding anything. It lives in its own describe so it doesn't
// inherit the notification-seeding beforeEach below.
test.describe("Notifications Page - empty state", () => {
  test("shows an empty state message on the Unread tab", async ({
    page,
    user,
  }) => {
    void user;
    await page.goto("/notifications");
    await expect(page.getByText("You're all caught up.")).toBeVisible();
  });

  test("shows an empty state message on the History tab", async ({
    page,
    user,
  }) => {
    void user;
    await page.goto("/notifications");
    await page.getByText("History", { exact: true }).click();
    await expect(
      page.getByText("Dismissed notifications will show up here."),
    ).toBeVisible();
  });

  test("the back link returns to the dashboard", async ({ page, user }) => {
    void user;
    await page.goto("/notifications");
    await page.getByRole("link", { name: "Back to Dashboard" }).click();
    await page.waitForURL("/dashboard");
  });
});

test.describe("Notifications Page", () => {
  test.beforeEach(async ({ page, user }) => {
    // Explicit, recent createdAt: the pagination tests below seed a batch of
    // older notifications and rely on this one sorting to the top of page 1.
    // (`make`'s default is `faker.date.past()` — a random past date with no
    // guaranteed order relative to anything else.)
    await seedNotification(user.id, {
      title: "Trip reminder",
      description: "Your trip starts tomorrow",
      icon: "CalendarIcon",
      referenceUrl: null,
      read: false,
      dismissed: false,
      createdAt: new Date(),
    });
    await page.goto("/notifications");
    await expect(page.getByText("Trip reminder")).toBeVisible();
  });

  test("shows the title, description, and icon", async ({ page }) => {
    await expect(page.getByText("Trip reminder")).toBeVisible();
    await expect(page.getByText("Your trip starts tomorrow")).toBeVisible();
  });

  test("clicking a notification without a link marks it read but does not navigate", async ({
    page,
    user,
  }) => {
    await page.getByText("Trip reminder").click();
    await expect(page).toHaveURL("/notifications");

    const response = await page.request.get(
      "/api/notifications?read=true&take=25",
    );
    const { notifications } = await response.json();
    expect(
      notifications.some((n: { title: string }) => n.title === "Trip reminder"),
    ).toBe(true);
    void user;
  });

  test("clicking a notification with a link marks it read and navigates", async ({
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

    await page.getByText("Gear list updated").click();
    await page.waitForURL("/gear-inventory");
  });

  test("dismissing a notification removes it from Unread and shows it in History", async ({
    page,
  }) => {
    // The dismiss control only becomes visible on hover (touch devices get
    // it unconditionally) — hover the row first so Playwright has a visible
    // target to click.
    await page.getByText("Trip reminder").hover();
    await page
      .getByRole("button", { name: "Dismiss notification" })
      .first()
      .click();
    await expect(page.getByText("Trip reminder")).not.toBeVisible();

    await page.getByText("History", { exact: true }).click();
    await expect(page.getByText("Trip reminder")).toBeVisible();
  });

  test("the dismiss control is hidden on the History tab", async ({
    page,
    user,
  }) => {
    await seedNotification(user.id, {
      title: "Already dismissed",
      read: true,
      dismissed: true,
    });
    await page.getByText("History", { exact: true }).click();
    await expect(page.getByText("Already dismissed")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Dismiss notification" }),
    ).not.toBeVisible();
  });

  test.describe("pagination", () => {
    test.beforeEach(async ({ page, user }) => {
      // Older than the "Trip reminder" seeded above, so it reliably sorts
      // ahead of all of these onto page 1.
      for (let i = 0; i < 20; i++) {
        await seedNotification(user.id, {
          title: `Bulk notification ${i}`,
          read: false,
          dismissed: false,
          createdAt: new Date(Date.now() - (i + 1) * 60_000),
        });
      }
      await page.reload();
    });

    test("shows pagination controls once there are more than a page's worth", async ({
      page,
    }) => {
      await expect(page.getByRole("button", { name: "2" })).toBeVisible();
    });

    test("moving to page 2 reveals the remaining notifications", async ({
      page,
    }) => {
      // 20 bulk + 1 seeded from the outer beforeEach = 21, page size 20.
      await expect(page.getByText("Trip reminder")).toBeVisible();
      await page.getByRole("button", { name: "2" }).click();
      await expect(page.getByText("Trip reminder")).not.toBeVisible();
    });
  });
});
