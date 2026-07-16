import { test as base, expect, type Page } from "@playwright/test";
import { createUser, type CreateUserOptions, type TestUser } from "./auth";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

// Sign a page's browser context in as the given user by hitting the real
// sign-in endpoint. `page.request` shares the context's cookie jar, so every
// subsequent navigation is authenticated — no UI round-trip needed. The
// explicit Origin header keeps Better Auth's origin check happy for a
// non-browser-initiated request.
async function signInAs(page: Page, user: TestUser): Promise<void> {
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: { email: user.email, password: user.password },
    headers: { Origin: BASE_URL },
  });
  if (!response.ok()) {
    throw new Error(
      `Failed to sign in as ${user.email}: ${response.status()} ${await response.text()}`,
    );
  }
}

type Fixtures = {
  // A fresh, isolated, signed-in user for this test. Referencing it in a test's
  // arguments provisions the user and authenticates the page. Tests that need
  // no auth (or that drive the sign-in UI themselves) simply don't reference it.
  user: TestUser;
  // Factory for additional users a test needs — a second owner for
  // access-control checks, an admin, an empty user, etc. Combine with
  // `signInAs` to switch the page's session.
  makeUser: (options?: CreateUserOptions) => Promise<TestUser>;
  // Switch the page's session to another user without the UI.
  signInAs: (user: TestUser) => Promise<void>;
  // Runs automatically for every test — see below.
  suppressResizeObserverError: void;
};

export const test = base.extend<Fixtures>({
  // Bun's dev server surfaces the benign "ResizeObserver loop completed with
  // undelivered notifications" error as an overlay that intercepts pointer
  // events and breaks otherwise-passing tests. Swallow just that one error on
  // every page before any app code runs. Harmless on pages that never trigger
  // it, so it's applied suite-wide rather than repeated per file.
  suppressResizeObserverError: [
    async ({ page }, use) => {
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
      await use();
    },
    { auto: true },
  ],

  makeUser: async ({}, use) => {
    await use((options) => createUser(options));
  },

  signInAs: async ({ page }, use) => {
    await use((user) => signInAs(page, user));
  },

  user: async ({ makeUser, page }, use) => {
    const user = await makeUser();
    await signInAs(page, user);
    await use(user);
  },
});

export { expect };
export type { TestUser } from "./auth";
export { uniqueEmail } from "./auth";
export { seedGearInventory } from "../../helpers/test-data/seed-gear";
