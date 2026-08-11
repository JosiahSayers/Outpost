import { test as base, expect, type Page } from "@playwright/test";
import {
  createUser,
  getSessionCookies,
  type CreateUserOptions,
  type TestUser,
} from "./auth";

// Sign a page's browser context in as the given user by minting a session
// directly and setting it as a cookie, rather than POSTing real credentials
// to /sign-in/email. Real credential sign-in goes through the twoFactor
// plugin, which intercepts it for any user with twoFactorEnabled set (e.g.
// admin fixtures -- see the testUtils() comment in auth.ts) and never
// produces a session without a real second-factor answer. Cookies set here
// land in the same jar `page.request` and `page.goto` both read from, so
// every subsequent navigation is authenticated with no UI round-trip needed.
async function signInAs(page: Page, user: TestUser): Promise<void> {
  const cookies = await getSessionCookies(user.id);
  await page.context().addCookies(cookies);
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
export { seedActiveSessions } from "../../helpers/test-data/seed-sessions";
export { seedNotification } from "../../helpers/test-data/seed-notifications";
