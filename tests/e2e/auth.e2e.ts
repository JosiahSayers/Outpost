import { db } from "$/utils/db";
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
    await page
      .getByRole("textbox", { name: "Password" })
      .fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/sign in failed|invalid/i)).toBeVisible();
    await expect(page).not.toHaveURL("/dashboard");
  });

  test("forgot password link navigates to the reset request page", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL("/forgot-password");
    await expect(
      page.getByRole("heading", { name: "Reset your password" }),
    ).toBeVisible();
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
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill("securepassword123");
    await page
      .getByRole("textbox", { name: "Confirm password" })
      .fill("securepassword123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test("shows a validation error when passwords do not match", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Playwright Tester");
    await page.getByLabel("Email").fill("mismatch@example.com");
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill("securepassword123");
    await page
      .getByRole("textbox", { name: "Confirm password" })
      .fill("differentpassword");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
    await expect(page).not.toHaveURL("/dashboard");
  });
});

test.describe("Password reset", () => {
  test("resets a forgotten password and signs in with the new one", async ({
    page,
  }) => {
    // Create a throwaway account so this test doesn't touch shared seeded users.
    const email = `playwright-reset-${Date.now()}@example.com`;
    const originalPassword = "original-password123";
    const newPassword = "new-password456";

    await page.goto("/register");
    await page.getByLabel("Name").fill("Playwright Resetter");
    await page.getByLabel("Email").fill(email);
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(originalPassword);
    await page
      .getByRole("textbox", { name: "Confirm password" })
      .fill(originalPassword);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/dashboard");

    await page
      .locator("header")
      .getByRole("button", { name: "Account menu" })
      .click();
    await page
      .getByRole("menu")
      .getByRole("menuitem", { name: "Sign Out" })
      .click();
    await expect(page.getByText("Welcome back")).toBeVisible();

    // Emails are skipped outside production (see
    // app/jobs/workers/email/reset-password.ts), so pull the token straight
    // out of the verification table instead of reading an inbox.
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/we've sent a link/i)).toBeVisible();

    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const verification = await db.verification.findFirstOrThrow({
      where: {
        value: user.id,
        identifier: { startsWith: "reset-password:" },
      },
      orderBy: { createdAt: "desc" },
    });
    const token = verification.identifier.replace("reset-password:", "");

    await page.goto(`/reset-password?token=${token}`);
    await page.getByRole("textbox", { name: "New password" }).fill(newPassword);
    await page
      .getByRole("textbox", { name: "Confirm password" })
      .fill(newPassword);
    await page.getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByText("Your password has been reset.")).toBeVisible();

    await page.getByRole("link", { name: "Back to sign in" }).click();
    await expect(page).toHaveURL("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(newPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test("shows an error for an invalid or missing token", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(
      page.getByText("This password reset link is invalid or has expired."),
    ).toBeVisible();
  });
});
