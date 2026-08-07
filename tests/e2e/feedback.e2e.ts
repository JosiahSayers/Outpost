import { db } from "$/utils/db";
import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";

const validText = "This feature would be really helpful for me, thanks!";

async function openDrawer(page: Page) {
  await page
    .locator("header")
    .getByRole("button", { name: "Account menu" })
    .click();
  await page
    .getByRole("menu")
    .getByRole("menuitem", { name: "Send Feedback" })
    .click();
}

function drawer(page: Page) {
  return page.getByRole("dialog");
}

test.describe("Submitting feedback", () => {
  test.beforeEach(async ({ page, user }) => {
    void user;
    await page.goto("/dashboard");
  });

  test("opening Send Feedback from the account menu shows the form", async ({
    page,
  }) => {
    await openDrawer(page);
    await expect(drawer(page).getByText("Send Feedback")).toBeVisible();
    await expect(
      drawer(page).getByRole("textbox", { name: /^Feedback/ }),
    ).toHaveValue("");
  });

  test("submitting valid feedback persists it and shows a thank-you message", async ({
    page,
    user,
  }) => {
    await openDrawer(page);
    await drawer(page)
      .getByRole("textbox", { name: /^Feedback/ })
      .fill(validText);
    await drawer(page).getByRole("button", { name: "Send" }).click();

    await expect(
      drawer(page).getByText("Thanks! Someone on the team will take a look."),
    ).toBeVisible();

    const feedback = await db.feedback.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(feedback.text).toBe(validText);
    expect(feedback.submittedOnPage).toBe("/dashboard");
  });

  test("records the page the user is currently on, not the page open when the drawer first mounted", async ({
    page,
    user,
  }) => {
    // The feedback drawer is mounted once at the app root and never remounts
    // across client-side navigation — so it must read the current page at
    // submit time, not whatever page was open when it first mounted (here,
    // /dashboard from the beforeEach `page.goto`).
    await page
      .locator("header")
      .getByRole("button", { name: "Account menu" })
      .click();
    await page
      .getByRole("menu")
      .getByRole("menuitem", { name: "Account Settings" })
      .click();
    await expect(page).toHaveURL("/account");

    await openDrawer(page);
    await drawer(page)
      .getByRole("textbox", { name: /^Feedback/ })
      .fill(validText);
    await drawer(page).getByRole("button", { name: "Send" }).click();
    await expect(
      drawer(page).getByText("Thanks! Someone on the team will take a look."),
    ).toBeVisible();

    const feedback = await db.feedback.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(feedback.submittedOnPage).toBe("/account");
  });

  test("clicking Done after a successful submission closes and resets the drawer", async ({
    page,
  }) => {
    await openDrawer(page);
    await drawer(page)
      .getByRole("textbox", { name: /^Feedback/ })
      .fill(validText);
    await drawer(page).getByRole("button", { name: "Send" }).click();
    await expect(
      drawer(page).getByRole("button", { name: "Done" }),
    ).toBeVisible();

    await drawer(page).getByRole("button", { name: "Done" }).click();
    await expect(drawer(page)).not.toBeVisible();

    await openDrawer(page);
    await expect(
      drawer(page).getByRole("textbox", { name: /^Feedback/ }),
    ).toHaveValue("");
  });

  test("Cancel closes the drawer without submitting", async ({
    page,
    user,
  }) => {
    await openDrawer(page);
    await drawer(page)
      .getByRole("textbox", { name: /^Feedback/ })
      .fill(validText);
    await drawer(page).getByRole("button", { name: "Cancel" }).click();

    await expect(drawer(page)).not.toBeVisible();
    await expect(
      db.feedback.findFirst({ where: { userId: user.id } }),
    ).resolves.toBeNull();
  });

  test("feedback shorter than 15 characters is not submitted", async ({
    page,
    user,
  }) => {
    await openDrawer(page);
    await drawer(page)
      .getByRole("textbox", { name: /^Feedback/ })
      .fill("too short");
    await drawer(page).getByRole("button", { name: "Send" }).click();

    await expect(
      drawer(page).getByRole("textbox", { name: /^Feedback/ }),
    ).toBeVisible();
    await expect(
      drawer(page).getByText("Thanks! Someone on the team will take a look."),
    ).not.toBeVisible();
    await expect(
      db.feedback.findFirst({ where: { userId: user.id } }),
    ).resolves.toBeNull();
  });

  test("shows an inline error and keeps the form open when submission fails", async ({
    page,
  }) => {
    await page.route("**/api/feedback", (route) =>
      route.fulfill({ status: 500 }),
    );

    await openDrawer(page);
    await drawer(page)
      .getByRole("textbox", { name: /^Feedback/ })
      .fill(validText);
    await drawer(page).getByRole("button", { name: "Send" }).click();

    await expect(
      drawer(page).getByText(
        "Couldn't submit your feedback. Please try again.",
      ),
    ).toBeVisible();
    await expect(
      drawer(page).getByRole("textbox", { name: /^Feedback/ }),
    ).toHaveValue(validText);
  });

  test.describe("mobile nav", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("Send Feedback is reachable from the mobile burger menu", async ({
      page,
      user,
    }) => {
      await page.getByRole("button", { name: "Toggle menu" }).click();
      await page
        .getByRole("dialog")
        .getByText("Send Feedback", { exact: true })
        .click();

      // The burger drawer and feedback drawer are both role="dialog", and the
      // burger drawer's close transition can briefly overlap with the feedback
      // drawer opening — so target the feedback form directly instead of
      // scoping through a single "dialog" locator, which would be ambiguous
      // during that overlap.
      await page.getByRole("textbox", { name: /^Feedback/ }).fill(validText);
      await page.getByRole("button", { name: "Send", exact: true }).click();

      await expect(
        page.getByText("Thanks! Someone on the team will take a look."),
      ).toBeVisible();
      await expect(
        db.feedback.findFirstOrThrow({ where: { userId: user.id } }),
      ).resolves.toBeTruthy();
    });
  });
});
