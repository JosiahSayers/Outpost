import { expect, seedNotification, test } from "./support/fixtures";
import type { Page } from "@playwright/test";

// See notification-panel.e2e.ts — both bell triggers share this aria-label,
// only one is visible per viewport at a time.
function bellButton(page: Page) {
  return page.locator('[aria-label="Notifications"]:visible');
}

// useNotificationArrivalAlert (app/frontend/utils/hooks/use-notification-arrival-alert.tsx)
// only detects an "arrival" by comparing successive fetches of the same
// polling query — the poll interval is a full minute, far too slow for a
// test. Instead: seed one notification so the header's first fetch has a
// baseline `latestSeenAt`, then insert a second ("the arrival") directly in
// the DB and dismiss the first one from the panel. Dismissing invalidates
// every notification query (see useDismissNotification's onSettled), which
// forces the same polling query to refetch immediately — a real refetch,
// not a mocked one — and it now sees the arrival's newer `createdAt`.
async function triggerArrival(page: Page) {
  await bellButton(page).click();
  const menu = page.getByRole("menu");
  // The dismiss control only becomes visible on hover (touch devices get it
  // unconditionally) — hover the row first so Playwright has a visible
  // target to click.
  await menu.getByText("Existing notification").hover();
  await menu.getByRole("button", { name: "Dismiss notification" }).click();
}

test.describe("New notification arrival", () => {
  test.beforeEach(async ({ page, user }) => {
    // Explicit, deliberately-old createdAt: the arrival check compares each
    // new fetch's notifications against this baseline timestamp, so it must
    // reliably predate every "arrival" notification the tests seed below.
    // (`make`'s default is `faker.date.past()` — a random past date that
    // could just as easily land after "now" minus a minute.)
    await seedNotification(user.id, {
      title: "Existing notification",
      read: false,
      dismissed: false,
      createdAt: new Date(Date.now() - 60_000),
    });
    await page.goto("/dashboard");
    // Wait for the header's first poll to resolve and establish its
    // baseline before an arrival can be detected against it.
    await expect(bellButton(page).getByText("1")).toBeVisible();
  });

  test("shows a toast with the arriving notification's title and description", async ({
    page,
    user,
  }) => {
    await seedNotification(user.id, {
      title: "Rae added 4 gear items to the shared list",
      description: "Tent stakes, water filter, and 2 more were added.",
      icon: "PersonSimpleHikeIcon",
      read: false,
      dismissed: false,
      createdAt: new Date(),
    });

    await triggerArrival(page);

    const toast = page.getByRole("alert");
    await expect(
      toast.getByText("Rae added 4 gear items to the shared list"),
    ).toBeVisible();
    await expect(
      toast.getByText("Tent stakes, water filter, and 2 more were added."),
    ).toBeVisible();
    // NotificationContent always renders an icon alongside the text.
    await expect(toast.locator("svg").first()).toBeVisible();
  });

  test("rings the bell while the toast is showing", async ({ page, user }) => {
    await seedNotification(user.id, {
      title: "New arrival",
      read: false,
      dismissed: false,
      createdAt: new Date(),
    });

    await triggerArrival(page);

    await expect(page.getByRole("alert")).toBeVisible();
    // Both the desktop and mobile bell triggers render a
    // NotificationBellIcon and both receive the same `pulsing` state, so the
    // ring class applies to both simultaneously — scope to whichever is
    // actually visible in this viewport, same as bellButton() above.
    await expect(
      bellButton(page).locator(".notification-bell--ring"),
    ).toBeVisible();
  });

  test("clicking the toast marks it read and navigates to its reference URL", async ({
    page,
    user,
  }) => {
    await seedNotification(user.id, {
      title: "Gear list updated",
      referenceUrl: "/gear-inventory",
      read: false,
      dismissed: false,
      createdAt: new Date(),
    });

    await triggerArrival(page);

    const toast = page.getByRole("alert");
    await toast.getByText("Gear list updated").click();

    await page.waitForURL("/gear-inventory");
    await expect(toast).not.toBeVisible();

    const response = await page.request.get(
      "/api/notifications?read=true&take=25",
    );
    const { notifications } = await response.json();
    expect(
      notifications.some(
        (n: { title: string }) => n.title === "Gear list updated",
      ),
    ).toBe(true);
  });

  test("clicking a toast with no reference URL marks it read and hides the toast without navigating", async ({
    page,
    user,
  }) => {
    await seedNotification(user.id, {
      title: "Dark mode is here",
      referenceUrl: null,
      read: false,
      dismissed: false,
      createdAt: new Date(),
    });

    await triggerArrival(page);

    const toast = page.getByRole("alert");
    await toast.getByText("Dark mode is here").click();

    await expect(toast).not.toBeVisible();
    await expect(page).toHaveURL("/dashboard");
  });
});
