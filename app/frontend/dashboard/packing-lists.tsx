import { usePackingLists } from "$/frontend/utils/api/packing-list";
import type { ClientPackingList } from "$/transformers/packing-list";
import {
  Button,
  Card,
  Collapse,
  Group,
  SimpleGrid,
  Skeleton,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { FilePdfIcon, ListBulletsIcon, PlusIcon } from "@phosphor-icons/react";

function PackingListCard({ list }: { list: ClientPackingList }) {
  return (
    <Card>
      <Group gap="xs" mb="xs">
        <ListBulletsIcon size={18} />
        <Text fw={600}>{list.name}</Text>
      </Group>
      <Group gap="md" c="dimmed" mb="md">
        <Text size="sm">
          {list.totalItems === list.totalUniqueItems
            ? `${list.totalItems} items`
            : `${list.totalItems} items (${list.totalUniqueItems} unique)`}
        </Text>
      </Group>
      <Button
        size="xs"
        variant="subtle"
        leftSection={<FilePdfIcon size={14} />}
      >
        Export PDF
      </Button>
    </Card>
  );
}

export default function PackingLists() {
  const { data: lists, isFetching } = usePackingLists();
  const [showAll, { toggle: toggleShowAll }] = useDisclosure(false);

  return (
    <section>
      <Group justify="space-between" mb="md" align="flex-end">
        <div>
          <Title order={2}>My Packing Lists</Title>
        </div>
        <Button leftSection={<PlusIcon size={16} />} variant="light">
          New List
        </Button>
      </Group>

      {isFetching ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <Card>
            <Skeleton height={16} width="60%" mb="xs" />
            <Skeleton height={12} width="30%" mb="md" />
            <Skeleton height={28} width={90} />
          </Card>
        </SimpleGrid>
      ) : !lists || lists.length === 0 ? (
        <Text c="dimmed">
          No Packing lists yet. Create one to get started planning.
        </Text>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {lists.slice(0, 3).map((list) => (
              <PackingListCard key={list.id} list={list} />
            ))}
          </SimpleGrid>

          {lists.length > 3 && (
            <Collapse expanded={showAll}>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mt="md">
                {lists.slice(3).map((list) => (
                  <PackingListCard key={list.id} list={list} />
                ))}
              </SimpleGrid>
            </Collapse>
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={toggleShowAll}>
              {showAll ? "View less" : "View all lists"}
            </Button>
          </Group>
        </>
      )}
    </section>
  );
}
