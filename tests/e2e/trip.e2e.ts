import { db } from "$/utils/db";
import type { Page } from "@playwright/test";
import { make } from "../helpers/test-data/make";
import { expect, test } from "./support/fixtures";

async function createTripViaApi(
  page: Page,
  data: { name: string },
): Promise<string> {
  const response = await page.request.post("/api/trips", { data });
  expect(response.ok()).toBe(true);
  const { trip } = await response.json();
  return trip.id;
}

// The Links section's URL input is always present on the page and has no
// accessible name conflicts with it, so a bare getByRole("textbox") used for
// whichever field is currently being edited must exclude it explicitly.
function editingTextbox(page: Page) {
  return page
    .getByRole("textbox")
    .and(page.locator(':not([aria-label="Link URL"])'));
}

test.describe("Trip Page", () => {
  let tripName: string;
  let tripId: string;

  test.beforeEach(async ({ page, user }) => {
    void user;
    tripName = `E2E Trip ${Date.now()}`;
    tripId = await createTripViaApi(page, { name: tripName });
    await page.goto(`/trips/${tripId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: tripName }),
    ).toBeVisible();
  });

  test.describe("navigation", () => {
    test("the back link returns to the dashboard", async ({ page }) => {
      await page.getByRole("link", { name: "Back to Dashboard" }).click();
      await page.waitForURL("/dashboard");
    });
  });

  test.describe("access control", () => {
    test("shows an error for a trip that doesn't exist", async ({ page }) => {
      await page.goto("/trips/does-not-exist");
      await expect(page.getByText("Couldn't load this trip")).toBeVisible();
    });

    test("shows an error for a trip owned by another user", async ({
      page,
      makeUser,
      signInAs,
    }) => {
      // Switch the page's session to a different fresh user who doesn't own
      // the trip created in beforeEach.
      await page.context().clearCookies();
      await signInAs(await makeUser());
      await page.goto(`/trips/${tripId}`);
      await expect(page.getByText("Couldn't load this trip")).toBeVisible();
    });
  });

  test.describe("name", () => {
    test("renaming the trip persists across a reload", async ({ page }) => {
      const newName = `E2E Renamed ${Date.now()}`;
      await page.getByRole("heading", { level: 1, name: tripName }).click();
      await editingTextbox(page).fill(newName);
      await editingTextbox(page).press("Enter");

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
      await editingTextbox(page).fill("This rename should fail");
      await editingTextbox(page).press("Enter");

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
      await editingTextbox(page).fill(trail);
      await editingTextbox(page).press("Enter");

      await expect(page.getByText(trail)).toBeVisible();

      await page.reload();
      await expect(page.getByText(trail)).toBeVisible();
    });

    test("editing the location persists across a reload", async ({ page }) => {
      const location = `Mount Rainier NP ${Date.now()}`;
      await page.getByText("Add a location").click();
      await editingTextbox(page).fill(location);
      await editingTextbox(page).press("Enter");

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
      await editingTextbox(page).fill("This trail should fail");
      await editingTextbox(page).press("Enter");

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

  test.describe("deleting a trip", () => {
    test("deletes the trip and navigates to /dashboard", async ({ page }) => {
      await page.getByRole("button", { name: "Trip actions" }).click();
      await page.getByRole("menuitem", { name: "Delete trip" }).click();
      await expect(
        page.getByRole("heading", { name: "Delete trip?" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Delete", exact: true }).click();

      await page.waitForURL("/dashboard");
      const response = await page.request.get(`/api/trips/${tripId}`);
      expect(response.status()).toBe(404);
    });

    test("does not delete the trip when cancelled", async ({ page }) => {
      await page.getByRole("button", { name: "Trip actions" }).click();
      await page.getByRole("menuitem", { name: "Delete trip" }).click();
      await page.getByRole("button", { name: "Cancel" }).click();

      await expect(
        page.getByRole("heading", { level: 1, name: tripName }),
      ).toBeVisible();
      const response = await page.request.get(`/api/trips/${tripId}`);
      expect(response.status()).toBe(200);
    });

    test("shows an error notification when the delete fails", async ({
      page,
    }) => {
      await page.route(`**/api/trips/${tripId}`, (route) => {
        if (route.request().method() === "DELETE") {
          return route.fulfill({ status: 500 });
        }
        return route.continue();
      });

      await page.getByRole("button", { name: "Trip actions" }).click();
      await page.getByRole("menuitem", { name: "Delete trip" }).click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();

      await expect(page.getByText("Couldn't delete trip")).toBeVisible();
    });

    test("deletes a trip with a meal plan item", async ({ page }) => {
      await page.locator("table").getByText("Day 1").click();
      await expect(page.getByRole("heading", { name: "Day 1" })).toBeVisible();

      const input = page.getByRole("textbox", { name: "Add to Breakfast" });
      await input.fill("Granola");
      await input.press("Enter");
      await expect(page.getByRole("button", { name: /Granola/ })).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("heading", { name: "Day 1" }),
      ).not.toBeVisible();

      await page.getByRole("button", { name: "Trip actions" }).click();
      await page.getByRole("menuitem", { name: "Delete trip" }).click();
      await expect(
        page.getByRole("heading", { name: "Delete trip?" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Delete", exact: true }).click();

      await page.waitForURL("/dashboard");
      const response = await page.request.get(`/api/trips/${tripId}`);
      expect(response.status()).toBe(404);
    });
  });

  test.describe("tasks", () => {
    // A new trip is seeded with these default tasks (prepareDefaultTripTasks),
    // none of which have a due date since this trip has no start date set.
    const BEFORE_TASKS = [
      "Share trip plan with emergency contact",
      "Check weather forecast",
      "Pack backpack",
      "Create a meal plan",
      "Assign a packing list",
    ];

    test("renders the default tasks grouped by phase", async ({ page }) => {
      for (const name of BEFORE_TASKS) {
        // getByText would also match the unrelated "Assign a packing list"
        // button elsewhere on the page, so scope to the task's checkbox.
        await expect(page.getByRole("checkbox", { name })).toBeVisible();
      }
      await expect(
        page.getByText("Leave copy of trip plan in vehicle", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Post trip report", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Unpack", { exact: true })).toBeVisible();
    });

    test("shows the completion count across all tasks", async ({ page }) => {
      await expect(page.getByText("0/8 complete")).toBeVisible();
    });

    test.describe("completing a task", () => {
      test("checking the box persists across a reload", async ({ page }) => {
        await page.getByRole("checkbox", { name: "Pack backpack" }).click();
        await expect(
          page.getByRole("checkbox", { name: "Pack backpack" }),
        ).toBeChecked();

        await page.reload();
        await expect(
          page.getByRole("checkbox", { name: "Pack backpack" }),
        ).toBeChecked();
      });

      test("moves the completed task above its incomplete siblings", async ({
        page,
      }) => {
        await page.getByRole("checkbox", { name: "Pack backpack" }).click();
        await expect(
          page.getByRole("checkbox", { name: "Pack backpack" }),
        ).toBeChecked();

        // Tasks render one phase column at a time, so the first five
        // checkboxes on the page are always the "before" phase's tasks.
        const beforeOrder = (await page.getByRole("checkbox").all()).slice(
          0,
          5,
        );
        const names = await Promise.all(
          beforeOrder.map((checkbox) => checkbox.getAttribute("aria-label")),
        );
        expect(names[0]).toBe("Pack backpack");
      });

      test("reverts the checkbox when the update fails", async ({ page }) => {
        await page.route(`**/api/trips/${tripId}/tasks/**`, (route) => {
          if (route.request().method() === "PATCH") {
            return route.fulfill({ status: 500 });
          }
          return route.continue();
        });

        await page.getByRole("checkbox", { name: "Pack backpack" }).click();
        await expect(
          page.getByRole("checkbox", { name: "Pack backpack" }),
        ).not.toBeChecked();
      });
    });

    test.describe("editing a task", () => {
      test("editing name, phase, and due date persists across a reload", async ({
        page,
      }) => {
        await page.getByText("Pack backpack", { exact: true }).click();
        await expect(
          page.getByRole("heading", { name: "Edit task" }),
        ).toBeVisible();

        await page
          .getByRole("textbox", { name: "Name" })
          .fill("Pack backpack and tent");
        await page.getByRole("combobox", { name: "Phase" }).click();
        await page.getByRole("option", { name: "During the Trip" }).click();
        await page
          .getByRole("textbox", { name: "Due date" })
          .fill("August 20, 2026");
        // Escape would close the whole Drawer (Mantine's default
        // closeOnEscape), not just the date popover, so shift focus instead.
        await page.getByRole("textbox", { name: "Name" }).click();

        await page.getByRole("button", { name: "Save" }).click();
        await expect(
          page.getByRole("heading", { name: "Edit task" }),
        ).not.toBeVisible();

        await expect(
          page.getByText("Pack backpack and tent", { exact: true }),
        ).toBeVisible();
        await expect(page.getByText("Due Aug 20")).toBeVisible();

        await page.reload();
        await expect(
          page.getByText("Pack backpack and tent", { exact: true }),
        ).toBeVisible();
        await expect(page.getByText("Due Aug 20")).toBeVisible();
      });
    });

    test.describe("deleting a task", () => {
      test("removes the task and persists across a reload", async ({
        page,
      }) => {
        await page.getByText("Unpack", { exact: true }).click();
        await page.getByRole("button", { name: "Delete task" }).click();
        await expect(
          page.getByRole("heading", { name: "Delete task?" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Delete", exact: true }).click();

        await expect(
          page.getByText("Unpack", { exact: true }),
        ).not.toBeVisible();
        await expect(page.getByText("0/7 complete")).toBeVisible();

        await page.reload();
        await expect(
          page.getByText("Unpack", { exact: true }),
        ).not.toBeVisible();
        await expect(page.getByText("0/7 complete")).toBeVisible();
      });
    });

    test.describe("phase progress", () => {
      test("advances to During once every before-task is complete", async ({
        page,
      }) => {
        for (const name of BEFORE_TASKS) {
          await page.getByRole("checkbox", { name }).click();
          await expect(page.getByRole("checkbox", { name })).toBeChecked();
        }

        await expect(
          page
            .getByRole("button", { name: /During the Trip/ })
            .and(page.locator("[data-progress]")),
        ).toBeVisible();
      });
    });
  });

  test.describe("meal plan", () => {
    // A new trip is seeded with one meal plan day (createDefaultMealPlan),
    // since this trip has no start/end date set.
    // The mobile card view renders alongside the desktop table regardless of
    // viewport (only hidden via a CSS media query), so scoping to the
    // <table> element avoids matching the same day/item text twice.
    function table(page: Page) {
      return page.locator("table");
    }

    test("shows the default day in the table", async ({ page }) => {
      await expect(table(page).getByText("Day 1")).toBeVisible();
    });

    test.describe("adding a day", () => {
      test("adds a day and persists across a reload", async ({ page }) => {
        await page.getByRole("button", { name: "Add day" }).click();
        await expect(table(page).getByText("Day 2")).toBeVisible();

        await page.reload();
        await expect(table(page).getByText("Day 2")).toBeVisible();
      });
    });

    test.describe("opening a day", () => {
      test("opens the day's drawer", async ({ page }) => {
        await table(page).getByText("Day 1").click();
        await expect(
          page.getByRole("heading", { name: "Day 1" }),
        ).toBeVisible();
      });
    });

    test.describe("quick-adding a meal item", () => {
      test("adds the item and shows it in the table after a reload", async ({
        page,
      }) => {
        await table(page).getByText("Day 1").click();
        await expect(
          page.getByRole("heading", { name: "Day 1" }),
        ).toBeVisible();

        const input = page.getByRole("textbox", { name: "Add to Breakfast" });
        await input.fill("Granola");
        await input.press("Enter");

        await expect(
          page.getByRole("button", { name: /Granola/ }),
        ).toBeVisible();
        await expect(input).toHaveValue("");

        await page.reload();
        await expect(table(page).getByText("Granola")).toBeVisible();
      });
    });

    test.describe("searching past items from the quick-add box", () => {
      // Every new trip seeds a dateless Day 1 (createDefaultMealPlan), so a
      // freshly created "history" trip can immediately take a meal-plan-item
      // POST without any extra setup.
      async function createHistoryItemViaApi(
        page: Page,
        data: {
          name: string;
          calories: number;
          meal: string;
          waterMl?: number;
          dryWeightGrams?: number;
          quantity?: number;
        },
      ): Promise<void> {
        const historyTripId = await createTripViaApi(page, {
          name: `E2E History Trip ${Date.now()}`,
        });
        const response = await page.request.post(
          `/api/trips/${historyTripId}/meal-plan/days/1/items`,
          { data },
        );
        expect(response.ok()).toBe(true);
      }

      test("surfaces a past item's calories, water, weight, and meal at a glance", async ({
        page,
      }) => {
        const itemName = `Ramen Bomb ${Date.now()}`;
        await createHistoryItemViaApi(page, {
          name: itemName,
          calories: 890,
          meal: "dinner",
          waterMl: 500,
          dryWeightGrams: 210,
        });

        await table(page).getByText("Day 1").click();
        await page
          .getByRole("textbox", { name: "Add to Dinner" })
          .fill(itemName.slice(0, 6));

        const option = page.getByRole("option", { name: itemName });
        await expect(option).toBeVisible();
        await expect(option.getByText("890")).toBeVisible();
        await expect(option.getByText("500 mL")).toBeVisible();
        await expect(option.getByText("210 g")).toBeVisible();
        await expect(option.getByText("Dinner")).toBeVisible();
      });

      test("shows a message naming the query when no past item matches", async ({
        page,
      }) => {
        await table(page).getByText("Day 1").click();
        await page
          .getByRole("textbox", { name: "Add to Breakfast" })
          .fill("Nonexistent Meal Item ZZZ");

        await expect(
          page.getByText('No past items match "Nonexistent Meal Item ZZZ"'),
        ).toBeVisible();
      });

      test("selecting a match creates a new item with its full data", async ({
        page,
      }) => {
        const itemName = `Ramen Bomb ${Date.now()}`;
        await createHistoryItemViaApi(page, {
          name: itemName,
          calories: 890,
          meal: "dinner",
          waterMl: 500,
          dryWeightGrams: 210,
          quantity: 2,
        });

        await table(page).getByText("Day 1").click();
        const input = page.getByRole("textbox", { name: "Add to Dinner" });
        await input.fill(itemName.slice(0, 6));
        await page.getByRole("option", { name: itemName }).click();

        await expect(input).toHaveValue("");
        await expect(
          page.getByRole("button", { name: itemName }),
        ).toBeVisible();

        // Water/dry weight render through a unit converter whose default
        // unit depends on locale, so the created item's canonical values are
        // checked via the API rather than the (unit-dependent) edit form.
        const response = await page.request.get(`/api/trips/${tripId}`);
        const { trip } = await response.json();
        const created = trip.mealPlan[0].meals.dinner.find(
          (item: { name: string }) => item.name === itemName,
        );
        expect(created).toMatchObject({
          calories: 890,
          quantity: 2,
          waterMl: 500,
          dryWeightGrams: 210,
          meal: "dinner",
        });
      });

      test("assigns the currently open meal, not the match's original meal", async ({
        page,
      }) => {
        const itemName = `Snack Bar ${Date.now()}`;
        await createHistoryItemViaApi(page, {
          name: itemName,
          calories: 250,
          meal: "snacks",
        });

        await table(page).getByText("Day 1").click();
        // Search from the Breakfast slot even though the match was
        // historically logged as a snack.
        const input = page.getByRole("textbox", { name: "Add to Breakfast" });
        await input.fill(itemName.slice(0, 6));
        await page.getByRole("option", { name: itemName }).click();

        await expect(
          page.getByRole("button", { name: itemName }),
        ).toBeVisible();

        const response = await page.request.get(`/api/trips/${tripId}`);
        const { trip } = await response.json();
        const created = trip.mealPlan[0].meals.breakfast.find(
          (item: { name: string }) => item.name === itemName,
        );
        expect(created).toMatchObject({ meal: "breakfast" });
      });
    });

    test.describe("editing a meal item", () => {
      test("editing name, meal, and calories persists across a reload", async ({
        page,
      }) => {
        await table(page).getByText("Day 1").click();
        const input = page.getByRole("textbox", { name: "Add to Breakfast" });
        await input.fill("Granola");
        await input.press("Enter");
        await expect(
          page.getByRole("button", { name: /Granola/ }),
        ).toBeVisible();

        await page.getByRole("button", { name: /Granola/ }).click();
        await expect(
          page.getByRole("heading", { name: "Edit item" }),
        ).toBeVisible();

        await page.getByRole("textbox", { name: /^Name/ }).fill("Trail mix");
        await page.getByRole("combobox", { name: "Meal" }).click();
        await page.getByRole("option", { name: "Snacks" }).click();
        await page.getByRole("textbox", { name: "Calories" }).fill("400");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(
          page.getByRole("heading", { name: "Edit item" }),
        ).not.toBeVisible();
        await expect(
          page.getByRole("button", { name: /Trail mix/ }),
        ).toBeVisible();

        await page.reload();
        await expect(table(page).getByText("Trail mix")).toBeVisible();
      });

      test("entering water and dry weight in non-default units persists the correct canonical values", async ({
        page,
      }) => {
        await table(page).getByText("Day 1").click();
        const input = page.getByRole("textbox", { name: "Add to Breakfast" });
        await input.fill("Granola");
        await input.press("Enter");
        await expect(
          page.getByRole("button", { name: /Granola/ }),
        ).toBeVisible();

        await page.getByRole("button", { name: /Granola/ }).click();
        await expect(
          page.getByRole("heading", { name: "Edit item" }),
        ).toBeVisible();

        await page.getByRole("combobox", { name: "Water unit" }).click();
        await page.getByRole("option", { name: "Liters (L)" }).click();
        await page.getByRole("textbox", { name: "Water" }).fill("0.5");

        await page.getByRole("combobox", { name: "Dry weight unit" }).click();
        await page.getByRole("option", { name: "Kilograms (kg)" }).click();
        await page.getByRole("textbox", { name: "Dry weight" }).fill("0.1");

        await page.getByRole("button", { name: "Save" }).click();
        await expect(
          page.getByRole("heading", { name: "Edit item" }),
        ).not.toBeVisible();

        // Reopen and re-select the same units to confirm the canonical ml/g
        // values round-tripped through the backend without drifting.
        await page.getByRole("button", { name: /Granola/ }).click();
        await expect(
          page.getByRole("heading", { name: "Edit item" }),
        ).toBeVisible();
        await page.getByRole("combobox", { name: "Water unit" }).click();
        await page.getByRole("option", { name: "Liters (L)" }).click();
        await expect(page.getByRole("textbox", { name: "Water" })).toHaveValue(
          "0.5",
        );
        await page.getByRole("combobox", { name: "Dry weight unit" }).click();
        await page.getByRole("option", { name: "Kilograms (kg)" }).click();
        await expect(
          page.getByRole("textbox", { name: "Dry weight" }),
        ).toHaveValue("0.1");
        await page.getByRole("button", { name: "Save" }).click();

        await page.reload();
        await table(page).getByText("Day 1").click();
        await page.getByRole("button", { name: /Granola/ }).click();
        await expect(
          page.getByRole("heading", { name: "Edit item" }),
        ).toBeVisible();
        await page.getByRole("combobox", { name: "Water unit" }).click();
        await page.getByRole("option", { name: "Liters (L)" }).click();
        await expect(page.getByRole("textbox", { name: "Water" })).toHaveValue(
          "0.5",
        );
        await page.getByRole("combobox", { name: "Dry weight unit" }).click();
        await page.getByRole("option", { name: "Kilograms (kg)" }).click();
        await expect(
          page.getByRole("textbox", { name: "Dry weight" }),
        ).toHaveValue("0.1");
      });
    });

    test.describe("deleting a meal item", () => {
      async function addItem(page: Page) {
        await table(page).getByText("Day 1").click();
        const input = page.getByRole("textbox", { name: "Add to Breakfast" });
        await input.fill("Granola");
        await input.press("Enter");
        await expect(
          page.getByRole("button", { name: /Granola/ }),
        ).toBeVisible();
        await page.getByRole("button", { name: /Granola/ }).click();
        await expect(
          page.getByRole("heading", { name: "Edit item" }),
        ).toBeVisible();
      }

      test("removes the item and persists across a reload", async ({
        page,
      }) => {
        await addItem(page);

        await page.getByRole("button", { name: "Remove item" }).click();
        await expect(
          page.getByRole("heading", { name: "Remove item?" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Remove", exact: true }).click();

        await expect(
          page.getByRole("button", { name: /Granola/ }),
        ).not.toBeVisible();

        await page.reload();
        await expect(table(page).getByText("Granola")).not.toBeVisible();
      });

      test("does not delete when cancelled", async ({ page }) => {
        await addItem(page);

        await page.getByRole("button", { name: "Remove item" }).click();
        await page.getByRole("button", { name: "Cancel" }).click();

        // Cancel only closes the confirmation modal; the item edit form
        // underneath is still showing the item that would've been removed.
        await expect(
          page.getByRole("heading", { name: "Edit item" }),
        ).toBeVisible();
        await expect(page.getByRole("textbox", { name: /^Name/ })).toHaveValue(
          "Granola",
        );
      });
    });

    test.describe("editing a day's date", () => {
      test("sets the date and persists across a reload", async ({ page }) => {
        await table(page).getByText("Day 1").click();
        const drawer = page.getByRole("dialog");
        await expect(
          drawer.getByRole("heading", { name: "Day 1" }),
        ).toBeVisible();

        // A trip with no start/end date seeds Day 1 with no date, so the
        // drawer shows the "Add date" affordance instead of a formatted date.
        await drawer.getByText("Add date").click();
        const input = drawer.getByPlaceholder("Pick a date");
        await input.fill("August 15, 2026");
        await input.press("Escape");

        await expect(drawer.getByText("Aug 15")).toBeVisible();
        await expect(table(page).getByText("Aug 15")).toBeVisible();

        await page.reload();
        await expect(table(page).getByText("Aug 15")).toBeVisible();
      });

      test("changing an existing date persists across a reload", async ({
        page,
      }) => {
        await table(page).getByText("Day 1").click();
        const drawer = page.getByRole("dialog");
        await drawer.getByText("Add date").click();
        const firstInput = drawer.getByPlaceholder("Pick a date");
        await firstInput.fill("August 15, 2026");
        await firstInput.press("Escape");
        await expect(drawer.getByText("Aug 15")).toBeVisible();

        // Reload before the second edit rather than immediately re-clicking
        // the just-saved text: the first save's cache invalidation refetch
        // re-renders that text node shortly after it appears, and clicking
        // it mid-flight can hit it between detach and reattach.
        await page.reload();
        await table(page).getByText("Day 1").click();
        await drawer.getByText("Aug 15").click();
        const secondInput = drawer.getByPlaceholder("Pick a date");
        await secondInput.fill("August 20, 2026");
        await secondInput.press("Escape");

        await expect(drawer.getByText("Aug 20")).toBeVisible();

        await page.reload();
        await expect(table(page).getByText("Aug 20")).toBeVisible();
      });

      test("shows an error notification when the date save fails", async ({
        page,
      }) => {
        await page.route(`**/api/trips/${tripId}/meal-plan/days/1`, (route) => {
          if (route.request().method() === "PATCH") {
            return route.fulfill({ status: 500 });
          }
          return route.continue();
        });

        await table(page).getByText("Day 1").click();
        const drawer = page.getByRole("dialog");
        await drawer.getByText("Add date").click();
        await drawer.getByPlaceholder("Pick a date").fill("August 15, 2026");

        await expect(
          page.getByText("Couldn't update the day's date"),
        ).toBeVisible();
      });
    });

    test.describe("removing a day", () => {
      test("removes the day and persists across a reload", async ({ page }) => {
        await page.getByRole("button", { name: "Add day" }).click();
        await expect(table(page).getByText("Day 2")).toBeVisible();

        await table(page).getByText("Day 2").click();
        const drawer = page.getByRole("dialog");
        await expect(
          drawer.getByRole("heading", { name: "Day 2" }),
        ).toBeVisible();

        await drawer.getByRole("button", { name: "Remove day" }).click();
        await expect(page.getByText("Remove day?")).toBeVisible();
        await page.getByRole("button", { name: "Remove", exact: true }).click();

        await expect(table(page).getByText("Day 2")).not.toBeVisible();

        await page.reload();
        await expect(table(page).getByText("Day 2")).not.toBeVisible();
      });

      test("does not delete when cancelled", async ({ page }) => {
        await table(page).getByText("Day 1").click();
        const drawer = page.getByRole("dialog");
        await expect(
          drawer.getByRole("heading", { name: "Day 1" }),
        ).toBeVisible();

        await drawer.getByRole("button", { name: "Remove day" }).click();
        await page.getByRole("button", { name: "Cancel" }).click();

        await expect(
          drawer.getByRole("heading", { name: "Day 1" }),
        ).toBeVisible();
        await expect(table(page).getByText("Day 1")).toBeVisible();
      });

      test("shows an error notification when the removal fails", async ({
        page,
      }) => {
        await page.route(`**/api/trips/${tripId}/meal-plan/days/1`, (route) => {
          if (route.request().method() === "DELETE") {
            return route.fulfill({ status: 500 });
          }
          return route.continue();
        });

        await table(page).getByText("Day 1").click();
        const drawer = page.getByRole("dialog");
        await drawer.getByRole("button", { name: "Remove day" }).click();
        await page.getByRole("button", { name: "Remove", exact: true }).click();

        await expect(page.getByText("Couldn't remove day")).toBeVisible();
      });
    });
  });

  test.describe("links", () => {
    test.describe("creating a link", () => {
      test("adds the link and shows it after a reload", async ({ page }) => {
        // example.com has no Open Graph tags, so the card falls back to
        // showing the full url — this keeps the assertion independent of
        // whatever the live fetch happens to return.
        const url = "https://example.com/";
        await page.getByRole("textbox", { name: "Link URL" }).fill(url);
        await page.getByRole("button", { name: "Add", exact: true }).click();

        await expect(page.getByText(url)).toBeVisible();

        await page.reload();
        await expect(page.getByText(url)).toBeVisible();
      });

      test("shows an error notification when the create fails", async ({
        page,
      }) => {
        await page.route(`**/api/trips/${tripId}/links`, (route) => {
          if (route.request().method() === "POST") {
            return route.fulfill({ status: 500 });
          }
          return route.continue();
        });

        await page
          .getByRole("textbox", { name: "Link URL" })
          .fill("https://example.com/");
        await page.getByRole("button", { name: "Add", exact: true }).click();

        await expect(page.getByText("Couldn't add link")).toBeVisible();
      });

      test("rejects a duplicate url without calling the API", async ({
        page,
      }) => {
        // Seeded directly in the DB rather than through the composer, so this
        // test doesn't depend on a second live Open Graph fetch.
        await db.tripLink.create({
          data: make("TripLink", {
            tripId,
            url: "https://nps.gov/mora",
          }),
        });
        await page.reload();

        await page
          .getByRole("textbox", { name: "Link URL" })
          .fill("https://nps.gov/mora");
        await page.getByRole("button", { name: "Add", exact: true }).click();

        await expect(
          page.getByText("That URL already exists on this trip."),
        ).toBeVisible();
      });
    });

    test.describe("with an existing link", () => {
      const linkUrl = "https://nps.gov/mora";

      test.beforeEach(async ({ page }) => {
        await db.tripLink.create({
          data: make("TripLink", {
            tripId,
            url: linkUrl,
            name: "Mount Rainier National Park",
            description: "Home to the most glaciated peak in the lower 48.",
          }),
        });
        await page.reload();
        await expect(
          page.getByText("Mount Rainier National Park"),
        ).toBeVisible();
      });

      test("opening a link", async ({ page }) => {
        await expect(
          page.getByRole("link", { name: "Open Mount Rainier National Park" }),
        ).toHaveAttribute("href", linkUrl);
      });

      test.describe("editing a link", () => {
        test("editing the title persists across a reload", async ({ page }) => {
          await page.getByText("Mount Rainier National Park").click();
          const titleInput = page.getByRole("textbox", { name: "Link title" });
          await titleInput.fill("Mount Rainier NP");
          await titleInput.press("Enter");

          await expect(page.getByText("Mount Rainier NP")).toBeVisible();

          await page.reload();
          await expect(page.getByText("Mount Rainier NP")).toBeVisible();
        });

        test("editing the description persists across a reload", async ({
          page,
        }) => {
          await page
            .getByText("Home to the most glaciated peak in the lower 48.")
            .click();
          const descriptionInput = page.getByRole("textbox", {
            name: "Link description",
          });
          await descriptionInput.fill("A dormant volcano in Washington state.");
          await descriptionInput.blur();

          await expect(
            page.getByText("A dormant volcano in Washington state."),
          ).toBeVisible();

          await page.reload();
          await expect(
            page.getByText("A dormant volcano in Washington state."),
          ).toBeVisible();
        });

        test("cancels the edit on Escape without saving", async ({ page }) => {
          await page.getByText("Mount Rainier National Park").click();
          const titleInput = page.getByRole("textbox", { name: "Link title" });
          await titleInput.fill("Should not persist");
          await titleInput.press("Escape");

          await expect(
            page.getByText("Mount Rainier National Park"),
          ).toBeVisible();
          await expect(page.getByText("Should not persist")).not.toBeVisible();
        });

        test("shows an error and reverts the title when the save fails", async ({
          page,
        }) => {
          await page.route(`**/api/trips/${tripId}/links/**`, (route) => {
            if (route.request().method() === "PATCH") {
              return route.fulfill({ status: 500 });
            }
            return route.continue();
          });

          await page.getByText("Mount Rainier National Park").click();
          const titleInput = page.getByRole("textbox", { name: "Link title" });
          await titleInput.fill("Should not persist");
          await titleInput.press("Enter");

          await expect(page.getByText("Couldn't update title")).toBeVisible();
          await expect(
            page.getByText("Mount Rainier National Park"),
          ).toBeVisible();
        });

        test("shows an error and reverts the description when the save fails", async ({
          page,
        }) => {
          await page.route(`**/api/trips/${tripId}/links/**`, (route) => {
            if (route.request().method() === "PATCH") {
              return route.fulfill({ status: 500 });
            }
            return route.continue();
          });

          await page
            .getByText("Home to the most glaciated peak in the lower 48.")
            .click();
          const descriptionInput = page.getByRole("textbox", {
            name: "Link description",
          });
          await descriptionInput.fill("Should not persist");
          await descriptionInput.blur();

          await expect(
            page.getByText("Couldn't update description"),
          ).toBeVisible();
          await expect(
            page.getByText("Home to the most glaciated peak in the lower 48."),
          ).toBeVisible();
        });
      });

      test.describe("deleting a link", () => {
        test("removes the link and persists across a reload", async ({
          page,
        }) => {
          await page.getByText("Mount Rainier National Park").hover();
          await page.getByRole("button", { name: "Delete link" }).click();
          await expect(
            page.getByRole("heading", { name: "Delete link?" }),
          ).toBeVisible();
          await page
            .getByRole("button", { name: "Delete", exact: true })
            .click();

          await expect(
            page.getByRole("heading", { name: "Delete link?" }),
          ).not.toBeVisible();
          await expect(
            page.getByText("Mount Rainier National Park"),
          ).not.toBeVisible();

          await page.reload();
          await expect(
            page.getByText("Mount Rainier National Park"),
          ).not.toBeVisible();
        });

        test("does not delete when cancelled", async ({ page }) => {
          await page.getByText("Mount Rainier National Park").hover();
          await page.getByRole("button", { name: "Delete link" }).click();
          await expect(
            page.getByRole("heading", { name: "Delete link?" }),
          ).toBeVisible();
          await page.getByRole("button", { name: "Cancel" }).click();

          await expect(
            page.getByRole("heading", { name: "Delete link?" }),
          ).not.toBeVisible();
          await expect(
            page.getByText("Mount Rainier National Park"),
          ).toBeVisible();
        });

        test("shows an error notification when the delete fails", async ({
          page,
        }) => {
          await page.route(`**/api/trips/${tripId}/links/**`, (route) => {
            if (route.request().method() === "DELETE") {
              return route.fulfill({ status: 500 });
            }
            return route.continue();
          });

          await page.getByText("Mount Rainier National Park").hover();
          await page.getByRole("button", { name: "Delete link" }).click();
          await expect(
            page.getByRole("heading", { name: "Delete link?" }),
          ).toBeVisible();
          await page
            .getByRole("button", { name: "Delete", exact: true })
            .click();

          await expect(page.getByText("Couldn't delete link")).toBeVisible();
          // Optimistic delete rolls back on failure — the link should still
          // be there.
          await expect(
            page.getByText("Mount Rainier National Park"),
          ).toBeVisible();
        });
      });
    });
  });

  test.describe("packing list", () => {
    async function createOwnedPackingList(
      page: Page,
      name: string,
    ): Promise<string> {
      const response = await page.request.post("/api/packing-lists", {
        data: { name },
      });
      expect(response.ok()).toBe(true);
      const { packingList } = await response.json();
      return packingList.id;
    }

    async function addSectionViaApi(
      page: Page,
      listId: string,
      name: string,
    ): Promise<string> {
      const response = await page.request.post(
        `/api/packing-lists/${listId}/sections`,
        { data: { name } },
      );
      expect(response.ok()).toBe(true);
      const { section } = await response.json();
      return section.id;
    }

    async function addItemViaApi(
      page: Page,
      listId: string,
      sectionId: string,
      name: string,
      optional = false,
    ): Promise<void> {
      const response = await page.request.post(
        `/api/packing-lists/${listId}/sections/${sectionId}/items`,
        { data: { name, quantity: 1, optional } },
      );
      expect(response.ok()).toBe(true);
    }

    async function assignPackingListViaApi(
      page: Page,
      listId: string,
    ): Promise<void> {
      const response = await page.request.post(
        `/api/trips/${tripId}/packing-list`,
        { data: { packingListId: listId } },
      );
      expect(response.ok()).toBe(true);
    }

    test.describe("with no list assigned", () => {
      test("shows the empty state", async ({ page }) => {
        await expect(page.getByText("No packing list assigned")).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Assign a packing list" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Remove packing list assignment" }),
        ).not.toBeVisible();
      });
    });

    test.describe("assigning a packing list", () => {
      test("shows it on the trip, closes the drawer, and persists across a reload", async ({
        page,
      }) => {
        const listName = `E2E Packing List ${Date.now()}`;
        await createOwnedPackingList(page, listName);

        await page
          .getByRole("button", { name: "Assign a packing list" })
          .click();
        await page
          .getByRole("textbox", { name: /Packing list/i })
          .fill(listName);
        await page.getByRole("option", { name: listName }).click();
        await page.getByRole("button", { name: "Assign list" }).click();

        await expect(
          page.getByRole("textbox", { name: /Packing list/i }),
        ).not.toBeVisible();
        await expect(page.getByText(listName)).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Remove packing list assignment" }),
        ).toBeVisible();

        await page.reload();
        await expect(page.getByText(listName)).toBeVisible();
      });

      test("searches only lists the user owns", async ({ page }) => {
        await page
          .getByRole("button", { name: "Assign a packing list" })
          .click();
        await page
          .getByRole("textbox", { name: /Packing list/i })
          .fill("Definitely Not A Real List Name");
        await expect(page.getByText("No packing lists found")).toBeVisible();
      });
    });

    test.describe("with an assigned list", () => {
      let listName: string;
      let listId: string;
      let sectionId: string;

      test.beforeEach(async ({ page }) => {
        listName = `E2E Kit ${Date.now()}`;
        listId = await createOwnedPackingList(page, listName);
        sectionId = await addSectionViaApi(page, listId, "Shelter");
        await addItemViaApi(page, listId, sectionId, "Tent");
        await addItemViaApi(page, listId, sectionId, "Stakes");
        await assignPackingListViaApi(page, listId);
        await page.reload();
      });

      test("shows the list name and its sections", async ({ page }) => {
        await expect(page.getByText(listName)).toBeVisible();
        await expect(page.getByText("Shelter")).toBeVisible();
      });

      test("shows the overall packed percentage, starting at 0%", async ({
        page,
      }) => {
        await expect(page.getByText("0%")).toBeVisible();
      });

      test("expands a section to reveal its items", async ({ page }) => {
        await page.getByText("Shelter").click();
        await expect(
          page.getByRole("checkbox", { name: "Tent" }),
        ).toBeVisible();
        await expect(
          page.getByRole("checkbox", { name: "Stakes" }),
        ).toBeVisible();
      });

      test.describe("toggling an item's packed state", () => {
        test("checks the item, updates the percentage, and persists across a reload", async ({
          page,
        }) => {
          await page.getByText("Shelter").click();
          await page.getByRole("checkbox", { name: "Tent" }).click();
          await expect(
            page.getByRole("checkbox", { name: "Tent" }),
          ).toBeChecked();
          await expect(page.getByText("50%")).toBeVisible();

          await page.reload();
          await page.getByText("Shelter").click();
          await expect(
            page.getByRole("checkbox", { name: "Tent" }),
          ).toBeChecked();
          await expect(page.getByText("50%")).toBeVisible();
        });

        test("unchecking a packed item reverts the percentage", async ({
          page,
        }) => {
          await page.getByText("Shelter").click();
          const tent = page.getByRole("checkbox", { name: "Tent" });
          await tent.click();
          await expect(tent).toBeChecked();
          await tent.click();
          await expect(tent).not.toBeChecked();
          await expect(page.getByText("0%")).toBeVisible();
        });
      });

      test.describe("marking an item as not needed", () => {
        test("excludes it from the progress count and lists it under 'not needed'", async ({
          page,
        }) => {
          await page.getByText("Shelter").click();
          await page.getByText("Tent").hover();
          await page
            .getByRole("button", {
              name: "Mark Tent as not needed for this trip",
            })
            .click();

          await expect(
            page.getByText("Not needed for this trip (1)"),
          ).toBeVisible();
          // Tent is excluded, leaving only Stakes (unpacked) in the count.
          await expect(page.getByText("0%")).toBeVisible();
          await expect(
            page.getByRole("checkbox", { name: "Tent" }),
          ).not.toBeVisible();
        });

        test.describe("including it again", () => {
          test("restores it to the active list and the progress count", async ({
            page,
          }) => {
            await page.getByText("Shelter").click();
            await page.getByText("Tent").hover();
            await page
              .getByRole("button", {
                name: "Mark Tent as not needed for this trip",
              })
              .click();

            await page.getByText("Not needed for this trip (1)").click();
            await page.getByRole("button", { name: "Include" }).click();

            await expect(
              page.getByRole("checkbox", { name: "Tent" }),
            ).toBeVisible();
            await expect(
              page.getByText("Not needed for this trip"),
            ).not.toBeVisible();
          });
        });
      });

      test.describe("removing the assignment", () => {
        test("shows a confirmation explaining the effect", async ({ page }) => {
          await page
            .getByRole("button", { name: "Remove packing list assignment" })
            .click();

          await expect(
            page.getByRole("heading", {
              name: "Remove packing list assignment?",
            }),
          ).toBeVisible();
          await expect(
            page.getByText(/all packing list item statuses/),
          ).toBeVisible();
          await expect(page.getByText(/won.t be affected/)).toBeVisible();
        });

        test("does not remove the assignment when cancelled", async ({
          page,
        }) => {
          await page
            .getByRole("button", { name: "Remove packing list assignment" })
            .click();
          await page.getByRole("button", { name: "Cancel" }).click();

          await expect(
            page.getByRole("heading", {
              name: "Remove packing list assignment?",
            }),
          ).not.toBeVisible();
          await expect(page.getByText(listName)).toBeVisible();
        });

        test("shows the empty state and persists across a reload when confirmed", async ({
          page,
        }) => {
          await page
            .getByRole("button", { name: "Remove packing list assignment" })
            .click();
          await page
            .getByRole("button", { name: "Remove", exact: true })
            .click();

          await expect(
            page.getByText("No packing list assigned"),
          ).toBeVisible();
          await expect(page.getByText(listName)).not.toBeVisible();

          await page.reload();
          await expect(
            page.getByText("No packing list assigned"),
          ).toBeVisible();
        });
      });
    });
  });

  test.describe("meal plan section on the packing list", () => {
    // "Meal Plan" also labels the Meal Plan section's own <h3> higher on the
    // page, so the pinned card (badged "Auto-synced") is targeted through
    // that badge rather than by its ambiguous "Meal Plan" row text.
    async function addMealPlanItemViaApi(
      page: Page,
      dayNumber: number,
      name: string,
    ): Promise<void> {
      const response = await page.request.post(
        `/api/trips/${tripId}/meal-plan/days/${dayNumber}/items`,
        { data: { name, meal: "breakfast", quantity: 1 } },
      );
      expect(response.ok()).toBe(true);
    }

    async function createOwnedPackingList(
      page: Page,
      name: string,
    ): Promise<string> {
      const response = await page.request.post("/api/packing-lists", {
        data: { name },
      });
      expect(response.ok()).toBe(true);
      const { packingList } = await response.json();
      return packingList.id;
    }

    async function assignPackingListViaApi(
      page: Page,
      listId: string,
    ): Promise<void> {
      const response = await page.request.post(
        `/api/trips/${tripId}/packing-list`,
        { data: { packingListId: listId } },
      );
      expect(response.ok()).toBe(true);
    }

    test.describe("with no packing list assigned", () => {
      test("shows the pinned section alongside the full empty state and its call to action", async ({
        page,
      }) => {
        await addMealPlanItemViaApi(page, 1, "Instant Oatmeal");
        await page.reload();

        await expect(page.getByText("Auto-synced")).toBeVisible();
        await expect(page.getByText("No packing list assigned")).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Assign a packing list" }),
        ).toBeVisible();
      });

      test("still renders the progress overview", async ({ page }) => {
        await addMealPlanItemViaApi(page, 1, "Instant Oatmeal");
        await page.reload();

        await expect(page.getByText("Packing Progress")).toBeVisible();
        await expect(page.getByText("0%")).toBeVisible();
      });
    });

    test.describe("toggling purchased and packed", () => {
      test("persists across a reload", async ({ page }) => {
        await addMealPlanItemViaApi(page, 1, "Instant Oatmeal");
        await page.reload();

        await page.getByText("Auto-synced").click();
        await page
          .getByRole("checkbox", {
            name: "Mark Instant Oatmeal as purchased",
          })
          .click();
        await page
          .getByRole("checkbox", { name: "Mark Instant Oatmeal as packed" })
          .click();

        await expect(
          page.getByRole("checkbox", {
            name: "Mark Instant Oatmeal as purchased",
          }),
        ).toBeChecked();
        await expect(
          page.getByRole("checkbox", {
            name: "Mark Instant Oatmeal as packed",
          }),
        ).toBeChecked();

        await page.reload();
        await page.getByText("Auto-synced").click();
        await expect(
          page.getByRole("checkbox", {
            name: "Mark Instant Oatmeal as purchased",
          }),
        ).toBeChecked();
        await expect(
          page.getByRole("checkbox", {
            name: "Mark Instant Oatmeal as packed",
          }),
        ).toBeChecked();
      });
    });

    test.describe("with a packing list assigned", () => {
      test("keeps the pinned section and folds it into the combined progress", async ({
        page,
      }) => {
        await addMealPlanItemViaApi(page, 1, "Instant Oatmeal");
        const listId = await createOwnedPackingList(
          page,
          `E2E Meal Kit ${Date.now()}`,
        );
        await assignPackingListViaApi(page, listId);
        await page.reload();

        await expect(page.getByText("Auto-synced")).toBeVisible();

        await page.getByText("Auto-synced").click();
        await page
          .getByRole("checkbox", { name: "Mark Instant Oatmeal as packed" })
          .click();

        // The meal item is the only trackable item on this otherwise-empty
        // assigned list, so packing it brings the combined ring to 100%.
        await expect(page.getByText("100%")).toBeVisible();
      });
    });
  });
});

test.describe("Trip Page - mobile meal plan", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // The mobile card view and desktop table both render regardless of
  // viewport (only hidden via a CSS media query), with the mobile card
  // rendering after the table in the DOM, so `.last()` picks the visible one.
  test.beforeEach(async ({ page, user }) => {
    void user;
    const tripId = await createTripViaApi(page, {
      name: `E2E Mobile Trip ${Date.now()}`,
    });
    await page.goto(`/trips/${tripId}`);
    await expect(page.getByText("Day 1").last()).toBeVisible();
  });

  test("editing a day's date works via the mobile card", async ({ page }) => {
    await page.getByText("Day 1").last().click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("heading", { name: "Day 1" })).toBeVisible();

    await drawer.getByText("Add date").click();
    const input = drawer.getByPlaceholder("Pick a date");
    await input.fill("August 15, 2026");
    await input.press("Escape");

    await expect(drawer.getByText("Aug 15")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Aug 15").last()).toBeVisible();
  });

  test("removing a day works via the mobile card", async ({ page }) => {
    await page.getByText("Day 1").last().click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("heading", { name: "Day 1" })).toBeVisible();

    await drawer.getByRole("button", { name: "Remove day" }).click();
    await expect(page.getByText("Remove day?")).toBeVisible();
    await page.getByRole("button", { name: "Remove", exact: true }).click();

    await expect(page.getByText("No meals planned yet.")).toBeVisible();

    await page.reload();
    await expect(page.getByText("No meals planned yet.")).toBeVisible();
  });
});
