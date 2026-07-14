import { expect, test, type Page } from "@playwright/test";

const USER = { email: "user@test.com", password: "user-password" };

async function signIn(page: Page, redirect = "/account") {
  await page.goto(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
  await page.getByLabel("Email").fill(USER.email);
  await page.getByRole("textbox", { name: "Password" }).fill(USER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(redirect);
}

// The seeded user's name is randomly generated (faker), so tests read it
// back from the session rather than hardcoding it.
async function signedInName(page: Page) {
  const res = await page.request.get("/api/auth/get-session");
  const session = await res.json();
  return session.user.name as string;
}

test.describe("Account Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
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
    test("shows the signed-in user's name and email", async ({ page }) => {
      const name = await signedInName(page);

      await expect(page.getByText(name, { exact: true })).toBeVisible();
      await expect(page.getByText(USER.email)).toBeVisible();
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

    test("defaults each select to the app-wide default unit", async ({
      page,
    }) => {
      await expect(
        page.getByRole("combobox", { name: "Liquid viewing unit" }),
      ).toHaveValue("Milliliters (mL)");
      await expect(
        page.getByRole("combobox", { name: "Liquid entry unit" }),
      ).toHaveValue("Milliliters (mL)");
      await expect(
        page.getByRole("combobox", { name: "Weight viewing unit" }),
      ).toHaveValue("Grams (g)");
      await expect(
        page.getByRole("combobox", { name: "Weight entry unit" }),
      ).toHaveValue("Grams (g)");
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
      // Pick whichever option isn't already selected, since other tests in
      // this suite persist real changes to this field against the dev DB.
      const before = await select.inputValue();
      const target = before === "Cups (US)" ? "Liters (L)" : "Cups (US)";
      await select.click();
      await page.getByRole("option", { name: target }).click();

      await expect(page.getByText("Couldn't update preference")).toBeVisible();
      await expect(select).toHaveValue(before);
    });
  });
});
