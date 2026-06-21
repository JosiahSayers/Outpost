import AppLink from "$/frontend/app-link";
import type { StandaloneList } from "$/frontend/dashboard/types";
import { Button, Card, Group, SimpleGrid, Text, Title } from "@mantine/core";
import { FilePdf, ListBullets, Plus } from "@phosphor-icons/react";

interface Props {
  lists: StandaloneList[];
}

export default function StandaloneLists({ lists }: Props) {
  return (
    <section>
      <Group justify="space-between" mb="md" align="flex-end">
        <div>
          <Title order={2}>My Packing Lists</Title>
          <Text c="dimmed" size="sm">
            Lists not attached to a trip
          </Text>
        </div>
        <Button leftSection={<Plus size={16} />} variant="light">
          New List
        </Button>
      </Group>

      {lists.length === 0 ? (
        <Text c="dimmed">
          No standalone lists yet. Create a list or attach one to a trip.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {lists.map((list) => (
            <Card key={list.id}>
              <Group gap="xs" mb="xs">
                <ListBullets size={18} />
                <Text fw={600}>{list.name}</Text>
              </Group>
              <Group gap="md" c="dimmed" mb="md">
                <Text size="sm">{list.itemCount} items</Text>
                <Text size="sm">{list.totalWeightKg} kg</Text>
              </Group>
              <Button
                size="xs"
                variant="subtle"
                leftSection={<FilePdf size={14} />}
              >
                Export PDF
              </Button>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Group justify="flex-end" mt="sm">
        <AppLink href="/packing-lists">View all lists</AppLink>
      </Group>
    </section>
  );
}
