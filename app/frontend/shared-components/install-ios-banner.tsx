import { isIos, isStandalone } from "$/frontend/utils/platform";
import { Alert, Group, List, Text, ThemeIcon } from "@mantine/core";
import { CompassIcon, ExportIcon, PlusSquareIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "outpost.ios-install-prompt-dismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    // Safari Private Browsing throws on localStorage access -- treat that
    // the same as "not dismissed" rather than failing to render the banner.
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // Nothing to do -- the banner will just show again next load, which is
    // the safe failure mode.
  }
}

export default function InstallIosBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isIos() && !isStandalone() && !readDismissed());
  }, []);

  if (!visible) return null;

  return (
    <Alert
      variant="light"
      color="trail-green"
      radius="md"
      withCloseButton
      closeButtonLabel="Dismiss"
      onClose={() => {
        writeDismissed();
        setVisible(false);
      }}
      title={
        <Group gap="xs" wrap="nowrap">
          <ThemeIcon variant="light" color="trail-green" radius="sm" size={26}>
            <CompassIcon size={14} weight="fill" />
          </ThemeIcon>
          <Text fw={700} span>
            Get the full Outpost experience
          </Text>
        </Group>
      }
      mb="md"
    >
      <Text size="sm" mb={6}>
        Install to your Home Screen for push notifications and offline trip
        access.
      </Text>
      <List size="sm" spacing={4} c="dimmed">
        <List.Item icon={<ExportIcon size={13} />}>
          Tap <b>Share</b> in Safari&apos;s toolbar
        </List.Item>
        <List.Item icon={<PlusSquareIcon size={13} />}>
          Choose <b>&quot;Add to Home Screen&quot;</b>
        </List.Item>
      </List>
    </Alert>
  );
}

export const IOS_INSTALL_COPY = {
  title: "Get the full Outpost experience",
  body: "Install to your Home Screen for push notifications and offline trip access.",
  steps: [
    "Tap Share in Safari's toolbar",
    'Choose "Add to Home Screen"',
  ] as const,
};
