import { useDeleteGearInventoryItem } from "$/frontend/utils/api/gear-inventory";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { Button, Group, Modal, Text } from "@mantine/core";
import { useLayoutEffect } from "react";

interface Props {
  opened: boolean;
  onClose: () => void;
  item: ClientGearInventoryItem | null;
}

export default function DeleteModal({ opened, onClose, item }: Props) {
  const { isPending, isSuccess, mutate } = useDeleteGearInventoryItem();

  useLayoutEffect(() => {
    if (isSuccess) {
      onClose();
    }
  }, [isSuccess]);

  const handleDelete = async () => {
    if (!item) return;
    mutate(item.id, { onError: notifyError("Couldn't delete item") });
  };

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
        <Button disabled={isPending} variant="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={isPending} color="red" onClick={handleDelete}>
          Delete
        </Button>
      </Group>
    </Modal>
  );
}
