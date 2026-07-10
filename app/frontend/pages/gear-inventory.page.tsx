import CategorySection from "$/frontend/gear-inventory/category-section";
import DeleteModal from "$/frontend/gear-inventory/delete-modal";
import EditDrawer from "$/frontend/gear-inventory/edit-drawer";
import Header from "$/frontend/gear-inventory/header";
import BackToDashboardLink from "$/frontend/shared-components/back-to-dashboard-link";
import { useGearInventory } from "$/frontend/utils/api/gear-inventory";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { useWeightDisplay } from "$/frontend/utils/hooks/unit-conversion/use-weight-display";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo, useState } from "react";

export default function GearInventoryPage() {
  useAuthenticatedGuard();
  const formatWeight = useWeightDisplay();
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

    const grouped = data.items.reduce<
      Record<string, Array<ClientGearInventoryItem>>
    >((acc, item) => {
      if (!acc[item.category.name]) {
        acc[item.category.name] = [];
      }

      acc[item.category.name]!.push(item);
      return acc;
    }, {});

    return Object.fromEntries(
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, items]) => [
          category,
          [...items].sort((a, b) => a.name.localeCompare(b.name)),
        ]),
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

  const handleClose = (item: "drawer" | "modal") => {
    if (item === "drawer") {
      setEditItem(null);
      closeDrawer();
    } else if (item === "modal") {
      setDeleteItem(null);
      closeDelete();
    }
  };

  return (
    <Stack gap="xl" py="xl" px={{ base: "md", md: "xl" }} maw={1400} mx="auto">
      <BackToDashboardLink />
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

      <EditDrawer
        opened={drawerOpen}
        onClose={() => handleClose("drawer")}
        item={editItem}
      />
      <DeleteModal
        opened={deleteOpen}
        onClose={() => handleClose("modal")}
        item={deleteItem}
      />
    </Stack>
  );
}
