import type { PlaceholderPackingList } from "$/frontend/trip/placeholder-data";
import { Badge, Card, Group, Progress, Text } from "@mantine/core";

interface Props {
  list: PlaceholderPackingList;
}

export default function PackingList({ list }: Props) {
  const complete = list.packedItems === list.totalItems;

  return (
    <Card key={list.id} withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={600}>{list.name}</Text>
        {complete && <Badge color="trail-green">Packed</Badge>}
      </Group>
      <Progress
        value={(list.packedItems / list.totalItems) * 100}
        color="trail-green"
        size="md"
        mb={6}
      />
      <Text size="xs" c="dimmed">
        {list.packedItems}/{list.totalItems} packed
      </Text>
    </Card>
  );
}
