import { db } from "$/utils/db";
import { expect, test } from "./support/fixtures";
import { make } from "../helpers/test-data/make";

function uniqueName(label: string): string {
  return `${label} ${crypto.randomUUID().slice(0, 8)}`;
}

function uniqueVendor(label: string): string {
  return `${label}_${crypto.randomUUID().slice(0, 8)}`;
}

test.describe("Admin meals authorization", () => {
  test("returns 403 when signed in as a non-admin user", async ({
    page,
    user,
  }) => {
    void user;
    const response = await page.goto("/admin/meals");
    expect(response?.status()).toBe(403);
  });

  test("a non-admin cannot load the /console/meals route", async ({
    page,
    user,
  }) => {
    void user;
    await page.goto("/console/meals");
    await expect(page).toHaveURL("/dashboard");
  });

  test("an admin can load the /console/meals route", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/meals");
    await expect(page).toHaveURL("/console/meals");
    await expect(
      page.getByRole("heading", { name: "Public Meals" }),
    ).toBeVisible();
  });
});

test.describe("Searching the meal catalog", () => {
  test("finds a meal by a free-text name search", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const name = uniqueName("Searchable Enchilada Bowl");
    await db.publicMealItem.create({ data: make("PublicMealItem", { name }) });
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/meals");

    await page.getByPlaceholder("Search by name or product id…").fill(name);

    await expect(page.getByText(name)).toBeVisible();
  });
});

test.describe("Filtering the meal catalog", () => {
  test("filters by vendor", async ({ page, makeUser, signInAs }) => {
    const vendor = uniqueVendor("filter_vendor");
    const name = uniqueName("Vendor Filtered Meal");
    await db.publicMealItem.create({
      data: make("PublicMealItem", { name, sourceVendor: vendor }),
    });
    const otherName = uniqueName("Other Vendor Meal");
    await db.publicMealItem.create({
      data: make("PublicMealItem", { name: otherName }),
    });
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/meals");

    await page.getByRole("combobox", { name: "Vendor" }).fill(vendor);
    await page.getByRole("option", { name: vendor }).click();

    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText(otherName)).not.toBeVisible();
  });

  test("filters by brand", async ({ page, makeUser, signInAs }) => {
    const brand = uniqueName("Filter Brand");
    const name = uniqueName("Brand Filtered Meal");
    await db.publicMealItem.create({
      data: make("PublicMealItem", { name, brand }),
    });
    const otherName = uniqueName("Other Brand Meal");
    await db.publicMealItem.create({
      data: make("PublicMealItem", { name: otherName }),
    });
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/meals");

    await page.getByRole("combobox", { name: "Brand" }).fill(brand);
    await page.getByRole("option", { name: brand }).click();

    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText(otherName)).not.toBeVisible();
  });
});

test.describe("Paginating the meal catalog", () => {
  test("moves to the second page of results using Prev/Next", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const vendor = uniqueVendor("pager_vendor");
    const marker = crypto.randomUUID().slice(0, 8);
    for (let i = 0; i < 16; i++) {
      await db.publicMealItem.create({
        data: make("PublicMealItem", {
          name: `Pager Meal ${marker} ${String(i).padStart(2, "0")}`,
          sourceVendor: vendor,
        }),
      });
    }
    await signInAs(await makeUser({ admin: true }));
    await page.goto(`/console/meals?vendor=${encodeURIComponent(vendor)}`);

    await expect(page.getByText(`Pager Meal ${marker} 00`)).toBeVisible();
    await expect(page.getByText(`Pager Meal ${marker} 15`)).not.toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Page 2")).toBeVisible();
    await expect(page.getByText(`Pager Meal ${marker} 15`)).toBeVisible();
    await expect(page.getByText(`Pager Meal ${marker} 00`)).not.toBeVisible();
    expect(new URL(page.url()).searchParams.get("page")).toBe("2");

    await page.getByRole("button", { name: "Prev" }).click();

    await expect(page.getByText(`Pager Meal ${marker} 00`)).toBeVisible();
  });
});

