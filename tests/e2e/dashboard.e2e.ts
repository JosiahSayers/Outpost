import { expect, test, type Page } from "@playwright/test";

const USER = { email: "user@test.com", password: "user-password" };

const RESIZE_OBSERVER_INIT_SCRIPT = () => {
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
};

async function signIn(page: Page, user = USER) {
  await page.goto("/sign-in?redirect=/dashboard");
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

async function createListViaApi(page: Page, name: string): Promise<number> {
  const response = await page.request.post("/api/packing-lists", {
    data: { name },
  });
  expect(response.ok()).toBe(true);
  const { packingList } = await response.json();
  return packingList.id;
}

// Wait for packing list cards to finish loading, then expand the "View all
// lists" collapse if it's present, so any card is reachable regardless of
// how many lists already exist in the environment.
async function expandAllLists(page: Page) {
  await expect(page.getByText("Export PDF").first()).toBeVisible({
    timeout: 10000,
  });
  const viewAll = page.getByRole("button", { name: "View all lists" });
  if (await viewAll.isVisible()) {
    await viewAll.click();
  }
}

// The empty-state test needs a fresh user with no lists, so it lives in its
// own describe that does not inherit the signed-in beforeEach below.
test.describe("Dashboard Page - empty packing lists state", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(RESIZE_OBSERVER_INIT_SCRIPT);
  });

  test("shows an empty state message when the user has no packing lists", async ({
    page,
  }) => {
    const email = `e2e-empty-${Date.now()}@test.com`;
    await page.goto("/register");
    await page.getByLabel("Name").fill("E2E Empty User");
    await page.getByLabel("Email").fill(email);
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill("test-password");
    await page
      .getByRole("textbox", { name: "Confirm password" })
      .fill("test-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/dashboard");
    await expect(
      page.getByText(
        "No Packing lists yet. Create one to get started planning.",
      ),
    ).toBeVisible();
  });
});

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(RESIZE_OBSERVER_INIT_SCRIPT);
    await signIn(page);
    await expect(
      page.getByRole("heading", { name: /Welcome back/ }),
    ).toBeVisible();
  });

  test.describe("Gear Summary Bar", () => {
    test("shows the correct total item count, respecting quantity", async ({
      page,
    }) => {
      await expect(page.getByText("3 (3 unique)")).toBeVisible();
    });

    test("shows the correct total weight, ignoring items without a weight", async ({
      page,
    }) => {
      // 745 + 1615 + 82 = 2442g. The stat bar rolls totals up to the next
      // unit once they pass 1.5x it, so this displays in pounds rather than
      // the locale-detected ounces: 2442 / 453.59237 ≈ 5.38.
      await expect(page.getByText("5.38 lb")).toBeVisible();
    });

    test("shows the correct number of unique categories", async ({ page }) => {
      await expect(page.getByText("3", { exact: true })).toBeVisible();
    });

    test("links to the gear inventory page", async ({ page }) => {
      await page.getByText("Manage Gear Inventory →").click();
      await page.waitForURL("/gear-inventory");
    });
  });

  test.describe("Packing Lists", () => {
    test.describe("creating a new packing list", () => {
      test("clicking New List opens the modal", async ({ page }) => {
        await page.getByRole("button", { name: "New List" }).click();
        await expect(
          page.getByRole("heading", { name: "New Packing List" }),
        ).toBeVisible();
      });

      test("Cancel closes the modal without creating a list", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "New List" }).click();
        await expect(
          page.getByRole("heading", { name: "New Packing List" }),
        ).toBeVisible();
        await page
          .getByRole("textbox", { name: "List name" })
          .fill("Should not be created");
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(
          page.getByRole("heading", { name: "New Packing List" }),
        ).not.toBeVisible();
        await expect(page.getByText("Should not be created")).not.toBeVisible();
      });

      test("shows a validation error when the name is too short", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "New List" }).click();
        await page.getByRole("textbox", { name: "List name" }).fill("AB");
        await page.getByRole("button", { name: "Create list" }).click();
        await expect(
          page.getByRole("textbox", { name: "List name" }),
        ).toHaveAttribute("aria-invalid", "true");
      });

      test("successfully creates a new list and navigates to it", async ({
        page,
      }) => {
        const listName = `E2E New List ${Date.now()}`;
        await page.getByRole("button", { name: "New List" }).click();
        await page.getByRole("textbox", { name: "List name" }).fill(listName);
        await page.getByRole("button", { name: "Create list" }).click();
        await page.waitForURL(/\/packing-lists\/\d+/);
        await expect(
          page.getByRole("heading", { level: 1, name: listName }),
        ).toBeVisible();
      });

      test("can copy sections and items from a public list", async ({
        page,
      }) => {
        const newListName = `E2E Copy Test ${Date.now()}`;
        await page.getByRole("button", { name: "New List" }).click();
        await page
          .getByRole("textbox", { name: "List name" })
          .fill(newListName);
        await page.getByLabel("Copy from existing list").fill("REI");
        await page
          .getByRole("option", { name: "REI Backpacking Checklist" })
          .click();
        await page.getByRole("button", { name: "Create list" }).click();
        await page.waitForURL(/\/packing-lists\/\d+/);
        await expect(
          page.getByRole("heading", { level: 1, name: newListName }),
        ).toBeVisible();
        // Copied list should have sections inherited from the source
        await expect(
          page.getByRole("heading", { level: 5 }).first(),
        ).toBeVisible();
      });

      test("shows an error and keeps the modal open when the API fails", async ({
        page,
      }) => {
        await page.route("**/api/packing-lists", (route) => {
          if (route.request().method() === "POST") {
            return route.fulfill({ status: 500 });
          }
          return route.continue();
        });

        await page.getByRole("button", { name: "New List" }).click();
        await page
          .getByRole("textbox", { name: "List name" })
          .fill(`Fail Test ${Date.now()}`);
        await page.getByRole("button", { name: "Create list" }).click();
        await expect(
          page.getByText("Something went wrong. Please try again."),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "New Packing List" }),
        ).toBeVisible();
      });
    });

    test.describe("with existing packing lists", () => {
      let listName: string;

      test.beforeEach(async ({ page }) => {
        listName = `E2E Existing List ${Date.now()}`;
        await createListViaApi(page, listName);
        await page.reload();
        await expect(
          page.getByRole("heading", { name: /Welcome back/ }),
        ).toBeVisible();
        await expandAllLists(page);
      });

      test("shows a card for each of the user's packing lists", async ({
        page,
      }) => {
        await expect(page.getByText(listName)).toBeVisible();
      });

      test("shows the item count on each card", async ({ page }) => {
        // A brand-new list has 0 items
        await expect(page.getByText("0 items").first()).toBeVisible();
      });

      test("clicking the list name navigates to the packing list page", async ({
        page,
      }) => {
        await page.getByRole("link", { name: listName }).click();
        await page.waitForURL(/\/packing-lists\/\d+/);
        await expect(
          page.getByRole("heading", { level: 1, name: listName }),
        ).toBeVisible();
      });
    });

    test.describe("showing more than 3 packing lists", () => {
      test.beforeEach(async ({ page }) => {
        const id = Date.now();
        for (let i = 1; i <= 4; i++) {
          await createListViaApi(page, `E2E Paginated ${i} ${id}`);
        }
        await page.reload();
        await expect(
          page.getByRole("heading", { name: /Welcome back/ }),
        ).toBeVisible();
        // Wait for cards to load so the "View all lists" button state is stable
        await expect(page.getByText("Export PDF").first()).toBeVisible({
          timeout: 10000,
        });
      });

      test("shows a 'View all lists' button when the user has more than 3 lists", async ({
        page,
      }) => {
        await expect(
          page.getByRole("button", { name: "View all lists" }),
        ).toBeVisible();
      });

      test("clicking 'View all lists' changes the button label to 'View less'", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "View all lists" }).click();
        await expect(
          page.getByRole("button", { name: "View less" }),
        ).toBeVisible();
      });

      test("clicking 'View less' collapses the extra lists", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "View all lists" }).click();
        await expect(
          page.getByRole("button", { name: "View less" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "View less" }).click();
        await expect(
          page.getByRole("button", { name: "View all lists" }),
        ).toBeVisible();
      });
    });
  });

  test.describe("Upcoming Trips", () => {
    test.describe("creating a new trip", () => {
      test("clicking New Trip opens the drawer", async ({ page }) => {
        await page.getByRole("button", { name: "New Trip" }).click();
        await expect(
          page.getByRole("textbox", { name: "Trip name" }),
        ).toBeVisible();
      });

      test("Cancel closes the drawer without creating a trip", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "New Trip" }).click();
        await page
          .getByRole("textbox", { name: "Trip name" })
          .fill("Should not be created");
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(
          page.getByRole("textbox", { name: "Trip name" }),
        ).not.toBeVisible();
        await expect(page.getByText("Should not be created")).not.toBeVisible();
      });

      test("shows a validation error when the name is empty", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "New Trip" }).click();
        await page.getByRole("button", { name: "Create trip" }).click();
        await expect(
          page.getByRole("textbox", { name: "Trip name" }),
        ).toHaveAttribute("aria-invalid", "true");
      });

      test("shows a validation error when the end date is before the start date", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "New Trip" }).click();
        await page
          .getByRole("textbox", { name: "Trip name" })
          .fill(`E2E Bad Range ${Date.now()}`);
        await page
          .getByRole("textbox", { name: "Start date" })
          .fill("June 10, 2026");
        await page
          .getByRole("textbox", { name: "End date" })
          .fill("June 1, 2026");
        await page.getByRole("button", { name: "Create trip" }).click();
        await expect(
          page.getByText("End date must be on or after the start date"),
        ).toBeVisible();
      });

      test("creates a trip with only the required name field", async ({
        page,
      }) => {
        const tripName = `E2E Minimal Trip ${Date.now()}`;
        await page.getByRole("button", { name: "New Trip" }).click();
        await page.getByRole("textbox", { name: "Trip name" }).fill(tripName);
        await page.getByRole("button", { name: "Create trip" }).click();

        // Drawer closes on success.
        await expect(
          page.getByRole("button", { name: "Create trip" }),
        ).not.toBeVisible();

        const response = await page.request.get("/api/trips?take=100");
        const { trips } = await response.json();
        const created = trips.find(
          (trip: { name: string }) => trip.name === tripName,
        );
        expect(created).toMatchObject({
          name: tripName,
          status: "planning",
          trail: null,
          location: null,
        });
      });

      test("creates a trip with all fields and shows it in the upcoming trips list", async ({
        page,
      }) => {
        const tripName = `E2E Full Trip ${Date.now()}`;
        await page.getByRole("button", { name: "New Trip" }).click();
        await page.getByRole("textbox", { name: "Trip name" }).fill(tripName);
        // "In Progress" sorts ahead of the seeded "Planning" trips, so this
        // trip is guaranteed to land in the (max 3) dashboard preview.
        await page.getByRole("combobox", { name: "Status" }).click();
        await page.getByRole("option", { name: "In Progress" }).click();
        await page
          .getByRole("textbox", { name: "Trail" })
          .fill("Wonderland Trail");
        await page
          .getByRole("textbox", { name: "Location" })
          .fill("Mount Rainier National Park, WA");
        await page
          .getByRole("textbox", { name: "Start date" })
          .fill("June 1, 2026");
        await page
          .getByRole("textbox", { name: "End date" })
          .fill("June 10, 2026");
        await page.getByRole("button", { name: "Create trip" }).click();

        const card = page
          .locator(".mantine-Card-root")
          .filter({ hasText: tripName });
        await expect(
          card.getByRole("heading", { level: 4, name: tripName }),
        ).toBeVisible();
        await expect(
          card.getByText("Mount Rainier National Park, WA"),
        ).toBeVisible();

        const response = await page.request.get("/api/trips?take=100");
        const { trips } = await response.json();
        const created = trips.find(
          (trip: { name: string }) => trip.name === tripName,
        );
        expect(created).toMatchObject({
          name: tripName,
          status: "in_progress",
          trail: "Wonderland Trail",
          location: "Mount Rainier National Park, WA",
          start: "2026-06-01",
          end: "2026-06-10",
        });

        await page.reload();
        await expect(
          page.getByRole("heading", { level: 4, name: tripName }),
        ).toBeVisible();
      });

      test("shows an error and keeps the drawer open when the API fails", async ({
        page,
      }) => {
        await page.route("**/api/trips", (route) => {
          if (route.request().method() === "POST") {
            return route.fulfill({ status: 500 });
          }
          return route.continue();
        });

        await page.getByRole("button", { name: "New Trip" }).click();
        await page
          .getByRole("textbox", { name: "Trip name" })
          .fill(`Fail Test ${Date.now()}`);
        await page.getByRole("button", { name: "Create trip" }).click();

        await expect(
          page.getByText("Something went wrong. Please try again."),
        ).toBeVisible();
        await expect(
          page.getByRole("textbox", { name: "Trip name" }),
        ).toBeVisible();
      });
    });

    // A trip's start/end are bare "YYYY-MM-DD" dates end-to-end (DB column,
    // API contract, and DTO type), with no time-of-day or timezone component
    // to roll back a day for a viewer behind UTC. Honolulu (UTC-10, no DST)
    // is a regression guard proving that class of bug is now structurally
    // impossible, not just handled.
    test.describe("date handling across timezones", () => {
      test.use({ timezoneId: "Pacific/Honolulu" });

      test("shows the trip's dates exactly as entered, even when the viewer is behind UTC", async ({
        page,
      }) => {
        // A fresh user has no trips yet, so the one we create here is
        // guaranteed to be the only entry in the dashboard's preview,
        // regardless of how many other trips exist in the shared dev
        // database or how they sort. This keeps the test end-to-end (real
        // create request, real refetch, real render) without mocking any
        // part of the client-server round trip.
        const email = `e2e-tz-${Date.now()}@test.com`;
        // The parent beforeEach signs in as the shared test user; clear that
        // session first so /register doesn't redirect away immediately.
        await page.context().clearCookies();
        await page.goto("/register");
        await page.getByLabel("Name").fill("E2E Timezone User");
        await page.getByLabel("Email").fill(email);
        await page
          .getByRole("textbox", { name: "Password", exact: true })
          .fill("test-password");
        await page
          .getByRole("textbox", { name: "Confirm password" })
          .fill("test-password");
        await page.getByRole("button", { name: "Create account" }).click();
        await page.waitForURL("/dashboard");

        await page.getByRole("button", { name: "New Trip" }).click();
        await page
          .getByRole("textbox", { name: "Trip name" })
          .fill("Timezone Test Trip");
        await page
          .getByRole("textbox", { name: "Start date" })
          .fill("June 1, 2026");
        await page
          .getByRole("textbox", { name: "End date" })
          .fill("June 10, 2026");
        await page.getByRole("button", { name: "Create trip" }).click();

        await expect(
          page.getByRole("heading", { level: 4, name: "Timezone Test Trip" }),
        ).toBeVisible();
        await expect(page.getByText("Jun 1 – Jun 10, 2026")).toBeVisible();

        await page.reload();
        await expect(page.getByText("Jun 1 – Jun 10, 2026")).toBeVisible();
      });
    });
  });
});
