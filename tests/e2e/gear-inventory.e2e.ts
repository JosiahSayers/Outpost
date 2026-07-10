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

  test("the back link returns to the dashboard", async ({ page }) => {
    await page.getByRole("link", { name: "Back to Dashboard" }).click();
    await page.waitForURL("/dashboard");
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
      // 745 + 1615 + 82 = 2442g. The stat bar rolls totals up to the next
      // unit once they pass 1.5x it, so this displays in pounds rather than
      // the locale-detected ounces: 2442 / 453.59237 ≈ 5.38.
      await expect(page.getByText("5.38 lb")).toBeVisible();
    });

    test("shows the correct number of unique categories", async ({ page }) => {
      await expect(page.getByText("3", { exact: true })).toBeVisible();
    });
  });

  test.describe("weight formatting", () => {
    test("displays weight in the locale-detected unit (ounces for en-US)", async ({
      page,
    }) => {
      await expect(
        page
          .getByRole("row")
          .filter({ hasText: "Durston X-Mid 1" })
          .getByText("26.28 oz"),
      ).toBeVisible();
      await expect(
        page
          .getByRole("row")
          .filter({ hasText: "Gergory Zulu 45" })
          .getByText("56.97 oz"),
      ).toBeVisible();
      await expect(
        page
          .getByRole("row")
          .filter({ hasText: "Platypus QuickDraw" })
          .getByText("2.89 oz"),
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

    test("shows an error and keeps the drawer open when the API call fails", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill("Should not save");
      await page.getByLabel("Category").fill("Ten");
      await page.getByRole("option", { name: "Tents" }).click();

      await page.route("**/api/gear-inventory", (route) =>
        route.fulfill({ status: 500 }),
      );

      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(
        page.getByText("Something went wrong. Please try again."),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Add item" }),
      ).toBeVisible();
    });
  });

  test.describe("the weight field", () => {
    test("entering a weight in a non-default unit converts and persists the correct gram value", async ({
      page,
    }) => {
      const itemName = `Weight Unit Test ${Date.now()}`;
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill(itemName);
      await page.getByLabel("Category").fill("Ten");
      await page.getByRole("option", { name: "Tents" }).click();

      await page.getByRole("combobox", { name: "Weight unit" }).click();
      await page.getByRole("option", { name: "Pounds (lb)" }).click();
      await page.getByLabel("Weight", { exact: true }).fill("1");

      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();

      // 1 lb rounds to 454g at the submit boundary, displayed as 16.01 oz
      // under the en-US default test locale.
      await expect(
        page
          .getByRole("row")
          .filter({ hasText: itemName })
          .getByText("16.01 oz"),
      ).toBeVisible();

      await page.reload();
      await expect(
        page
          .getByRole("row")
          .filter({ hasText: itemName })
          .getByText("16.01 oz"),
      ).toBeVisible();
    });

    test("switching units converts the displayed value without altering the underlying weight", async ({
      page,
    }) => {
      // Durston X-Mid 1 is seeded with a weight of 745g.
      await page.getByRole("button", { name: "Edit Durston X-Mid 1" }).click();
      const weightUnit = page.getByRole("combobox", { name: "Weight unit" });

      await weightUnit.click();
      await page.getByRole("option", { name: "Kilograms (kg)" }).click();
      await expect(page.getByLabel("Weight", { exact: true })).toHaveValue(
        "0.75",
      );

      await weightUnit.click();
      await page.getByRole("option", { name: "Pounds (lb)" }).click();
      await expect(page.getByLabel("Weight", { exact: true })).toHaveValue(
        "1.64",
      );

      await weightUnit.click();
      await page.getByRole("option", { name: "Ounces (oz)" }).click();
      await expect(page.getByLabel("Weight", { exact: true })).toHaveValue(
        "26.28",
      );

      // Don't persist any of this — Durston X-Mid 1's weight backs other
      // tests' assumptions (e.g. the stat bar's total weight).
      await page.getByRole("button", { name: "Cancel" }).click();
    });
  });

  test.describe("editing an existing gear inventory item", () => {
    test("clicking the edit icon opens up the drawer with the form pre-populated and 'Edit item' title", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Edit Durston X-Mid 1" }).click();
      await expect(page.getByText("Edit item")).toBeVisible();
      await expect(page.getByLabel("Item name")).toHaveValue("Durston X-Mid 1");
      await expect(page.getByLabel("Category")).toHaveValue("Tents");
      await expect(page.getByLabel("Quantity")).toHaveValue("1");
    });

    test("clicking Cancel closes the drawer without making any changes", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Edit Durston X-Mid 1" }).click();
      await expect(page.getByText("Edit item")).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();
      await expect(page.getByText("Durston X-Mid 1")).toBeVisible();
    });

    test("successfully saves changes to an item's name", async ({ page }) => {
      const id = Date.now();
      const originalName = `Edit Name Test ${id}`;
      const newName = `Renamed Item ${id}`;
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill(originalName);
      await page.getByLabel("Category").fill("Ten");
      await page.getByRole("option", { name: "Tents" }).click();
      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByText(originalName)).toBeVisible();

      await page.getByRole("button", { name: `Edit ${originalName}` }).click();
      await page.getByLabel("Item name").fill(newName);
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();
      await expect(page.getByText(newName)).toBeVisible();
      await expect(page.getByText(originalName)).not.toBeVisible();
    });

    test("successfully changes an item's category, moving it to the correct section", async ({
      page,
    }) => {
      const id = Date.now();
      const itemName = `Shelter Test ${id}`;
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill(itemName);
      await page.getByLabel("Category").fill("Ten");
      await page.getByRole("option", { name: "Tents" }).click();
      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByText(itemName)).toBeVisible();

      await page.getByRole("button", { name: `Edit ${itemName}` }).click();
      await page.getByLabel("Category").fill("Back");
      await page.getByRole("option", { name: "Backpacks" }).click();
      await expect(page.getByLabel("Category")).toHaveValue("Backpacks");
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();
      await expect(
        page.getByRole("row").filter({ hasText: itemName }),
      ).toBeVisible();
    });

    test("shows an error and keeps the drawer open when the API call fails", async ({
      page,
    }) => {
      const itemName = `Edit Error Test ${Date.now()}`;
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill(itemName);
      await page.getByLabel("Category").fill("Ten");
      await page.getByRole("option", { name: "Tents" }).click();
      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByText(itemName)).toBeVisible();

      await page.getByRole("button", { name: `Edit ${itemName}` }).click();
      await page.getByLabel("Item name").fill("Should not save");

      await page.route("**/api/gear-inventory/*", (route) =>
        route.fulfill({ status: 500 }),
      );

      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(
        page.getByText("Something went wrong. Please try again."),
      ).toBeVisible();
      await expect(page.getByText("Edit item")).toBeVisible();
    });
  });

  test.describe("deleting a gear inventory item", () => {
    test("clicking the delete icon opens the confirmation modal showing the item's name", async ({
      page,
    }) => {
      await page
        .getByRole("button", { name: "Delete Durston X-Mid 1" })
        .click();
      await expect(page.getByText("Delete item?")).toBeVisible();
      await expect(page.getByRole("dialog")).toContainText("Durston X-Mid 1");
    });

    test("clicking Cancel in the delete modal closes it without removing the item", async ({
      page,
    }) => {
      await page
        .getByRole("button", { name: "Delete Durston X-Mid 1" })
        .click();
      await expect(page.getByText("Delete item?")).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText("Delete item?")).not.toBeVisible();
      await expect(page.getByText("Durston X-Mid 1")).toBeVisible();
    });

    test("deleting an item removes it from the gear-inventory list when the API call is successful", async ({
      page,
    }) => {
      const itemName = `Delete Test Item ${Date.now()}`;
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill(itemName);
      await page.getByLabel("Category").fill("Ten");
      await page.getByRole("option", { name: "Tents" }).click();
      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByText(itemName)).toBeVisible();

      await page.getByRole("button", { name: `Delete ${itemName}` }).click();
      await expect(page.getByText("Delete item?")).toBeVisible();
      await page.getByRole("button", { name: "Delete", exact: true }).click();

      await expect(page.getByText("Delete item?")).not.toBeVisible();
      await expect(page.getByText(itemName)).not.toBeVisible();
    });

    test("an error message is shown when the API call fails", async ({
      page,
    }) => {
      const itemName = `Delete Error Test Item ${Date.now()}`;
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill(itemName);
      await page.getByLabel("Category").fill("Ten");
      await page.getByRole("option", { name: "Tents" }).click();
      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByText(itemName)).toBeVisible();

      await page.route("**/api/gear-inventory/*", (route) =>
        route.fulfill({ status: 500 }),
      );

      await page.getByRole("button", { name: `Delete ${itemName}` }).click();
      await expect(page.getByText("Delete item?")).toBeVisible();
      await page.getByRole("button", { name: "Delete", exact: true }).click();

      await expect(
        page.getByText("Something went wrong. Please try again."),
      ).toBeVisible();
      await expect(page.getByText("Delete item?")).toBeVisible();
      await expect(page.getByRole("main").getByText(itemName)).toBeVisible();
    });
  });

  test.describe("drawer state", () => {
    test("opening the drawer to edit an item then clicking Add Item shows an empty form", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Edit Durston X-Mid 1" }).click();
      await expect(page.getByText("Edit item")).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();
      await page.getByRole("button", { name: "Add Item", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Add item" }),
      ).toBeVisible();
      await expect(page.getByLabel("Item name")).toHaveValue("");
      await expect(page.getByLabel("Category")).toHaveValue("");
    });

    test("editing item A then editing item B shows item B's data, not item A's", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Edit Durston X-Mid 1" }).click();
      await expect(page.getByLabel("Item name")).toHaveValue("Durston X-Mid 1");
      await page.getByRole("button", { name: "Cancel" }).click();
      await page.getByRole("button", { name: "Edit Gergory Zulu 45" }).click();
      await expect(page.getByLabel("Item name")).toHaveValue("Gergory Zulu 45");
      await expect(page.getByLabel("Category")).toHaveValue("Backpacks");
    });
  });

  test.describe("sorting", () => {
    test("categories remain sorted alphabetically when an item's category is changed", async ({
      page,
    }) => {
      const id = Date.now();
      const itemName = `Sort Test ${id}`;
      const firstCategory = `Zzz Sort ${id}`;
      const secondCategory = `Aaa Sort ${id}`;

      // Create item under a category that sorts last
      await page.getByRole("button", { name: "Add Item" }).click();
      await page.getByLabel("Item name").fill(itemName);
      await page.getByLabel("Category").fill(firstCategory);
      await page.getByRole("button", { name: "Add item", exact: true }).click();
      await expect(page.getByText(firstCategory)).toBeVisible();

      // Verify "Water Filters" appears above the new last-sorted category
      const waterFiltersPos = await page
        .getByText("Water Filters")
        .boundingBox();
      const firstCategoryPos = await page
        .getByText(firstCategory)
        .boundingBox();
      expect(waterFiltersPos!.y).toBeLessThan(firstCategoryPos!.y);

      // Change the item's category to one that sorts first
      await page.getByRole("button", { name: `Edit ${itemName}` }).click();
      await page.getByLabel("Category").fill(secondCategory);
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByLabel("Item name")).not.toBeVisible();
      await expect(page.getByText(secondCategory)).toBeVisible();

      // Verify the new category now appears before "Backpacks"
      const secondCategoryPos = await page
        .getByText(secondCategory)
        .boundingBox();
      const backpacksPos = await page.getByText("Backpacks").boundingBox();
      expect(secondCategoryPos!.y).toBeLessThan(backpacksPos!.y);
    });

    test.describe("item sorting within categories", () => {
      test("items within a category are displayed in alphabetical order regardless of creation order", async ({
        page,
      }) => {
        const id = Date.now();
        const category = `Sort Items Test ${id}`;
        const firstItem = `Aaa Item ${id}`;
        const lastItem = `Zzz Item ${id}`;

        // Create the last-sorted item first
        await page
          .getByRole("button", { name: "Add Item", exact: true })
          .click();
        await page.getByLabel("Item name").fill(lastItem);
        await page.getByLabel("Category").fill(category);
        await page
          .getByRole("button", { name: "Add item", exact: true })
          .click();
        await expect(page.getByLabel("Item name")).not.toBeVisible();
        await expect(page.getByText(lastItem)).toBeVisible();

        // Create the first-sorted item second
        await page
          .getByRole("button", { name: "Add Item", exact: true })
          .click();
        await page.getByLabel("Item name").fill(firstItem);
        await page.getByLabel("Category").fill(category);
        await page.getByRole("option", { name: category }).click();
        await page
          .getByRole("button", { name: "Add item", exact: true })
          .click();
        await expect(page.getByText(firstItem)).toBeVisible();

        // Despite creation order, firstItem should appear above lastItem
        const firstItemPos = await page
          .getByRole("row")
          .filter({ hasText: firstItem })
          .boundingBox();
        const lastItemPos = await page
          .getByRole("row")
          .filter({ hasText: lastItem })
          .boundingBox();
        expect(firstItemPos!.y).toBeLessThan(lastItemPos!.y);
      });

      test("items within a category are re-sorted alphabetically when an item's name changes", async ({
        page,
      }) => {
        const id = Date.now();
        const category = `Sort Items Test ${id}`;
        const itemA = `Aaa Item ${id}`;
        const itemB = `Mmm Item ${id}`;
        const itemBRenamed = `Zzz Item ${id}`;

        // Create both items
        await page
          .getByRole("button", { name: "Add Item", exact: true })
          .click();
        await page.getByLabel("Item name").fill(itemA);
        await page.getByLabel("Category").fill(category);
        await page
          .getByRole("button", { name: "Add item", exact: true })
          .click();
        await expect(page.getByLabel("Item name")).not.toBeVisible();
        await expect(page.getByText(itemA)).toBeVisible();

        await page
          .getByRole("button", { name: "Add Item", exact: true })
          .click();
        await page.getByLabel("Item name").fill(itemB);
        await page.getByLabel("Category").fill(category);
        await page.getByRole("option", { name: category }).click();
        await page
          .getByRole("button", { name: "Add item", exact: true })
          .click();
        await expect(page.getByText(itemB)).toBeVisible();

        // Verify initial order: itemA before itemB
        const itemAPos = await page
          .getByRole("row")
          .filter({ hasText: itemA })
          .boundingBox();
        const itemBPos = await page
          .getByRole("row")
          .filter({ hasText: itemB })
          .boundingBox();
        expect(itemAPos!.y).toBeLessThan(itemBPos!.y);

        // Rename itemA to something that sorts after itemB
        await page.getByRole("button", { name: `Edit ${itemB}` }).click();
        await page.getByLabel("Item name").fill(itemBRenamed);
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(page.getByLabel("Item name")).not.toBeVisible();
        await expect(page.getByText(itemBRenamed)).toBeVisible();

        // itemA should still be before itemBRenamed
        const itemAAfterPos = await page
          .getByRole("row")
          .filter({ hasText: itemA })
          .boundingBox();
        const itemBRenamedPos = await page
          .getByRole("row")
          .filter({ hasText: itemBRenamed })
          .boundingBox();
        expect(itemAAfterPos!.y).toBeLessThan(itemBRenamedPos!.y);
      });
    });
  });
});
