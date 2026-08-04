import { AccountSettingsProvider } from "$/frontend/account/account-settings-context";
import { trailTheme, trailThemeCssVariablesResolver } from "$/frontend/theme";
import { queryClient } from "$/frontend/utils/api/query-client";
import { useVersionDriftNotification } from "$/frontend/utils/hooks/use-version-drift-notification";
import { SignOutProvider } from "$/frontend/utils/sign-out-context";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

// Runs the version-drift check globally, regardless of route/auth state —
// needs to be a child of QueryClientProvider/MantineProvider, so it can't
// live directly in AppProviders itself.
function VersionDriftWatcher() {
  useVersionDriftNotification();
  return null;
}

// Centralizes the app's top-level providers so app.tsx stays focused on
// routing. Add new app-wide providers/context here rather than in app.tsx.
export default function AppProviders({ children }: PropsWithChildren) {
  return (
    <>
      <ColorSchemeScript />
      <QueryClientProvider client={queryClient}>
        <MantineProvider
          theme={trailTheme}
          cssVariablesResolver={trailThemeCssVariablesResolver}
        >
          <Notifications />
          <VersionDriftWatcher />
          <AccountSettingsProvider>
            <SignOutProvider>{children}</SignOutProvider>
          </AccountSettingsProvider>
        </MantineProvider>
      </QueryClientProvider>
    </>
  );
}
