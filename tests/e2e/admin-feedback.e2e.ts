import { db } from "$/utils/db";
import type { Page } from "@playwright/test";
import { make } from "../helpers/test-data/make";
import { expect, test } from "./support/fixtures";

function uniqueText(label: string): string {
  return `${label} ${crypto.randomUUID().slice(0, 8)}`;
}

// Mantine's Chip renders its actual <input type="checkbox"> visually hidden
// and relies on a sibling <label> as the clickable surface, so a real
// (non-forced) Playwright click on the getByRole("checkbox") locator times
// out waiting for an element that's never visible. Click the label instead.
function statusChip(page: Page, label: string) {
  return page
    .locator(".mantine-Chip-label")
    .filter({ hasText: new RegExp(`^${label}$`) });
}

test.describe("Viewing the feedback list", () => {
  test("shows newly submitted feedback among the default actionable statuses", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const submitter = await makeUser();
    const text = uniqueText("Fresh actionable feedback");
    await db.feedback.create({
      // createdAt: new Date() guarantees this ranks first in the desc-sorted
      // list (page 1), ahead of however much "new" feedback has accumulated
      // in the shared dev DB from real usage and other test runs.
      data: make("Feedback", {
        userId: submitter.id,
        status: "new",
        text,
        createdAt: new Date(),
      }),
    });
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/feedback");

    await expect(page.getByRole("table").getByText(text)).toBeVisible();
  });
});

test.describe("Filtering by status", () => {
  test("a terminal status is hidden by default and shown once its chip is checked", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const submitter = await makeUser();
    const text = uniqueText("Already resolved feedback");
    await db.feedback.create({
      data: make("Feedback", {
        userId: submitter.id,
        status: "completed",
        text,
        createdAt: new Date(),
      }),
    });
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/feedback");

    await expect(page.getByText(text)).not.toBeVisible();

    await statusChip(page, "Completed").click();

    await expect(page.getByRole("table").getByText(text)).toBeVisible();
  });
});

test.describe("Paginating the feedback list", () => {
  test("moves to the second page of results", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const submitter = await makeUser();
    const marker = crypto.randomUUID().slice(0, 8);
    // "declined" is a status only this test (and, over repeated runs, prior
    // runs of this same test) ever sets, so scoping the list to just this
    // status below isolates it from everything else in the shared dev DB.
    // Increasing createdAt guarantees these 11 rows are the newest declined
    // feedback in existence at the moment the test runs, regardless of how
    // much older declined data has accumulated from previous runs.
    for (let i = 0; i < 11; i++) {
      await db.feedback.create({
        data: make("Feedback", {
          userId: submitter.id,
          status: "declined",
          text: `Pagination item ${marker} #${i}`,
          createdAt: new Date(Date.now() + i),
        }),
      });
    }
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/feedback");

    await statusChip(page, "New").click();
    await statusChip(page, "Triaged").click();
    await statusChip(page, "Planned").click();
    await statusChip(page, "In progress").click();
    await statusChip(page, "Declined").click();

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(10);
    // Item #0, the oldest of our 11, is the 11th-newest declined item
    // overall, so it's the first one pushed onto page 2.
    await expect(
      page.getByText(`Pagination item ${marker} #0`),
    ).not.toBeVisible();

    await page.getByRole("button", { name: "2" }).click();

    await expect(page.getByText(`Pagination item ${marker} #0`)).toBeVisible();
  });
});

test.describe("Opening a feedback item", () => {
  test("shows its full detail", async ({ page, makeUser, signInAs }) => {
    const submitter = await makeUser({ name: "Priya Natarajan" });
    const text = uniqueText("Row click detail feedback");
    const feedback = await db.feedback.create({
      data: make("Feedback", {
        userId: submitter.id,
        status: "new",
        text,
        submittedOnPage: "/dashboard",
        createdAt: new Date(),
      }),
    });
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/feedback");

    await page.getByRole("table").getByText(text).click();

    await expect(page).toHaveURL(`/console/feedback/${feedback.id}`);
    await expect(page.getByText(text)).toBeVisible();
    // Not exact: the submitter's name also appears, non-exactly, inside the
    // synthetic "Feedback submitted — Priya Natarajan" timeline entry.
    await expect(
      page.getByText("Priya Natarajan", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("Changing a feedback item's status", () => {
  test("requires confirming the change before it's saved", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const submitter = await makeUser();
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId: submitter.id, status: "new" }),
    });
    await signInAs(await makeUser({ admin: true }));
    await page.goto(`/console/feedback/${feedback.id}`);

    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Triaged" }).click();

    await expect(page.getByText("Update status?")).toBeVisible();
    await page
      .getByRole("button", { name: "Update status", exact: true })
      .click();

    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue(
      "Triaged",
    );
    // Polling rather than a one-shot read: the confirm click resolves as
    // soon as the mutation's response reaches the browser, which can be a
    // beat ahead of the write being visible to this test's own DB
    // connection.
    await expect
      .poll(() => db.feedback.findUnique({ where: { id: feedback.id } }))
      .toMatchObject({ status: "triaged" });
  });

  test("Cancel leaves the status unchanged", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const submitter = await makeUser();
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId: submitter.id, status: "new" }),
    });
    await signInAs(await makeUser({ admin: true }));
    await page.goto(`/console/feedback/${feedback.id}`);

    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Triaged" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue(
      "New",
    );
    await expect(
      db.feedback.findUniqueOrThrow({ where: { id: feedback.id } }),
    ).resolves.toMatchObject({ status: "new" });
  });
});

