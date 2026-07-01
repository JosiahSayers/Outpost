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
      // (745 + 1615 + 82) / 1000 = 2.442, rounds to 2.4
      await expect(page.getByText("2.4 kg")).toBeVisible();
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
});
