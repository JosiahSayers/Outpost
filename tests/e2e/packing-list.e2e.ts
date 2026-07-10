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

async function addSectionViaApi(
  page: Page,
  listId: number,
  name: string,
): Promise<number> {
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
  listId: number,
  sectionId: number,
  name: string,
  optional = false,
) {
  const response = await page.request.post(
    `/api/packing-lists/${listId}/sections/${sectionId}/items`,
    { data: { name, quantity: 1, optional } },
  );
  expect(response.ok()).toBe(true);
}

// A section card is the wrapper around one section's header and items.
function sectionCard(page: Page, name: string) {
  return page.locator("div[data-section-id]").filter({ hasText: name });
}

async function itemY(page: Page, name: string): Promise<number> {
  const box = await page.getByText(name).boundingBox();
  if (!box) throw new Error(`No item row found for "${name}"`);
  return box.y;
}

// Drive a dnd-kit pointer drag of one item's handle onto another item. dnd-kit's
// PointerSensor needs an initial movement to activate, then intermediate moves
// to track the drag, so a plain dragTo won't do.
async function dragItemOnto(page: Page, fromName: string, toName: string) {
  await page.getByText(fromName).hover();
  const handle = page.getByRole("button", { name: `Reorder ${fromName}` });
  const handleBox = await handle.boundingBox();
  const targetBox = await page.getByText(toName).boundingBox();
  if (!handleBox || !targetBox) throw new Error("Missing drag geometry");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY - 8, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 15 });
  await page.mouse.move(endX, endY, { steps: 5 });
  await page.mouse.up();
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
    let listId: number;

    test.beforeEach(async ({ page }) => {
      await signIn(page);
      listName = `E2E Editable ${Date.now()}`;
      listId = await createOwnedList(page, listName);
      await page.goto(`/packing-lists/${listId}`);
      await expect(
        page.getByRole("heading", { level: 1, name: listName }),
      ).toBeVisible();
    });

    test("the back link returns to the dashboard", async ({ page }) => {
      await page.getByRole("link", { name: "Back to Dashboard" }).click();
      await page.waitForURL("/dashboard");
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

    test("deleting the list navigates to /dashboard and removes the list", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /delete list/i }).click();
      await expect(page.getByText(`"${listName}"`)).toBeVisible();
      await page.getByRole("button", { name: "Delete", exact: true }).click();

      await page.waitForURL("/dashboard");
      const response = await page.request.get(`/api/packing-lists/${listId}`);
      expect(response.status()).toBe(404);
    });

    test("shows an error notification when the delete fails", async ({
      page,
    }) => {
      await page.route(`**/api/packing-lists/${listId}`, (route) => {
        if (route.request().method() === "DELETE") {
          return route.fulfill({ status: 500 });
        }
        return route.continue();
      });

      await page.getByRole("button", { name: /delete list/i }).click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();

      await expect(page.getByText("Couldn't delete list")).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 1, name: listName }),
      ).toBeVisible();
    });

    test.describe("sections", () => {
      test("adding a section reveals it in edit mode and persists", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "Add section" }).click();

        const input = page.getByRole("textbox");
        await expect(input).toHaveValue("New section");
        await input.fill("Camp Kitchen");
        await input.press("Enter");

        await expect(
          page.getByRole("heading", { level: 5, name: "Camp Kitchen" }),
        ).toBeVisible();

        await page.reload();
        await expect(
          page.getByRole("heading", { level: 5, name: "Camp Kitchen" }),
        ).toBeVisible();
      });

      test("renaming a section persists across a reload", async ({ page }) => {
        await addSectionViaApi(page, listId, "Original Section");
        await page.reload();

        await page
          .getByRole("heading", { level: 5, name: "Original Section" })
          .click();
        const input = page.getByRole("textbox");
        await input.fill("Renamed Section");
        await input.press("Enter");

        await expect(
          page.getByRole("heading", { level: 5, name: "Renamed Section" }),
        ).toBeVisible();

        await page.reload();
        await expect(
          page.getByRole("heading", { level: 5, name: "Renamed Section" }),
        ).toBeVisible();
      });

      test("deleting a section removes it and persists", async ({ page }) => {
        await addSectionViaApi(page, listId, "Doomed Section");
        await page.reload();

        const card = sectionCard(page, "Doomed Section");
        await card
          .getByRole("heading", { level: 5, name: "Doomed Section" })
          .hover();
        await card.getByRole("button", { name: "Delete section" }).click();

        await expect(page.getByText("Delete section?")).toBeVisible();
        await page.getByRole("button", { name: "Delete", exact: true }).click();

        await expect(
          page.getByRole("heading", { level: 5, name: "Doomed Section" }),
        ).not.toBeVisible();

        await page.reload();
        await expect(
          page.getByRole("heading", { level: 5, name: "Doomed Section" }),
        ).not.toBeVisible();
      });

      test("moving a section up reorders it and persists", async ({ page }) => {
        await addSectionViaApi(page, listId, "First Section");
        await addSectionViaApi(page, listId, "Second Section");
        await page.reload();

        const headings = page.getByRole("heading", { level: 5 });
        await expect(headings).toHaveText(["First Section", "Second Section"]);

        const card = sectionCard(page, "Second Section");
        await card
          .getByRole("heading", { level: 5, name: "Second Section" })
          .hover();
        await card.getByRole("button", { name: "Move section up" }).click();

        await expect(headings).toHaveText(["Second Section", "First Section"]);

        await page.reload();
        await expect(headings).toHaveText(["Second Section", "First Section"]);
      });
    });

    test.describe("items", () => {
      let sectionId: number;

      test.beforeEach(async ({ page }) => {
        sectionId = await addSectionViaApi(page, listId, "Pack List");
        await page.reload();
        await expect(
          page.getByRole("heading", { level: 5, name: "Pack List" }),
        ).toBeVisible();
      });

      test("adding an item reveals it in edit mode and persists", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "Add item" }).click();

        const input = page.getByRole("textbox", { name: "Item name" });
        await expect(input).toHaveValue("New item");
        await input.fill("Headlamp");
        await input.press("Enter");

        await expect(page.getByText("Headlamp")).toBeVisible();

        await page.reload();
        await expect(page.getByText("Headlamp")).toBeVisible();
      });

      test("editing an item's name persists across a reload", async ({
        page,
      }) => {
        await addItemViaApi(page, listId, sectionId, "Original Item");
        await page.reload();

        await page.getByText("Original Item").click();
        const input = page.getByRole("textbox", { name: "Item name" });
        await input.fill("Renamed Item");
        await input.press("Enter");

        await expect(page.getByText("Renamed Item")).toBeVisible();

        await page.reload();
        await expect(page.getByText("Renamed Item")).toBeVisible();
      });

      test("deleting an item removes it and persists", async ({ page }) => {
        await addItemViaApi(page, listId, sectionId, "Doomed Item");
        await page.reload();

        await page.getByText("Doomed Item").hover();
        await page.getByRole("button", { name: "Delete item" }).click();

        await expect(page.getByText("Delete item?")).toBeVisible();
        await page.getByRole("button", { name: "Delete", exact: true }).click();

        await expect(page.getByText("Doomed Item")).not.toBeVisible();

        await page.reload();
        await expect(page.getByText("Doomed Item")).not.toBeVisible();
      });

      test("toggling an item to optional persists across a reload", async ({
        page,
      }) => {
        await addItemViaApi(page, listId, sectionId, "Trekking Poles");
        await page.reload();

        // No optional items yet, so the "Optional" subheading is absent.
        // `exact` keeps this off the lowercase "optional" badge on each row.
        await expect(
          page.getByText("Optional", { exact: true }),
        ).not.toBeVisible();

        await page.getByText("Trekking Poles").hover();
        await page.getByText("optional").click();

        await expect(page.getByText("Optional", { exact: true })).toBeVisible();

        await page.reload();
        await expect(page.getByText("Optional", { exact: true })).toBeVisible();
        await expect(page.getByText("Trekking Poles")).toBeVisible();
      });

      test("dragging an item reorders it and persists", async ({ page }) => {
        await addItemViaApi(page, listId, sectionId, "Aaa Item");
        await addItemViaApi(page, listId, sectionId, "Bbb Item");
        await addItemViaApi(page, listId, sectionId, "Ccc Item");
        await page.reload();

        // Initial order top-to-bottom: Aaa, Bbb, Ccc.
        expect(await itemY(page, "Aaa Item")).toBeLessThan(
          await itemY(page, "Ccc Item"),
        );

        // Drag the last item up onto the first.
        await dragItemOnto(page, "Ccc Item", "Aaa Item");

        await expect
          .poll(
            async () =>
              (await itemY(page, "Ccc Item")) < (await itemY(page, "Aaa Item")),
          )
          .toBe(true);

        await page.reload();
        expect(await itemY(page, "Ccc Item")).toBeLessThan(
          await itemY(page, "Aaa Item"),
        );
      });
    });

    test("Export PDF link points to the list's PDF endpoint and returns a PDF", async ({
      page,
    }) => {
      const link = page.getByRole("link", { name: /export pdf/i });
      await expect(link).toBeVisible();

      const href = await link.getAttribute("href");
      expect(href).toBe(`/api/packing-lists/${listId}/pdf`);

      const response = await page.request.get(href!);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/pdf");
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

    test("copying the list navigates to the new list named 'Copy of …'", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Copy to my lists" }).click();

      const expectedName = `Copy of ${REI_LIST}`;
      await page.waitForURL(/\/packing-lists\/\d+/);
      await expect(
        page.getByRole("heading", { level: 1, name: expectedName }),
      ).toBeVisible();
    });

    test("Export PDF link points to the list's PDF endpoint and returns a PDF", async ({
      page,
    }) => {
      const link = page.getByRole("link", { name: /export pdf/i });
      await expect(link).toBeVisible();

      const href = await link.getAttribute("href");
      expect(href).toMatch(/\/api\/packing-lists\/\d+\/pdf$/);

      const response = await page.request.get(href!);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/pdf");
    });
  });
});
