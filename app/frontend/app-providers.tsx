import { AccountSettingsProvider } from "$/frontend/account/account-settings-context";
import { trailTheme, trailThemeCssVariablesResolver } from "$/frontend/theme";
import { queryClient } from "$/frontend/utils/api/query-client";
import { useStorageBeacon } from "$/frontend/utils/hooks/use-storage-beacon";
import { useVersionDriftNotification } from "$/frontend/utils/hooks/use-version-drift-notification";
import { SignOutProvider } from "$/frontend/utils/sign-out-context";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useEffect } from "react";
import { useLocation } from "wouter";

// Runs the version-drift check globally, regardless of route/auth state —
// needs to be a child of QueryClientProvider/MantineProvider, so it can't
// live directly in AppProviders itself.
function VersionDriftWatcher() {
  useVersionDriftNotification();
  return null;
}

// Temporary diagnostic for BTP-150 — see storage-beacon.ts. Global for the
// same reason as VersionDriftWatcher, plus one of its own: the page load
// being investigated lands on `/`, which runs no route guard.
function StorageBeaconWatcher() {
  useStorageBeacon();
  return null;
}

// The service worker's notificationclick handler (public/service-worker.js)
// can't reach React/wouter directly, so it postMessages a navigate
// instruction to an already-open tab instead of hard-navigating it itself.
// Global for the same reason as the watchers above -- a push can arrive on
// any route.
function PushNavigationWatcher() {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "navigate" &&
        typeof event.data.referenceUrl === "string"
      ) {
        navigate(event.data.referenceUrl);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [navigate]);

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
          <StorageBeaconWatcher />
          <PushNavigationWatcher />
          <AccountSettingsProvider>
            <SignOutProvider>{children}</SignOutProvider>
          </AccountSettingsProvider>
        </MantineProvider>
      </QueryClientProvider>
    </>
  );
}
