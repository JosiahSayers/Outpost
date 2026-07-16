import { test, expect } from "./support/fixtures";

test.describe("Account Settings page", () => {
  test.beforeEach(async ({ page, user }) => {
    void user;
    await page.goto("/account");
  });

  test("shows the page heading and description", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: "Account Settings" }),
    ).toBeVisible();
    await expect(
      page.getByText("Manage the details tied to your account."),
    ).toBeVisible();
  });

  test("defaults to the Profile tab", async ({ page }) => {
    await expect(page).toHaveURL("/account");
    await expect(
      page.getByRole("heading", { level: 3, name: "Profile" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  test.describe("navigation", () => {
    test("switching to the Preferences tab updates the URL and content", async ({
      page,
    }) => {
      await page.getByRole("link", { name: "Preferences" }).click();
      await expect(page).toHaveURL("/account/preferences");
      await expect(
        page.getByRole("heading", { level: 3, name: "Units & Preferences" }),
      ).toBeVisible();
    });

    test("switching back to the Profile tab updates the URL and content", async ({
      page,
    }) => {
      await page.getByRole("link", { name: "Preferences" }).click();
      await page.getByRole("link", { name: "Profile" }).click();
      await expect(page).toHaveURL("/account/profile");
      await expect(
        page.getByRole("heading", { level: 3, name: "Profile" }),
      ).toBeVisible();
    });

    test("loading /account/preferences directly shows the Preferences tab as active", async ({
      page,
    }) => {
      await page.goto("/account/preferences");
      await expect(
        page.getByRole("heading", { level: 3, name: "Units & Preferences" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Preferences" }),
      ).toHaveAttribute("data-active", "true");
    });

    test("an unrecognized tab falls back to the Profile tab", async ({
      page,
    }) => {
      await page.goto("/account/not-a-real-tab");
      await expect(
        page.getByRole("heading", { level: 3, name: "Profile" }),
      ).toBeVisible();
    });

    test("Notifications and Privacy are disabled with a Soon badge", async ({
      page,
    }) => {
      const notifications = page.getByRole("link", { name: "Notifications" });
      const privacy = page.getByRole("link", { name: "Privacy" });
      await expect(notifications).toBeVisible();
      await expect(notifications.getByText("Soon")).toBeVisible();
      await expect(notifications).toHaveAttribute("data-disabled", "true");
      await expect(privacy).toBeVisible();
      await expect(privacy.getByText("Soon")).toBeVisible();
      await expect(privacy).toHaveAttribute("data-disabled", "true");
    });
  });

  test.describe("Profile panel", () => {
    test("shows the signed-in user's name and email", async ({
      page,
      user,
    }) => {
      await expect(page.getByText(user.name, { exact: true })).toBeVisible();
      await expect(page.getByText(user.email)).toBeVisible();
    });
  });

  test.describe("Preferences panel", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("link", { name: "Preferences" }).click();
      await expect(
        page.getByRole("heading", { level: 3, name: "Units & Preferences" }),
      ).toBeVisible();
    });

    test("renders the section headings", async ({ page }) => {
      await expect(
        page.getByRole("heading", { level: 4, name: "Liquid Measurements" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 4, name: "Weight Measurements" }),
      ).toBeVisible();
    });

    test("defaults each select to the region-detected unit (en-US)", async ({
      page,
    }) => {
      // Unset settings fall back to the same region-detected default the
      // trip/gear-inventory pages use, not a hardcoded first option — cupsUS
      // and ounces are the en-US defaults.
      await expect(
        page.getByRole("combobox", { name: "Liquid viewing unit" }),
      ).toHaveValue("Cups (US)");
      await expect(
        page.getByRole("combobox", { name: "Liquid entry unit" }),
      ).toHaveValue("Cups (US)");
      await expect(
        page.getByRole("combobox", { name: "Weight viewing unit" }),
      ).toHaveValue("Ounces (oz)");
      await expect(
        page.getByRole("combobox", { name: "Weight entry unit" }),
      ).toHaveValue("Ounces (oz)");
    });

    test("changing the liquid viewing unit persists across a reload", async ({
      page,
    }) => {
      const select = page.getByRole("combobox", {
        name: "Liquid viewing unit",
      });
      await select.click();
      await page.getByRole("option", { name: "Cups (US)" }).click();
      await expect(select).toHaveValue("Cups (US)");

      await page.reload();
      await expect(
        page.getByRole("combobox", { name: "Liquid viewing unit" }),
      ).toHaveValue("Cups (US)");
    });

    test("changing the liquid entry unit persists across a reload", async ({
      page,
    }) => {
      const select = page.getByRole("combobox", { name: "Liquid entry unit" });
      await select.click();
      await page.getByRole("option", { name: "Liters (L)" }).click();
      await expect(select).toHaveValue("Liters (L)");

      await page.reload();
      await expect(
        page.getByRole("combobox", { name: "Liquid entry unit" }),
      ).toHaveValue("Liters (L)");
    });

    test("changing the weight viewing unit persists across a reload", async ({
      page,
    }) => {
      const select = page.getByRole("combobox", {
        name: "Weight viewing unit",
      });
      await select.click();
      await page.getByRole("option", { name: "Pounds (lb)" }).click();
      await expect(select).toHaveValue("Pounds (lb)");

      await page.reload();
      await expect(
        page.getByRole("combobox", { name: "Weight viewing unit" }),
      ).toHaveValue("Pounds (lb)");
    });

    test("changing the weight entry unit persists across a reload", async ({
      page,
    }) => {
      const select = page.getByRole("combobox", { name: "Weight entry unit" });
      await select.click();
      await page.getByRole("option", { name: "Kilograms (kg)" }).click();
      await expect(select).toHaveValue("Kilograms (kg)");

      await page.reload();
      await expect(
        page.getByRole("combobox", { name: "Weight entry unit" }),
      ).toHaveValue("Kilograms (kg)");
    });

    test("shows an error and rolls back the value when the save fails", async ({
      page,
    }) => {
      await page.route("**/api/account/settings", (route) => {
        if (route.request().method() === "PATCH") {
          return route.fulfill({ status: 500 });
        }
        return route.continue();
      });

      const select = page.getByRole("combobox", {
        name: "Liquid viewing unit",
      });
      // This fresh user's preference is unset, so it defaults to the en-US
      // "Cups (US)"; changing it to a different option is what should roll back.
      await select.click();
      await page.getByRole("option", { name: "Liters (L)" }).click();

      await expect(page.getByText("Couldn't update preference")).toBeVisible();
      await expect(select).toHaveValue("Cups (US)");
    });
  });
});

test.describe("Account Settings page - mobile nav", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page, user }) => {
    void user;
    await page.goto("/account");
  });

  test("nav links are visible without horizontal overflow", async ({
    page,
  }) => {
    await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Preferences" })).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("switching to the Preferences tab updates the content", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Preferences" }).click();
    await expect(page).toHaveURL("/account/preferences");
    await expect(
      page.getByRole("heading", { level: 3, name: "Units & Preferences" }),
    ).toBeVisible();
  });
});
