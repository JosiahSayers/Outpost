import { isIos, isStandalone } from "$/frontend/utils/platform";
import { Alert, Group, List, Text, ThemeIcon } from "@mantine/core";
import { CompassIcon, ExportIcon, PlusSquareIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "outpost.ios-install-prompt-dismissed";

export const IOS_INSTALL_COPY = {
  title: "Get the full Outpost experience",
  body: "Install to your Home Screen for push notifications and offline trip access.",
  steps: [
    "Tap Share in Safari's toolbar",
    'Choose "Add to Home Screen"',
  ] as const,
};

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
            {IOS_INSTALL_COPY.title}
          </Text>
        </Group>
      }
      mb="md"
    >
      <Text size="sm" mb={6}>
        {IOS_INSTALL_COPY.body}
      </Text>
      <List size="sm" spacing={4} c="dimmed">
        <List.Item icon={<ExportIcon size={13} />}>
          {IOS_INSTALL_COPY.steps[0]}
        </List.Item>
        <List.Item icon={<PlusSquareIcon size={13} />}>
          {IOS_INSTALL_COPY.steps[1]}
        </List.Item>
      </List>
    </Alert>
  );
}
