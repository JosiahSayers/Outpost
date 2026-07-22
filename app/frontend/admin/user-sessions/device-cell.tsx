import { parseUserAgent } from "$/frontend/utils/parse-user-agent";
import { Group, Text, ThemeIcon } from "@mantine/core";
import {
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  QuestionIcon,
} from "@phosphor-icons/react";

const deviceIcons = {
  desktop: DesktopIcon,
  mobile: DeviceMobileIcon,
  tablet: DeviceTabletIcon,
  unknown: QuestionIcon,
};

interface DeviceCellProps {
  userAgent: string | null;
}

export default function DeviceCell({ userAgent }: DeviceCellProps) {
  const { label, deviceClass } = parseUserAgent(userAgent);
  const Icon = deviceIcons[deviceClass];

  return (
    <Group gap="sm" wrap="nowrap">
      <ThemeIcon size={34} radius="sm" variant="light" color="stone-gray">
        <Icon size={17} />
      </ThemeIcon>
      <div>
        <Text fw={700} size="sm">
          {label}
        </Text>
        <Text size="xs" c="dimmed" tt="capitalize">
          {deviceClass}
        </Text>
      </div>
    </Group>
  );
}
