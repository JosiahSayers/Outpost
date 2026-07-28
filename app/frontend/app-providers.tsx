import { AccountSettingsProvider } from "$/frontend/account/account-settings-context";
import { trailTheme } from "$/frontend/theme";
import { queryClient } from "$/frontend/utils/api/query-client";
import { SignOutProvider } from "$/frontend/utils/sign-out-context";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

// Centralizes the app's top-level providers so app.tsx stays focused on
// routing. Add new app-wide providers/context here rather than in app.tsx.
export default function AppProviders({ children }: PropsWithChildren) {
  return (
    <>
      <ColorSchemeScript />
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={trailTheme}>
          <Notifications />
          <AccountSettingsProvider>
            <SignOutProvider>{children}</SignOutProvider>
          </AccountSettingsProvider>
        </MantineProvider>
      </QueryClientProvider>
    </>
  );
}
