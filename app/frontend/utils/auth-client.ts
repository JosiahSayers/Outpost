import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        const redirect = new URLSearchParams(window.location.search).get(
          "redirect",
        );
        window.location.href = `/two-factor${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`;
      },
    }),
  ],
});
