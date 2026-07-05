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
});
