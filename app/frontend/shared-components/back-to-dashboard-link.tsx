import AppLink from "$/frontend/app-link";
import { Anchor, Group } from "@mantine/core";
import { ArrowLeftIcon } from "@phosphor-icons/react";

export default function BackToDashboardLink() {
  return (
    <Anchor component={AppLink} href="/dashboard" c="dimmed" size="sm">
      <Group gap={4}>
        <ArrowLeftIcon size={14} />
        Back to Dashboard
      </Group>
    </Anchor>
  );
}
