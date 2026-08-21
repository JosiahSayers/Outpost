import { useAccountSettingsContext } from "$/frontend/account/account-settings-context";
import CategorySection from "$/frontend/gear-inventory/category-section";
import DeleteModal from "$/frontend/gear-inventory/delete-modal";
import EditDrawer from "$/frontend/gear-inventory/edit-drawer";
import Header from "$/frontend/gear-inventory/header";
import { GEAR_INVENTORY_GRID_COLUMNS } from "$/frontend/gear-inventory/table-grid";
import PageContainer from "$/frontend/layout/page-container";
import BackToDashboardLink from "$/frontend/shared-components/back-to-dashboard-link";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { useGearInventory } from "$/frontend/utils/api/gear-inventory";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { useWeightDisplay } from "$/frontend/utils/hooks/unit-conversion/use-weight-display";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { Alert, Button, Group, Text, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

export default function GearInventoryPage() {
  useAuthenticatedGuard();
  const formatWeight = useWeightDisplay();
  const { data, isLoading: itemsLoading, isError } = useGearInventory();
  const { isPending: settingsPending } = useAccountSettingsContext();
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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const isSearching = searchQuery.trim().length > 0;
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

  return (
    <LoadingSwitch loading={itemsLoading || settingsPending}>
      {() => {
        if (isError || !data) {
          return (
            <PageContainer>
              <Alert color="red" title="Couldn't load your gear inventory">
                Something went wrong. Please try refreshing the page.
              </Alert>
            </PageContainer>
          );
        }

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

        const handleToggleCategory = (name: string) => {
          setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(name)) {
              next.delete(name);
            } else {
              next.add(name);
            }
            return next;
          });
        };

        const handleToggleAll = () => {
          setCollapsedCategories((prev) =>
            prev.size > 0 ? new Set() : new Set(Object.keys(groupedItems)),
          );
        };

        return (
          <PageContainer gap="xl">
            <BackToDashboardLink />
            <Header items={data.items} onAdd={handleAdd} />

            {Object.keys(groupedItems).length > 0 && (
              <div role="table">
                <Group justify="space-between" wrap="nowrap" pb="md">
                  <TextInput
                    placeholder="Search items…"
                    leftSection={<MagnifyingGlassIcon size={16} />}
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(event.currentTarget.value)
                    }
                    style={{ flex: "1 1 auto", minWidth: 0, maxWidth: 240 }}
                  />
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={handleToggleAll}
                    disabled={isSearching}
                    style={{ flexShrink: 0 }}
                  >
                    {collapsedCategories.size > 0
                      ? "Expand All"
                      : "Collapse All"}
                  </Button>
                </Group>

                <div
                  role="row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: GEAR_INVENTORY_GRID_COLUMNS,
                    padding: "7px var(--mantine-spacing-xs)",
                  }}
                >
                  <Text size="sm" fw={700}>
                    Name
                  </Text>
                  <Text size="sm" fw={700} ta="center">
                    Qty
                  </Text>
                  <Text size="sm" fw={700} ta="right">
                    Weight
                  </Text>
                  <div />
                </div>
                {Object.entries(groupedItems).map(([name, items]) => {
                  const hasMatch = items.some((item) =>
                    item.name
                      .toLowerCase()
                      .includes(searchQuery.trim().toLowerCase()),
                  );
                  const expanded = isSearching
                    ? hasMatch
                    : !collapsedCategories.has(name);

                  return (
                    <CategorySection
                      name={name}
                      items={items}
                      expanded={expanded}
                      onToggle={() => handleToggleCategory(name)}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      formatWeight={formatWeight}
                      searchQuery={searchQuery}
                      key={name}
                    />
                  );
                })}
              </div>
            )}

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
          </PageContainer>
        );
      }}
    </LoadingSwitch>
  );
}
