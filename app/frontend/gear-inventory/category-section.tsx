import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { ActionIcon, Divider, Group, Table, Text } from "@mantine/core";
import { PencilSimple, Trash } from "@phosphor-icons/react";

interface Props {
  name: string;
  items: Array<ClientGearInventoryItem>;
  onEdit: (item: ClientGearInventoryItem) => void;
  onDelete: (item: ClientGearInventoryItem) => void;
  formatWeight: (grams: number | null) => string;
}

export default function CategorySection({
  name,
  items,
  onEdit,
  onDelete,
  formatWeight,
}: Props) {
  return (
    <div>
      <Group gap="xs" mb="xs" align="center">
        <Text
          size="xs"
          tt="uppercase"
          fw={700}
          c="dimmed"
          style={{ letterSpacing: "0.08em" }}
        >
          {name}
        </Text>
        <Text size="xs" c="dimmed">
          ({items.length})
        </Text>
        <Divider style={{ flex: 1 }} />
      </Group>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th style={{ width: 60, textAlign: "center" }}>Qty</Table.Th>
            <Table.Th style={{ width: 110, textAlign: "right" }}>
              Weight
            </Table.Th>
            <Table.Th style={{ width: 72 }} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((item) => (
            <Table.Tr key={item.id}>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {item.name}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: "center" }}>
                <Text size="sm" c="dimmed">
                  {item.quantity}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: "right" }}>
                <Text size="sm" c="dimmed">
                  {formatWeight(item.grams)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={4} justify="flex-end">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => onEdit(item)}
                  >
                    <PencilSimple size={14} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => onDelete(item)}
                  >
                    <Trash size={14} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}
