import type { ClientPackingList } from "$/transformers/packing-list";
import { Anchor, Badge, Card, Group, Stack, Text } from "@mantine/core";
import {
  FilePdfIcon,
  GlobeIcon,
  LockIcon,
  ListBulletsIcon,
} from "@phosphor-icons/react";
import { Link } from "wouter";

interface Props {
  list: ClientPackingList;
}

export default function PackingListCard({ list }: Props) {
  const itemsSummary =
    list.totalItems === list.totalUniqueItems
      ? `${list.totalItems} items`
      : `${list.totalItems} items (${list.totalUniqueItems} unique)`;

  return (
    <Card>
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <ListBulletsIcon
              size={15}
              color="var(--mantine-color-trail-green-6)"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <Anchor
              component={Link}
              href={`/packing-lists/${list.id}`}
              fw={600}
              c="dark"
              underline="hover"
              lineClamp={2}
            >
              {list.name}
            </Anchor>
          </Group>
          <Badge
            color={list.public ? "trail-green" : "stone-gray"}
            leftSection={
              list.public ? <GlobeIcon size={10} /> : <LockIcon size={10} />
            }
            style={{ flexShrink: 0 }}
          >
            {list.public ? "Public" : "Private"}
          </Badge>
        </Group>

        <Text size="sm" c="dimmed">
          {list.totalSections} section{list.totalSections !== 1 ? "s" : ""} ·{" "}
          {itemsSummary}
        </Text>

        <Group justify="flex-end" mt={4}>
          <Anchor
            size="xs"
            c="trail-green"
            href={`/api/packing-lists/${list.id}/pdf`}
            target="_blank"
          >
            <Group gap={4} align="center">
              <FilePdfIcon size={13} />
              Export PDF
            </Group>
          </Anchor>
        </Group>
      </Stack>
    </Card>
  );
}