test.describe("Posting a note", () => {
  test("adds it to the timeline and records who posted it", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const submitter = await makeUser();
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId: submitter.id, status: "new" }),
    });
    const admin = await makeUser({ admin: true });
    await signInAs(admin);
    await page.goto(`/console/feedback/${feedback.id}`);

    const noteText = uniqueText("New investigation note");
    await page.getByPlaceholder("Add a note…").fill(noteText);
    const visibleCheckbox = page.getByRole("checkbox", {
      name: "Visible to submitter",
    });
    await visibleCheckbox.click();
    await expect(visibleCheckbox).toBeChecked();
    await page.getByRole("button", { name: "Post note" }).click();

    await expect(page.getByText(noteText)).toBeVisible();

    // Polling for the same reason as the status-change test above: the UI
    // can reflect a successful mutation a beat before this test's own DB
    // connection sees the write.
    await expect
      .poll(() =>
        db.feedbackNote.findFirst({ where: { feedbackId: feedback.id } }),
      )
      .toMatchObject({
        message: noteText,
        userFacing: true,
        adminId: admin.id,
      });
  });
});

test.describe("Editing an existing note", () => {
  test("updates its message", async ({ page, makeUser, signInAs }) => {
    const submitter = await makeUser();
    const admin = await makeUser({ admin: true });
    const feedback = await db.feedback.create({
      data: make("Feedback", { userId: submitter.id, status: "new" }),
    });
    const originalMessage = uniqueText("Original note message");
    const note = await db.feedbackNote.create({
      data: make("FeedbackNote", {
        feedbackId: feedback.id,
        adminId: admin.id,
        message: originalMessage,
        userFacing: false,
      }),
    });
    await signInAs(admin);
    await page.goto(`/console/feedback/${feedback.id}`);

    // Only one note exists in this scenario, so Edit/Save are unambiguous
    // page-level locators. (A locator scoped to the note's Paper via
    // `.filter({ hasText: originalMessage })` would go stale mid-test: once
    // the textarea is filled with the new message, the original text no
    // longer exists anywhere in that Paper for the filter to keep matching.)
    await page.getByRole("button", { name: "Edit" }).click();
    // The composer's own "Add a note…" textarea is always present too; the
    // edit form's textarea is the second one, pre-filled with the original
    // message. (getByRole, not a raw "textarea" locator, so the hidden
    // autosize "measurement" textareas Mantine renders alongside each one
    // are excluded.)
    const editTextarea = page.getByRole("textbox").last();
    await expect(editTextarea).toHaveValue(originalMessage);
    const updatedMessage = uniqueText("Updated note message");
    await editTextarea.fill(updatedMessage);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText(updatedMessage)).toBeVisible();
    await expect(page.getByText(originalMessage)).not.toBeVisible();

    await expect
      .poll(() => db.feedbackNote.findUnique({ where: { id: note.id } }))
      .toMatchObject({ message: updatedMessage });
  });
});

test.describe("Returning to the feedback list", () => {
  test("preserves the status filter and the item that was only visible because of it", async ({
    page,
    makeUser,
    signInAs,
  }) => {
    const submitter = await makeUser();
    const text = uniqueText("Persisted filter feedback");
    const feedback = await db.feedback.create({
      data: make("Feedback", {
        userId: submitter.id,
        status: "completed",
        text,
        createdAt: new Date(),
      }),
    });
    await signInAs(await makeUser({ admin: true }));
    await page.goto("/console/feedback");

    await statusChip(page, "Completed").click();
    await expect(page.getByRole("table").getByText(text)).toBeVisible();

    await page.getByRole("table").getByText(text).click();
    await expect(page).toHaveURL(`/console/feedback/${feedback.id}`);

    // The back link uses window.history.back(), not a fresh navigation, so
    // this also exercises that the filtered URL was recorded in history
    // rather than only kept in component state.
    await page.getByRole("button", { name: "Back to feedback" }).click();

    await expect(page).toHaveURL(/status=completed/);
    await expect(
      page.getByRole("checkbox", { name: "Completed" }),
    ).toBeChecked();
    await expect(page.getByRole("table").getByText(text)).toBeVisible();
  });
});
