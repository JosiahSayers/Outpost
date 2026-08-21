import { Group, Paper, Switch, Text } from "@mantine/core";
import type { Icon } from "@phosphor-icons/react";

interface ToggleRowProps {
  icon: Icon;
  label: string;
  checked: boolean;
  onChange: () => void;
}

export default function ToggleRow({
  icon: RowIcon,
  label,
  checked,
  onChange,
}: ToggleRowProps) {
  return (
    <Paper withBorder p="xs" radius="sm">
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Group gap="xs" wrap="nowrap" c="dimmed">
          <RowIcon size={15} />
          <Text size="sm" c="dark">
            {label}
          </Text>
        </Group>
        <Switch checked={checked} onChange={onChange} />
      </Group>
    </Paper>
  );
}
