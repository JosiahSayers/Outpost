import { test, expect } from "./support/fixtures";

test.describe("Header - unauthenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("logo links to the marketing page", async ({ page }) => {
    await expect(
      page.locator("header").getByRole("link", { name: "Outpost" }),
    ).toHaveAttribute("href", "/");
  });

  test("shows Sign In and Register links", async ({ page }) => {
    await expect(
      page.locator("header").getByRole("link", { name: "Sign In" }),
    ).toBeVisible();
    await expect(
      page.locator("header").getByRole("link", { name: "Register" }),
    ).toBeVisible();
  });

  test("does not show the account menu trigger", async ({ page }) => {
    await expect(
      page.locator("header").getByRole("button", { name: "Account menu" }),
    ).not.toBeVisible();
  });

  test("Sign In link navigates to the sign in page", async ({ page }) => {
    await page.locator("header").getByRole("link", { name: "Sign In" }).click();
    await expect(page).toHaveURL("/sign-in");
  });

  test("Register link navigates to the register page", async ({ page }) => {
    await page
      .locator("header")
      .getByRole("link", { name: "Register" })
      .click();
    await expect(page).toHaveURL("/register");
  });
});

// Land on gear-inventory so the logo navigation test can click through to dashboard
test.describe("Header - authenticated", () => {
  test.beforeEach(async ({ page, user }) => {
    void user;
    await page.goto("/gear-inventory");
  });

  test("logo links to the dashboard", async ({ page }) => {
    await expect(
      page.locator("header").getByRole("link", { name: "Outpost" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  test("clicking the logo navigates to the dashboard", async ({ page }) => {
    await page.locator("header").getByRole("link", { name: "Outpost" }).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test("shows the account menu trigger", async ({ page }) => {
    await expect(
      page.locator("header").getByRole("button", { name: "Account menu" }),
    ).toBeVisible();
  });

  test("does not show Sign In or Register links", async ({ page }) => {
    await expect(
      page.locator("header").getByRole("link", { name: "Sign In" }),
    ).not.toBeVisible();
    await expect(
      page.locator("header").getByRole("link", { name: "Register" }),
    ).not.toBeVisible();
  });

  test("opening the account menu shows the signed-in user's name and email", async ({
    page,
    user,
  }) => {
    await page
      .locator("header")
      .getByRole("button", { name: "Account menu" })
      .click();
    const menu = page.getByRole("menu");
    await expect(menu.getByText(user.email)).toBeVisible();
  });

  test("the account menu links to Account Settings", async ({ page }) => {
    await page
      .locator("header")
      .getByRole("button", { name: "Account menu" })
      .click();
    await page
      .getByRole("menu")
      .getByRole("menuitem", { name: "Account Settings" })
      .click();
    await expect(page).toHaveURL("/account");
  });

  test("switching appearance to Dark updates the color scheme", async ({
    page,
  }) => {
    await page
      .locator("header")
      .getByRole("button", { name: "Account menu" })
      .click();
    await page.getByRole("menu").getByText("Dark", { exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-mantine-color-scheme",
      "dark",
    );
  });

  test("Sign Out ends the session and shows auth links", async ({ page }) => {
    await page
      .locator("header")
      .getByRole("button", { name: "Account menu" })
      .click();
    await page
      .getByRole("menu")
      .getByRole("menuitem", { name: "Sign Out" })
      .click();
    await expect(
      page.locator("header").getByRole("link", { name: "Sign In" }),
    ).toBeVisible();
    await expect(
      page.locator("header").getByRole("link", { name: "Register" }),
    ).toBeVisible();
  });
});

test.describe("Header - mobile nav", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.describe("unauthenticated", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

    test("shows a burger menu button", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Toggle menu" }),
      ).toBeVisible();
    });

    test("nav links are not visible in the header before opening the menu", async ({
      page,
    }) => {
      await expect(
        page.locator("header").getByRole("link", { name: "Sign In" }),
      ).not.toBeVisible();
    });

    test("opening the burger menu shows Sign In and Register", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Toggle menu" }).click();
      const drawer = page.getByRole("dialog");
      await expect(drawer.getByRole("link", { name: "Sign In" })).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Register" }),
      ).toBeVisible();
    });

    test("clicking Sign In in the drawer closes it and navigates", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Toggle menu" }).click();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "Sign In" })
        .click();
      await expect(page).toHaveURL("/sign-in");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });

  test.describe("authenticated", () => {
    test.beforeEach(async ({ page, user }) => {
      void user;
      await page.goto("/gear-inventory");
    });

    test("opening the burger menu shows identity, settings, appearance, and sign out inline", async ({
      page,
      user,
    }) => {
      await page.getByRole("button", { name: "Toggle menu" }).click();
      const drawer = page.getByRole("dialog");
      await expect(drawer.getByText(user.email)).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Account Settings" }),
      ).toBeVisible();
      await expect(drawer.getByText("Light", { exact: true })).toBeVisible();
      await expect(drawer.getByText("Sign Out")).toBeVisible();
    });

    test("clicking Account Settings in the drawer closes it and navigates", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Toggle menu" }).click();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "Account Settings" })
        .click();
      await expect(page).toHaveURL("/account");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("clicking Sign Out in the drawer closes it and ends the session", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Toggle menu" }).click();
      await page.getByRole("dialog").getByText("Sign Out").click();
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // The header nav links live in a desktop-only group, so on mobile we
      // reopen the drawer to confirm the session actually ended.
      await page.getByRole("button", { name: "Toggle menu" }).click();
      const drawer = page.getByRole("dialog");
      await expect(drawer.getByRole("link", { name: "Sign In" })).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Register" }),
      ).toBeVisible();
    });
  });
});
