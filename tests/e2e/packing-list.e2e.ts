import { expect, seedGearInventory, test } from "./support/fixtures";
import type { Page } from "@playwright/test";

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
// PointerSensor activates on the first move after pointerdown, then tracks the
// drop target on a requestAnimationFrame loop — so a plain dragTo won't do, and
// bursting every move in a single tick can release the pointer before dnd-kit
// has entered the dragging state or resolved the drag-over target. The nudge,
// extra steps, overshoot past the target's center, and short settles below keep
// that from happening.
async function dragItemOnto(page: Page, fromName: string, toName: string) {
  await page.getByText(fromName).hover();
  const handle = page.getByRole("button", { name: `Reorder ${fromName}` });
  await expect(handle).toBeVisible();
  const handleBox = await handle.boundingBox();
  const targetBox = await page.getByText(toName).boundingBox();
  if (!handleBox || !targetBox) throw new Error("Missing drag geometry");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + targetBox.height / 2;
  const draggingUp = endY < startY;
  // Overshoot just past the target's center in the drag direction so
  // closestCenter unambiguously resolves it as the drop position.
  const overshootY = endY + (draggingUp ? -8 : 8);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Nudge to satisfy the activation constraint, then let dnd-kit's rAF loop
  // enter the dragging state before we travel.
  await page.mouse.move(startX, startY + (draggingUp ? -6 : 6), { steps: 5 });
  await page.waitForTimeout(50);
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.mouse.move(endX, overshootY, { steps: 5 });
  // Give dnd-kit a beat to record the drag-over target before releasing.
  await page.waitForTimeout(100);
  await page.mouse.up();
}

