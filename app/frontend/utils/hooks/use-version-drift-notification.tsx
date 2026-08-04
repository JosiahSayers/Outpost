import { useHealthCheck } from "$/frontend/utils/api/health";
import { getAppSha } from "$/frontend/utils/app-version";
import { Button, Group, Stack, Text } from "@mantine/core";
import { notifications as toasts } from "@mantine/notifications";
import { useEffect, useRef } from "react";

const TOAST_ID = "version-drift";

/**
 * Polls /health (via useHealthCheck) and compares the backend's commit sha
 * against the sha this bundle was built from. When they differ, the backend
 * has been redeployed since this tab loaded — some API contracts might not
 * match what this bundle expects, so surface a persistent toast prompting a
 * reload. Fires once per session (guarded by `shown`) rather than re-toasting
 * on every subsequent poll while the drift persists. `showToast` defaults to
 * the real Mantine notifications call; tests inject a mock instead of
 * reaching for `mock.module`.
 */
export function useVersionDriftNotification(
  showToast: typeof toasts.show = toasts.show,
) {
  const { data } = useHealthCheck();
  const shown = useRef(false);

  useEffect(() => {
    const appSha = getAppSha();
    if (shown.current || !data?.sha || !appSha) {
      return;
    }
    if (data.sha === appSha) {
      return;
    }

    shown.current = true;
    showToast({
      id: TOAST_ID,
      color: "trail-dust",
      autoClose: false,
      withCloseButton: true,
      title: "A new version of Outpost is available",
      message: (
        <Stack gap="xs">
          <Text size="sm">
            Some features may not work correctly until you reload the page.
          </Text>
          <Group>
            <Button size="xs" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </Group>
        </Stack>
      ),
    });
  }, [data?.sha, showToast]);
}
