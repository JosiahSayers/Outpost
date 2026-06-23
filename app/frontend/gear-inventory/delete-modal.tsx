import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { Button, Group, Modal, Text } from "@mantine/core";

interface Props {
  opened: boolean;
  onClose: () => void;
  item: ClientGearInventoryItem | null;
}

export default function DeleteModal({ opened, onClose, item }: Props) {
  // TODO: Wire up delete API call

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete item?"
      size="sm"
      centered
    >
      <Text c="dimmed" mb="xl" size="sm">
        Remove <strong>{item?.name}</strong> from your gear inventory? This
        can&apos;t be undone.
      </Text>
      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button color="red" onClick={onClose}>
          Delete
        </Button>
      </Group>
    </Modal>
  );
}