test.describe("Packing List Page", () => {
  test.describe("an editable list (owned by the user)", () => {
    let listName: string;
    let listId: number;

    test.beforeEach(async ({ page, user }) => {
      void user;
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

      test("adding an item opens it in the drawer and persists", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "Add item" }).click();

        // Items are created named "New item" and opened in the drawer, which
        // owns naming, quantity, gear and delete.
        const input = page.getByRole("textbox", { name: /^Name/ });
        await expect(input).toHaveValue("New item");
        await input.fill("Headlamp");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page.getByText("Headlamp")).toBeVisible();

        await page.reload();
        await expect(page.getByText("Headlamp")).toBeVisible();
      });

      test("canceling a new item discards it instead of leaving a stray row", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "Add item" }).click();

        const input = page.getByRole("textbox", { name: /^Name/ });
        await expect(input).toHaveValue("New item");
        // Nothing is persisted yet, so there is nothing to delete.
        await expect(
          page.getByRole("button", { name: "Delete item", exact: true }),
        ).not.toBeVisible();

        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(page.getByText("New item")).not.toBeVisible();

        // A leftover draft from the canceled attempt would collide on this
        // placeholder name and make the second "Add item" fail.
        await page.getByRole("button", { name: "Add item" }).click();
        await expect(input).toHaveValue("New item");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page.getByText("New item")).toBeVisible();
        await page.reload();
        await expect(page.getByText("New item")).toBeVisible();
      });

      test("editing an item's name persists across a reload", async ({
        page,
      }) => {
        await addItemViaApi(page, listId, sectionId, "Original Item");
        await page.reload();

        await page.getByText("Original Item").click();
        const input = page.getByRole("textbox", { name: /^Name/ });
        await input.fill("Renamed Item");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page.getByText("Renamed Item")).toBeVisible();

        await page.reload();
        await expect(page.getByText("Renamed Item")).toBeVisible();
      });

      test("editing an item's quantity persists across a reload", async ({
        page,
      }) => {
        await addItemViaApi(page, listId, sectionId, "Tent Stakes");
        await page.reload();

        await page.getByText("Tent Stakes").click();
        await page.getByRole("textbox", { name: /^Quantity/ }).fill("8");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page.getByText("×8")).toBeVisible();

        await page.reload();
        await expect(page.getByText("×8")).toBeVisible();
      });

      test("deleting an item removes it and persists", async ({ page }) => {
        await addItemViaApi(page, listId, sectionId, "Doomed Item");
        await page.reload();

        await page.getByText("Doomed Item").click();
        // Accessible-name matching is substring-based unless `exact`, so a
        // bare "Delete" would also catch the page's "Delete list" control and
        // the drawer's own "Delete item". `exact` keeps each click on the one
        // button it means.
        await page
          .getByRole("button", { name: "Delete item", exact: true })
          .click();

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

      // Gear assignment (BTP-45). The canonical seeded inventory is
      // "Durston X-Mid 1" (Tents), "Gergory Zulu 45" (Backpacks) and
      // "Platypus QuickDraw" (Water Filters).
      //
      // Weights are deliberately never asserted here: `useWeightDisplay`
      // resolves the unit from the user's account setting, falling back to
      // locale detection, which makes en-US render ounces rather than grams.
      // The gear-inventory suite covers that formatting; these tests assert
      // names and counts, which are unit-independent.
      test.describe("assigning gear", () => {
        // Scoping to the drawer keeps these off the row underneath it, which
        // renders the same gear name once something is assigned.
        function drawer(page: Page) {
          return page.getByRole("dialog", { name: "Edit item" });
        }

        function sectionGearCount(page: Page) {
          return page.getByRole("button", {
            name: "Gear assignment for this section",
          });
        }

        test.beforeEach(async ({ page, user }) => {
          await seedGearInventory(user.id);
          await addItemViaApi(page, listId, sectionId, "Tent Body");
          await addItemViaApi(page, listId, sectionId, "Quilt");
          await page.reload();
          await expect(page.getByText("Tent Body")).toBeVisible();
        });

        test("assigning gear shows it on the item and persists", async ({
          page,
        }) => {
          await page.getByText("Tent Body").click();
          await drawer(page)
            .getByRole("button", { name: /Durston X-Mid 1/ })
            .click();
          await page.getByRole("button", { name: "Save" }).click();

          // The assigned-gear optimistic update lands on the row underneath
          // as soon as Save is clicked, but the drawer's own gear chip and
          // inventory list (both showing the same name) are still mid-close
          // transition — an unscoped match on the page would see both and
          // hit a strict-mode violation.
          await expect(drawer(page)).toBeHidden();
          await expect(page.getByText("Durston X-Mid 1")).toBeVisible();

          await page.reload();
          await expect(page.getByText("Durston X-Mid 1")).toBeVisible();
        });

        test("the section count tracks how much of the section is assigned", async ({
          page,
        }) => {
          // Spelled out while the count is still zero — this is the state an
          // imported or copied list opens in.
          await expect(sectionGearCount(page)).toHaveText(/0 of 2 assigned/);

          await page.getByText("Tent Body").click();
          await drawer(page)
            .getByRole("button", { name: /Durston X-Mid 1/ })
            .click();
          await page.getByRole("button", { name: "Save" }).click();

          await expect(sectionGearCount(page)).toHaveText(/1 of 2/);

          await page.reload();
          await expect(sectionGearCount(page)).toHaveText(/1 of 2/);
        });

        test("changing the assigned gear replaces it and persists", async ({
          page,
        }) => {
          await page.getByText("Tent Body").click();
          await drawer(page)
            .getByRole("button", { name: /Durston X-Mid 1/ })
            .click();
          await page.getByRole("button", { name: "Save" }).click();
          // See the note in "assigning gear shows it on the item and
          // persists" — the drawer's own gear chip/list lingers through its
          // close transition and would otherwise double-match this text.
          await expect(drawer(page)).toBeHidden();
          await expect(page.getByText("Durston X-Mid 1")).toBeVisible();

          await page.getByText("Tent Body").click();
          await drawer(page)
            .getByRole("button", { name: /Gergory Zulu 45/ })
            .click();
          await page.getByRole("button", { name: "Save" }).click();
          await expect(drawer(page)).toBeHidden();

          await expect(page.getByText("Gergory Zulu 45")).toBeVisible();
          await expect(page.getByText("Durston X-Mid 1")).not.toBeVisible();

          await page.reload();
          await expect(page.getByText("Gergory Zulu 45")).toBeVisible();
          await expect(page.getByText("Durston X-Mid 1")).not.toBeVisible();
        });

        test("searching narrows the inventory to matching gear", async ({
          page,
        }) => {
          await page.getByText("Tent Body").click();

          // The whole inventory arrives in one request, so the filter is
          // client-side and needs no debounce wait.
          await expect(drawer(page).getByText("Gergory Zulu 45")).toBeVisible();

          await drawer(page)
            .getByRole("textbox", { name: "Search your gear inventory" })
            .fill("Durston");

          await expect(drawer(page).getByText("Durston X-Mid 1")).toBeVisible();
          await expect(
            drawer(page).getByText("Gergory Zulu 45"),
          ).not.toBeVisible();
        });

        test("removing an assignment clears it and persists", async ({
          page,
        }) => {
          await page.getByText("Tent Body").click();
          await drawer(page)
            .getByRole("button", { name: /Durston X-Mid 1/ })
            .click();
          await page.getByRole("button", { name: "Save" }).click();
          // See the note in "assigning gear shows it on the item and
          // persists" — the drawer's own gear chip/list lingers through its
          // close transition and would otherwise double-match this text.
          await expect(drawer(page)).toBeHidden();
          await expect(page.getByText("Durston X-Mid 1")).toBeVisible();

          await page.getByText("Tent Body").click();
          await drawer(page)
            .getByRole("button", { name: "Remove assigned gear" })
            .click();
          await page.getByRole("button", { name: "Save" }).click();
          await expect(drawer(page)).toBeHidden();

          await expect(page.getByText("Durston X-Mid 1")).not.toBeVisible();

          await page.reload();
          await expect(page.getByText("Durston X-Mid 1")).not.toBeVisible();
        });

        // ── Blocked on backend work ──────────────────────────────────────
        // The "not tracking" disposition has no column behind it. It needs
        // `PackingListItem.trackGear Boolean @default(true)`, the field added
        // to $/transformers/packing-list-item, and `trackGear` accepted by
        // `updateItem`. Until then it lives in a client-side store and is
        // lost on reload.
        test.skip("marking an item as not tracking gear persists", async ({
          page,
        }) => {
          await page.getByText("Quilt").click();
          await drawer(page)
            .getByRole("button", { name: "Not tracking gear for this item" })
            .click();
          await page.getByRole("button", { name: "Save" }).click();

          // A dismissed row shows no gear marker at all — it looks exactly as
          // it did before the feature existed.
          await expect(
            page.getByRole("img", { name: "No gear assigned" }),
          ).toHaveCount(1);

          await page.reload();
          await expect(
            page.getByRole("img", { name: "No gear assigned" }),
          ).toHaveCount(1);
        });

        // ── Blocked on backend work ──────────────────────────────────────
        // Same missing `trackGear` column. Dismissing is meant to be progress
        // in the same way assigning is: it leaves the denominator rather than
        // adding to the numerator, so "0 of 2" becomes "0 of 1".
        test.skip("dismissed items leave the section's denominator", async ({
          page,
        }) => {
          await expect(sectionGearCount(page)).toHaveText(/0 of 2 assigned/);

          await page.getByText("Quilt").click();
          await drawer(page)
            .getByRole("button", { name: "Not tracking gear for this item" })
            .click();
          await page.getByRole("button", { name: "Save" }).click();

          await expect(sectionGearCount(page)).toHaveText(/0 of 1 assigned/);

          await page.reload();
          await expect(sectionGearCount(page)).toHaveText(/0 of 1 assigned/);
        });

        // ── Blocked on backend work ──────────────────────────────────────
        // Same missing `trackGear` column. The bulk action is what makes a
        // long imported list finishable without opening a drawer per row, so
        // it should land with the column.
        test.skip("the section menu can stop tracking the remaining items", async ({
          page,
        }) => {
          await sectionGearCount(page).click();
          await page
            .getByRole("menuitem", { name: /Stop tracking the remaining 2/ })
            .click();

          await expect(sectionGearCount(page)).toHaveText(/No gear tracked/);
          await expect(
            page.getByRole("img", { name: "No gear assigned" }),
          ).toHaveCount(0);

          await page.reload();
          await expect(sectionGearCount(page)).toHaveText(/No gear tracked/);
        });
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

    test.beforeEach(async ({ page, user }) => {
      void user;
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
      await page.waitForURL(/\/packing-lists\/[\w-]+/);
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
      expect(href).toMatch(/\/api\/packing-lists\/[\w-]+\/pdf$/);

      const response = await page.request.get(href!);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/pdf");
    });
  });
});
