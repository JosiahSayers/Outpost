import { Anchor, Group } from "@mantine/core";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link } from "wouter";

export default function BackToDashboardLink() {
  return (
    <Anchor component={Link} href="/dashboard" c="dimmed" size="sm">
      <Group gap={4}>
        <ArrowLeftIcon size={14} />
        Back to Dashboard
      </Group>
    </Anchor>
  );
}
