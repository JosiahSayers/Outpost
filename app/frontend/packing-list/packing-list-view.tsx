import CallToAction from "$/frontend/packing-list/header/call-to-action";
import PackingListDescription from "$/frontend/packing-list/header/packing-list-description";
import PackingListTitle from "$/frontend/packing-list/header/packing-list-title";
import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import { useUpdatePackingList } from "$/frontend/utils/api/packing-list";
import { sortByPosition } from "$/frontend/utils/sort-by-position";
import { notifications } from "@mantine/notifications";
import type { ClientFullPackingList } from "$/transformers/packing-list";
import { Divider, Group, Stack, Text } from "@mantine/core";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { arrayMove } from "@dnd-kit/sortable";
import { useEffect, useRef, useState } from "react";
import SectionContent from "./section/section-content";
import { useFlipReorder } from "./use-flip-reorder";

interface Props {
  editable?: boolean;
  list: ClientFullPackingList;
}

export default function PackingListView({ editable = false, list }: Props) {
  // Local copy of the sections kept in display order. Ordering is not yet
  // persisted to the backend, so reorders only mutate this state for now.
  const [sections, setSections] = useState(() => sortByPosition(list.sections));
  // Section the user just added, so it mounts directly in edit mode.
  const [autoEditSectionId, setAutoEditSectionId] = useState<number | null>(
    null,
  );
  // Temporary client-side ids for sections added before they're persisted.
  const nextTempId = useRef(-1);
  const columnsRef = useRef<HTMLDivElement>(null);
  const { register: registerSection, markMoved } = useFlipReorder();
  const updateList = useUpdatePackingList(list.id);

  // Scroll a newly added section into view once it has mounted.
  useEffect(() => {
    if (autoEditSectionId == null) return;
    columnsRef.current
      ?.querySelector(`[data-section-id="${autoEditSectionId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [autoEditSectionId]);

  function moveSection(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    // Only the two swapped sections should animate; everything else may shift
    // due to column rebalancing and should snap into place instead.
    markMoved([sections[index]!.id, sections[target]!.id]);
    setSections((prev) => arrayMove(prev, index, target));
  }

  function renameSection(index: number, name: string) {
    setSections((prev) =>
      prev.map((section, i) => (i === index ? { ...section, name } : section)),
    );
  }

  function deleteSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function addSection() {
    const id = nextTempId.current--;
    setAutoEditSectionId(id);
    setSections((prev) => {
      const sortPosition = prev.length
        ? Math.max(...prev.map((s) => s.sortPosition)) + 1
        : 1;
      return [...prev, { id, name: "New section", sortPosition, items: [] }];
    });
  }

  return (
    <PackingListProvider value={{ editable }}>
      <Stack gap="xl" maw={1100} mx="auto">
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start">
            <PackingListTitle
              value={list.name}
              onSave={(name) =>
                updateList.mutate(
                  { name },
                  {
                    onError: (error) =>
                      notifications.show({
                        color: "red",
                        title: "Couldn't rename list",
                        message: error.message,
                      }),
                  },
                )
              }
            />
            <CallToAction onAddSection={addSection} />
          </Group>
          <PackingListDescription
            value={list.description}
            onSave={(description) =>
              updateList.mutate(
                { name: list.name, description },
                {
                  onError: (error) =>
                    notifications.show({
                      color: "red",
                      title: "Couldn't update description",
                      message: error.message,
                    }),
                },
              )
            }
          />
          {list.sourceUrl && (
            <Group gap="xs">
              <ArrowSquareOutIcon size={14} />
              <Text size="xs" c="dimmed">
                Originally from rei.com
              </Text>
            </Group>
          )}
        </Stack>

        <Divider />

        <div
          ref={columnsRef}
          style={{ columns: "3 260px", columnGap: "var(--mantine-spacing-xl)" }}
        >
          {sections.map((section, index) => (
            <div
              key={section.id}
              ref={registerSection(section.id)}
              data-section-id={section.id}
              style={{ breakInside: "avoid" }}
            >
              <SectionContent
                section={section}
                isFirst={index === 0}
                isLast={index === sections.length - 1}
                onMoveUp={() => moveSection(index, "up")}
                onMoveDown={() => moveSection(index, "down")}
                onRename={(name) => renameSection(index, name)}
                onDelete={() => deleteSection(index)}
                autoEdit={section.id === autoEditSectionId}
              />
            </div>
          ))}
        </div>
      </Stack>
    </PackingListProvider>
  );
}
