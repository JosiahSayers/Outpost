import { expect, test, type Page } from "@playwright/test";

const USER = { email: "user@test.com", password: "user-password" };
const USER2 = { email: "user2@test.com", password: "user2-password" };

async function signIn(page: Page, user = USER) {
  await page.goto("/sign-in?redirect=/gear-inventory");
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/gear-inventory");
}

async function signOut(page: Page) {
  await page.getByText("Sign Out").click();
  await expect(page.getByText("Welcome back")).toBeVisible();
}

test.describe("Gear Inventory Page", () => {
  test.beforeEach(async ({ page }) => {
    // Suppress benign ResizeObserver errors that trigger Bun's dev-server error
    // overlay, which intercepts pointer events and causes test failures.
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
    await signIn(page);
    await expect(page.getByText("Durston X-Mid 1")).toBeVisible();
  });

  test("renders the appropriate category sections based on the user's gear inventory items", async ({
    page,
  }) => {
    await expect(page.getByText("Tents")).toBeVisible();
    await expect(page.getByText("Backpacks")).toBeVisible();
    await expect(page.getByText("Water Filters")).toBeVisible();
  });

  test("renders all of the items for each category", async ({ page }) => {
    await expect(page.getByText("Durston X-Mid 1")).toBeVisible();
    await expect(page.getByText("Gergory Zulu 45")).toBeVisible();
    await expect(page.getByText("Platypus QuickDraw")).toBeVisible();
  });

  test("renders no category sections when the user has no gear items", async ({
    page,
  }) => {
    await signOut(page);
    await signIn(page, USER2);
    await expect(
      page.getByRole("heading", { name: "Gear Inventory" }),
    ).toBeVisible();
    await expect(page.getByRole("table")).not.toBeVisible();
  });

  test.describe("stat bar", () => {
    test("shows the correct total item count, respecting quantity", async ({
      page,
    }) => {
      await expect(page.getByText("3 (3 unique)")).toBeVisible();
    });

    test("shows the correct total weight, ignoring items without a weight value", async ({
      page,
    }) => {
      // (745 + 1615 + 82) / 1000 = 2.44 kg
      await expect(page.getByText("2.44 kg")).toBeVisible();
    });

    test("shows the correct number of unique categories", async ({ page }) => {
      await expect(page.getByText("3", { exact: true })).toBeVisible();
    });
  });

  test.describe("weight formatting", () => {
    test("displays weight in grams for items under 1000g", async ({ page }) => {
      await expect(
        page
          .getByRole("row")
          .filter({ hasText: "Durston X-Mid 1" })
          .getByText("745 g"),
      ).toBeVisible();
      await expect(
        page
          .getByRole("row")
          .filter({ hasText: "Platypus QuickDraw" })
          .getByText("82 g"),
      ).toBeVisible();
    });

    test("displays weight in kg for items 1000g or over", async ({ page }) => {
      await expect(
        page
          .getByRole("row")
          .filter({ hasText: "Gergory Zulu 45" })
          .getByText(/\d+\.\d+ kg/),
      ).toBeVisible();
    });
  });

  test.describe("creating a new gear inventory item", () => {
    test("clicking the Add Item button opens the drawer with an empty form and 'Add item' title", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Add Item" }).click();
      await expect(
        page.getByRole("heading", { name: "Add item" }),
      ).toBeVisible();
      await expect(page.getByLabel("Item name")).toHaveValue("");
      await expect(page.getByLabel("Category")).toHaveValue("");
    });

    test("validates that the form is complete before allowing submission, displaying errors when necessary", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByText("Name is required")).toBeVisible();
      await expect(page.getByText("Category is required")).toBeVisible();
    });

    test("clicking Cancel closes the drawer without creating an item", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill("Item that should not be saved");
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();
      await expect(
        page.getByText("Item that should not be saved"),
      ).not.toBeVisible();
    });

    test("allows a user to create a new gear inventory item with an existing category returned in the autocomplete", async ({
      page,
    }) => {
      const itemName = `Test Tent Item ${Date.now()}`;
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill(itemName);
      await page.getByLabel("Category").fill("Ten");
      await page.getByRole("option", { name: "Tents" }).click();
      await expect(page.getByLabel("Category")).toHaveValue("Tents");
      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();
      await expect(page.getByText(itemName)).toBeVisible();
    });

    test("allows a user to create a new gear inventory item with a new category", async ({
      page,
    }) => {
      const id = Date.now();
      const categoryName = `Hammocks ${id}`;
      const itemName = `Kammok Roo ${id}`;
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill(itemName);
      await page.getByLabel("Category").fill(categoryName);
      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();
      await expect(page.getByText(categoryName)).toBeVisible();
      await expect(page.getByText(itemName)).toBeVisible();
    });

    test("after a successful create, the drawer closes and the new item appears under the correct category section", async ({
      page,
    }) => {
      const itemName = `Test Backpack ${Date.now()}`;
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill(itemName);
      await page.getByLabel("Category").fill("Back");
      await page.getByRole("option", { name: "Backpacks" }).click();
      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();
      await expect(
        page.getByRole("row").filter({ hasText: itemName }),
      ).toBeVisible();
    });

    test("after a successful create with a new category, a new category section is created for the item", async ({
      page,
    }) => {
      const id = Date.now();
      const categoryName = `Trekking Poles ${id}`;
      const itemName = `Black Diamond Trail Ergo Cork ${id}`;
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill(itemName);
      await page.getByLabel("Category").fill(categoryName);
      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();
      await expect(page.getByText(categoryName)).toBeVisible();
      await expect(page.getByText(itemName)).toBeVisible();
    });
  });

  test.describe("editing an existing gear inventory item", () => {
    test("clicking the edit icon opens up the drawer with the form pre-populated and 'Edit item' title", async ({
      page,
    }) => {
      await page
        .getByRole("row")
        .filter({ hasText: "Durston X-Mid 1" })
        .getByRole("button")
        .first()
        .click();
      await expect(page.getByText("Edit item")).toBeVisible();
      await expect(page.getByLabel("Item name")).toHaveValue("Durston X-Mid 1");
      await expect(page.getByLabel("Category")).toHaveValue("Tents");
      await expect(page.getByLabel("Quantity")).toHaveValue("1");
    });

    test("clicking Cancel closes the drawer without making any changes", async ({
      page,
    }) => {
      await page
        .getByRole("row")
        .filter({ hasText: "Durston X-Mid 1" })
        .getByRole("button")
        .first()
        .click();
      await expect(page.getByText("Edit item")).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();
      await expect(page.getByText("Durston X-Mid 1")).toBeVisible();
    });
  });

  test.describe("deleting a gear inventory item", () => {
    test("clicking the delete icon opens the confirmation modal showing the item's name", async ({
      page,
    }) => {
      await page
        .getByRole("row")
        .filter({ hasText: "Durston X-Mid 1" })
        .getByRole("button")
        .last()
        .click();
      await expect(page.getByText("Delete item?")).toBeVisible();
      await expect(page.getByRole("dialog")).toContainText("Durston X-Mid 1");
    });

    test("clicking Cancel in the delete modal closes it without removing the item", async ({
      page,
    }) => {
      await page
        .getByRole("row")
        .filter({ hasText: "Durston X-Mid 1" })
        .getByRole("button")
        .last()
        .click();
      await expect(page.getByText("Delete item?")).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText("Delete item?")).not.toBeVisible();
      await expect(page.getByText("Durston X-Mid 1")).toBeVisible();
    });
  });

  test.describe("drawer state", () => {
    test("opening the drawer to edit an item then clicking Add Item shows an empty form", async ({
      page,
    }) => {
      await page
        .getByRole("row")
        .filter({ hasText: "Durston X-Mid 1" })
        .getByRole("button")
        .first()
        .click();
      await expect(page.getByText("Edit item")).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await page.getByRole("button", { name: "Add Item" }).click();
      await expect(
        page.getByRole("heading", { name: "Add item" }),
      ).toBeVisible();
      await expect(page.getByLabel("Item name")).toHaveValue("");
      await expect(page.getByLabel("Category")).toHaveValue("");
    });

    test("editing item A then editing item B shows item B's data, not item A's", async ({
      page,
    }) => {
      await page
        .getByRole("row")
        .filter({ hasText: "Durston X-Mid 1" })
        .getByRole("button")
        .first()
        .click();
      await expect(page.getByLabel("Item name")).toHaveValue("Durston X-Mid 1");
      await page.getByRole("button", { name: "Cancel" }).click();
      await page
        .getByRole("row")
        .filter({ hasText: "Gergory Zulu 45" })
        .getByRole("button")
        .first()
        .click();
      await expect(page.getByLabel("Item name")).toHaveValue("Gergory Zulu 45");
      await expect(page.getByLabel("Category")).toHaveValue("Backpacks");
    });
  });
});