test.describe("Selecting a meal", () => {
  test("opens the detail panel prefilled, and survives a page reload", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const vendor = uniqueVendor("reload_vendor");
    const name = uniqueName("Reload Selection Meal");
    const sourceUrl = `https://example.com/products/${crypto.randomUUID().slice(0, 8)}`;
    await db.publicMealItem.create({
      data: make("PublicMealItem", { name, sourceVendor: vendor, sourceUrl }),
    });
    await signInAs(await makeUser({ admin: true }));
    await page.goto(`/console/meals?vendor=${encodeURIComponent(vendor)}`);

    await page.getByText(name).click();

    await expect(page.getByLabel("Name")).toHaveValue(name);
    await expect(page.getByRole("link", { name: sourceUrl })).toHaveAttribute(
      "href",
      sourceUrl,
    );
    expect(new URL(page.url()).searchParams.get("meal")).toBeTruthy();

    await page.reload();

    await expect(page.getByLabel("Name")).toHaveValue(name);
  });
});

test.describe("Creating a meal", () => {
  test("adds it to the catalog", async ({ page, makeUser, signInAs }) => {
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/meals");

    await page.getByRole("button", { name: "Add meal", exact: true }).click();

    const name = uniqueName("Newly Created Meal");
    const sourceVendor = uniqueVendor("created_vendor");
    const sourceProductId = crypto.randomUUID().slice(0, 8);
    const sourceUrl = `https://example.com/products/${sourceProductId}`;

    const form = page.locator("form");
    await form.getByLabel("Name").fill(name);
    await form.getByLabel("Source vendor").fill(sourceVendor);
    await form.getByLabel("Source product id").fill(sourceProductId);
    await form.getByLabel("Source URL").fill(sourceUrl);

    const sourceUrlLink = form.getByRole("link", { name: sourceUrl });
    await expect(sourceUrlLink).toBeVisible();
    await expect(sourceUrlLink).toHaveAttribute("href", sourceUrl);

    await form.getByRole("button", { name: "Add meal" }).click();

    await expect(
      form.getByRole("button", { name: "Save changes" }),
    ).toBeVisible();

    await expect
      .poll(() => db.publicMealItem.findFirst({ where: { name } }))
      .toMatchObject({ name, sourceVendor, sourceProductId, sourceUrl });
  });
});

test.describe("Editing a meal", () => {
  test("saves the updated fields", async ({ page, makeUser, signInAs }) => {
    const vendor = uniqueVendor("edit_vendor");
    const originalName = uniqueName("Original Meal Name");
    const meal = await db.publicMealItem.create({
      data: make("PublicMealItem", {
        name: originalName,
        sourceVendor: vendor,
        calories: 400,
      }),
    });
    await signInAs(await makeUser({ admin: true }));
    await page.goto(
      `/console/meals?vendor=${encodeURIComponent(vendor)}&meal=${meal.id}`,
    );

    const updatedName = uniqueName("Updated Meal Name");
    const form = page.locator("form");
    await expect(form.getByLabel("Name")).toHaveValue(originalName);
    await form.getByLabel("Name").fill(updatedName);
    await form.getByLabel("Calories", { exact: true }).fill("900");
    await form.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText(updatedName)).toBeVisible();

    await expect
      .poll(() => db.publicMealItem.findUnique({ where: { id: meal.id } }))
      .toMatchObject({ name: updatedName, calories: 900 });
  });
});

test.describe("Deleting a meal", () => {
  test("requires confirming before it's removed from the catalog", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const vendor = uniqueVendor("delete_vendor");
    const name = uniqueName("Deletable Meal");
    const meal = await db.publicMealItem.create({
      data: make("PublicMealItem", { name, sourceVendor: vendor }),
    });
    await signInAs(await makeUser({ admin: true }));
    await page.goto(
      `/console/meals?vendor=${encodeURIComponent(vendor)}&meal=${meal.id}`,
    );

    const form = page.locator("form");
    await expect(form.getByLabel("Name")).toHaveValue(name);
    await form.getByRole("button", { name: "Delete" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(name)).not.toBeVisible();
    await expect
      .poll(() => db.publicMealItem.findUnique({ where: { id: meal.id } }))
      .toBeNull();
  });
});
