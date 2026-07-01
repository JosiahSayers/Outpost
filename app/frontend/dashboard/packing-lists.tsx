import PackingListCard from "$/frontend/dashboard/packing-lists/packing-list-card";
import NewPackingListModal from "$/frontend/dashboard/packing-lists/new-packing-list-modal";
import { usePackingLists } from "$/frontend/utils/api/packing-list";
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
import { PlusIcon } from "@phosphor-icons/react";

export default function PackingLists() {
  const { data: lists, isFetching } = usePackingLists();
  const [showAll, { toggle: toggleShowAll }] = useDisclosure(false);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  return (
    <section>
      <NewPackingListModal opened={modalOpened} onClose={closeModal} />
      <Group justify="space-between" mb="md" align="flex-end">
        <div>
          <Title order={2}>My Packing Lists</Title>
        </div>
        <Button
          leftSection={<PlusIcon size={16} />}
          variant="light"
          onClick={openModal}
        >
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
            <>
              <Collapse expanded={showAll}>
                <SimpleGrid
                  cols={{ base: 1, sm: 2, md: 3 }}
                  spacing="md"
                  mt="md"
                >
                  {lists.slice(3).map((list) => (
                    <PackingListCard key={list.id} list={list} />
                  ))}
                </SimpleGrid>
              </Collapse>

              <Group justify="flex-end" mt="sm">
                <Button variant="subtle" onClick={toggleShowAll}>
                  {showAll ? "View less" : "View all lists"}
                </Button>
              </Group>
            </>
          )}
        </>
      )}
    </section>
  );
}
