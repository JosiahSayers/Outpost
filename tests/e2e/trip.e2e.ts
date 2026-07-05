import { expect, test, type Page } from "@playwright/test";

const USER = { email: "user@test.com", password: "user-password" };
const OTHER_USER = { email: "user2@test.com", password: "user2-password" };

async function signIn(page: Page, user = USER) {
  await page.goto("/sign-in?redirect=/dashboard");
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

async function createTripViaApi(
  page: Page,
  data: { name: string },
): Promise<string> {
  const response = await page.request.post("/api/trips", { data });
  expect(response.ok()).toBe(true);
  const { trip } = await response.json();
  return trip.id;
}

test.beforeEach(async ({ page }) => {
  // Suppress benign ResizeObserver errors that trigger Bun's dev-server error
  // overlay, which intercepts pointer events and causes test failures. Date
  // picker popovers on this page can trigger it.
  await page.addInitScript(() => {
    window.addEventListener(
      "error",
      (event) => {
        if (
          event.message ===
          "ResizeObserver loop completed with undelivered notifications."
        ) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
      },
      true,
    );
  });
});

test.describe("Trip Page", () => {
  let tripName: string;
  let tripId: string;

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    tripName = `E2E Trip ${Date.now()}`;
    tripId = await createTripViaApi(page, { name: tripName });
    await page.goto(`/trips/${tripId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: tripName }),
    ).toBeVisible();
  });

  test.describe("access control", () => {
    test("shows an error for a trip that doesn't exist", async ({ page }) => {
      await page.goto("/trips/does-not-exist");
      await expect(page.getByText("Couldn't load this trip")).toBeVisible();
    });

    test("shows an error for a trip owned by another user", async ({
      page,
    }) => {
      await page.context().clearCookies();
      await signIn(page, OTHER_USER);
      // Signing in redirects to /dashboard, which itself briefly bounces
      // through /sign-in while the session settles; wait for real dashboard
      // content so the next navigation isn't interrupted by that bounce.
      await expect(
        page.getByRole("heading", { name: /Welcome back/ }),
      ).toBeVisible();
      await page.goto(`/trips/${tripId}`);
      await expect(page.getByText("Couldn't load this trip")).toBeVisible();
    });
  });

  test.describe("name", () => {
    test("renaming the trip persists across a reload", async ({ page }) => {
      const newName = `E2E Renamed ${Date.now()}`;
      await page.getByRole("heading", { level: 1, name: tripName }).click();
      await page.getByRole("textbox").fill(newName);
      await page.getByRole("textbox").press("Enter");

      await expect(
        page.getByRole("heading", { level: 1, name: newName }),
      ).toBeVisible();

      await page.reload();
      await expect(
        page.getByRole("heading", { level: 1, name: newName }),
      ).toBeVisible();
    });

    test("shows an error and reverts the name when the save fails", async ({
      page,
    }) => {
      await page.route(`**/api/trips/${tripId}`, (route) => {
        if (route.request().method() === "PATCH") {
          return route.fulfill({ status: 500 });
        }
        return route.continue();
      });

      await page.getByRole("heading", { level: 1, name: tripName }).click();
      await page.getByRole("textbox").fill("This rename should fail");
      await page.getByRole("textbox").press("Enter");

      await expect(page.getByText("Couldn't rename trip")).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 1, name: tripName }),
      ).toBeVisible();
    });
  });

  test.describe("status", () => {
    test("changing the status persists across a reload", async ({ page }) => {
      await page.getByText("Planning").click();
      await page.getByRole("option", { name: "In Progress" }).click();

      await expect(page.getByText("In Progress")).toBeVisible();

      await page.reload();
      await expect(page.getByText("In Progress")).toBeVisible();
    });

    test("shows an error and reverts the status when the save fails", async ({
      page,
    }) => {
      await page.route(`**/api/trips/${tripId}`, (route) => {
        if (route.request().method() === "PATCH") {
          return route.fulfill({ status: 500 });
        }
        return route.continue();
      });

      await page.getByText("Planning").click();
      await page.getByRole("option", { name: "In Progress" }).click();

      await expect(page.getByText("Couldn't update status")).toBeVisible();
      await expect(page.getByText("Planning")).toBeVisible();
    });
  });

  test.describe("trail and location", () => {
    test("editing the trail persists across a reload", async ({ page }) => {
      const trail = `Wonderland Trail ${Date.now()}`;
      await page.getByText("Add a trail").click();
      await page.getByRole("textbox").fill(trail);
      await page.getByRole("textbox").press("Enter");

      await expect(page.getByText(trail)).toBeVisible();

      await page.reload();
      await expect(page.getByText(trail)).toBeVisible();
    });

    test("editing the location persists across a reload", async ({ page }) => {
      const location = `Mount Rainier NP ${Date.now()}`;
      await page.getByText("Add a location").click();
      await page.getByRole("textbox").fill(location);
      await page.getByRole("textbox").press("Enter");

      await expect(page.getByText(location)).toBeVisible();

      await page.reload();
      await expect(page.getByText(location)).toBeVisible();
    });

    test("shows an error and reverts the trail when the save fails", async ({
      page,
    }) => {
      await page.route(`**/api/trips/${tripId}`, (route) => {
        if (route.request().method() === "PATCH") {
          return route.fulfill({ status: 500 });
        }
        return route.continue();
      });

      await page.getByText("Add a trail").click();
      await page.getByRole("textbox").fill("This trail should fail");
      await page.getByRole("textbox").press("Enter");

      await expect(page.getByText("Couldn't update trail")).toBeVisible();
      await expect(page.getByText("Add a trail")).toBeVisible();
    });
  });

  test.describe("dates", () => {
    test("setting the start and end dates persists across a reload", async ({
      page,
    }) => {
      await page.getByText("Dates TBD").click();
      await page
        .getByRole("textbox", { name: "Start date" })
        .fill("June 1, 2026");
      await page
        .getByRole("textbox", { name: "End date" })
        .fill("June 10, 2026");
      // Each field saves on change; Escape just closes edit mode without
      // reverting the already-persisted values.
      await page.getByRole("textbox", { name: "End date" }).press("Escape");

      await expect(page.getByText("Jun 1 – Jun 10, 2026")).toBeVisible();

      await page.reload();
      await expect(page.getByText("Jun 1 – Jun 10, 2026")).toBeVisible();
    });

    test("shows an error when the date save fails", async ({ page }) => {
      await page.route(`**/api/trips/${tripId}`, (route) => {
        if (route.request().method() === "PATCH") {
          return route.fulfill({ status: 500 });
        }
        return route.continue();
      });

      await page.getByText("Dates TBD").click();
      await page
        .getByRole("textbox", { name: "Start date" })
        .fill("June 1, 2026");

      await expect(page.getByText("Couldn't update dates")).toBeVisible();
    });
  });
});
