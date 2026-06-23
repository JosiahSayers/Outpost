import CategorySection from "$/frontend/gear-inventory/category-section";
import DeleteModal from "$/frontend/gear-inventory/delete-modal";
import EditDrawer from "$/frontend/gear-inventory/edit-drawer";
import Header from "$/frontend/gear-inventory/header";
import { useGearInventory } from "$/frontend/utils/api/gear-inventory";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo, useState } from "react";

function formatWeight(grams: number | null): string {
  if (!grams) {
    return "";
  }

  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }

  return `${grams} g`;
}

export default function GearInventoryPage() {
  useAuthenticatedGuard();
  // TODO: Loading and error states
  const { data, isLoading, isError } = useGearInventory();
  const [drawerOpen, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [deleteOpen, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [editItem, setEditItem] = useState<ClientGearInventoryItem | null>(
    null,
  );
  const [deleteItem, setDeleteItem] = useState<ClientGearInventoryItem | null>(
    null,
  );
  const groupedItems = useMemo(() => {
    if (!data) {
      return {};
    }

    return data.items.reduce<Record<string, Array<ClientGearInventoryItem>>>(
      (acc, item) => {
        if (!acc[item.category.name]) {
          acc[item.category.name] = [];
        }

        acc[item.category.name]!.push(item);
        return acc;
      },
      {},
    );
  }, [data?.items]);

  const handleAdd = () => {
    setEditItem(null);
    openDrawer();
  };

  const handleEdit = (item: ClientGearInventoryItem) => {
    setEditItem(item);
    openDrawer();
  };

  const handleDelete = (item: ClientGearInventoryItem) => {
    setDeleteItem(item);
    openDelete();
  };

  return (
    <Stack gap="xl" py="xl" px={{ base: "md", md: "xl" }} maw={1400} mx="auto">
      <Header items={data?.items ?? []} onAdd={handleAdd} />

      <Stack gap="lg">
        {Object.entries(groupedItems).map(([name, items]) => (
          <CategorySection
            name={name}
            items={items}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatWeight={formatWeight}
            key={name}
          />
        ))}
      </Stack>

      <EditDrawer opened={drawerOpen} onClose={closeDrawer} item={editItem} />
      <DeleteModal
        opened={deleteOpen}
        onClose={closeDelete}
        item={deleteItem}
      />
    </Stack>
  );
}
