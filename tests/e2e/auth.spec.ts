import { test, expect } from "@playwright/test";

test.describe("Sign in", () => {
  test("signs in with valid credentials and redirects to dashboard", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("user@test.com");
    await page.getByRole("textbox", { name: "Password" }).fill("user-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test("shows an error for invalid credentials", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("user@test.com");
    await page.getByRole("textbox", { name: "Password" }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/sign in failed|invalid/i)).toBeVisible();
    await expect(page).not.toHaveURL("/dashboard");
  });
});

test.describe("Registration", () => {
  test("registers a new account and redirects to dashboard", async ({
    page,
  }) => {
    const email = `playwright-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByLabel("Name").fill("Playwright Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill("securepassword123");
    await page.getByRole("textbox", { name: "Confirm password" }).fill("securepassword123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test("shows a validation error when passwords do not match", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Playwright Tester");
    await page.getByLabel("Email").fill("mismatch@example.com");
    await page.getByRole("textbox", { name: "Password", exact: true }).fill("securepassword123");
    await page.getByRole("textbox", { name: "Confirm password" }).fill("differentpassword");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
    await expect(page).not.toHaveURL("/dashboard");
  });
});
