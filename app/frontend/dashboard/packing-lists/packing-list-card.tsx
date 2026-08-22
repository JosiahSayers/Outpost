import AppLink from "$/frontend/app-link";
import type { ClientPackingList } from "$/transformers/packing-list";
import { pluralize } from "$/utils/format-helpers/pluralization";
import { Anchor, Badge, Card, Group, Stack, Text } from "@mantine/core";
import {
  FilePdfIcon,
  GlobeIcon,
  LockIcon,
  ListBulletsIcon,
} from "@phosphor-icons/react";

interface Props {
  list: ClientPackingList;
}

export default function PackingListCard({ list }: Props) {
  const itemsSummary =
    list.totalItems === list.totalUniqueItems
      ? `${list.totalItems} ${pluralize("item", list.totalItems)}`
      : `${list.totalItems} ${pluralize("item", list.totalItems)} (${list.totalUniqueItems} unique)`;

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
              component={AppLink}
              href={`/packing-lists/${list.id}`}
              fw={600}
              c="var(--mantine-color-text)"
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
          {list.totalSections} {pluralize("section", list.totalSections)} ·{" "}
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
