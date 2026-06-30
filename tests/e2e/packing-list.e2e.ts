import { expect, test, type Page } from "@playwright/test";

const USER = { email: "user@test.com", password: "user-password" };

async function signIn(page: Page, user = USER) {
  await page.goto("/sign-in?redirect=/dashboard");
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

// There is no create-list UI yet, so seed an owned (editable) list straight
// through the API. `page.request` shares the signed-in browser cookies.
async function createOwnedList(page: Page, name: string): Promise<number> {
  const response = await page.request.post("/api/packing-lists", {
    data: { name },
  });
  expect(response.ok()).toBe(true);
  const { packingList } = await response.json();
  return packingList.id;
}

async function findListIdByName(page: Page, name: string): Promise<number> {
  const response = await page.request.get(
    `/api/packing-lists?query=${encodeURIComponent(name)}`,
  );
  const { packingLists } = await response.json();
  const match = packingLists.find(
    (list: { name: string }) => list.name === name,
  );
  if (!match) throw new Error(`No packing list found named "${name}"`);
  return match.id;
}

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
});

test.describe("Packing List Page", () => {
  test.describe("an editable list (owned by the user)", () => {
    let listName: string;

    test.beforeEach(async ({ page }) => {
      await signIn(page);
      listName = `E2E Editable ${Date.now()}`;
      const listId = await createOwnedList(page, listName);
      await page.goto(`/packing-lists/${listId}`);
      await expect(
        page.getByRole("heading", { level: 1, name: listName }),
      ).toBeVisible();
    });

    test("clicking the title enters edit mode", async ({ page }) => {
      await page.getByRole("heading", { level: 1, name: listName }).click();
      await expect(page.getByRole("textbox")).toHaveValue(listName);
    });

    test("renaming the list persists the new name across a reload", async ({
      page,
    }) => {
      const newName = `E2E Renamed ${Date.now()}`;
      await page.getByRole("heading", { level: 1, name: listName }).click();
      await page.getByRole("textbox").fill(newName);
      await page.getByRole("textbox").press("Enter");

      // Optimistic update flips the heading immediately.
      await expect(
        page.getByRole("heading", { level: 1, name: newName }),
      ).toBeVisible();

      // The new name survives a reload, proving it was persisted.
      await page.reload();
      await expect(
        page.getByRole("heading", { level: 1, name: newName }),
      ).toBeVisible();
    });

    test("shows an error and reverts the name when the save fails", async ({
      page,
    }) => {
      await page.route("**/api/packing-lists/*", (route) => {
        if (route.request().method() === "PATCH") {
          return route.fulfill({ status: 500 });
        }
        return route.continue();
      });

      await page.getByRole("heading", { level: 1, name: listName }).click();
      await page.getByRole("textbox").fill("This rename should fail");
      await page.getByRole("textbox").press("Enter");

      await expect(page.getByText("Couldn't rename list")).toBeVisible();
      // Rolled back to the original name after the failed save.
      await expect(
        page.getByRole("heading", { level: 1, name: listName }),
      ).toBeVisible();
    });

    test("editing the description persists across a reload", async ({
      page,
    }) => {
      const description = `Trip notes ${Date.now()}`;
      // A new list has no description, so it shows the placeholder.
      await page.getByText("Add a description").click();
      await page.getByRole("textbox").fill(description);
      await page.getByRole("textbox").press("Enter");

      await expect(page.getByText(description)).toBeVisible();

      await page.reload();
      await expect(page.getByText(description)).toBeVisible();
    });
  });

  test.describe("a non-editable list (public, not owned)", () => {
    const REI_LIST = "REI Backpacking Checklist";

    test.beforeEach(async ({ page }) => {
      await signIn(page);
      const listId = await findListIdByName(page, REI_LIST);
      await page.goto(`/packing-lists/${listId}`);
      await expect(
        page.getByRole("heading", { level: 1, name: REI_LIST }),
      ).toBeVisible();
    });

    test("clicking the title does not enter edit mode", async ({ page }) => {
      await page.getByRole("heading", { level: 1, name: REI_LIST }).click();
      await expect(page.getByRole("textbox")).not.toBeVisible();
    });
  });
});
