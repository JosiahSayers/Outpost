import { useVersionDrift } from "$/frontend/utils/hooks/use-version-drift";
import { Button, Group, Stack, Text } from "@mantine/core";
import { notifications as toasts } from "@mantine/notifications";
import { useEffect, useRef } from "react";

const TOAST_ID = "version-drift";

/**
 * Watches for version drift (via useVersionDrift) and, once it's persisted
 * for `delayMs`, surfaces a persistent toast prompting a reload. Links
 * throughout the app already force a full navigation once drift is detected
 * (see AppLink), so this toast is only a backstop for someone who stays on
 * one page without clicking anything — hence the delay, rather than firing
 * the instant drift is detected. Fires once per session (guarded by `shown`)
 * rather than re-toasting on every subsequent poll while the drift persists.
 * `showToast` defaults to the real Mantine notifications call; tests inject
 * a mock instead of reaching for `mock.module`.
 */
export function useVersionDriftNotification(
  showToast: typeof toasts.show = toasts.show,
  delayMs = 60_000,
) {
  const hasDrift = useVersionDrift();
  const shown = useRef(false);

  useEffect(() => {
    if (!hasDrift || shown.current) {
      return;
    }

    const timer = setTimeout(() => {
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
    }, delayMs);

    return () => clearTimeout(timer);
  }, [hasDrift, showToast, delayMs]);
}
