import CallToAction from "$/frontend/packing-list/header/call-to-action";
import PackingListDescription from "$/frontend/packing-list/header/packing-list-description";
import PackingListTitle from "$/frontend/packing-list/header/packing-list-title";
import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import {
  useCreateSection,
  useDeleteSection,
  useUpdatePackingList,
  useUpdateSection,
} from "$/frontend/utils/api/packing-list";
import { sortByPosition } from "$/frontend/utils/sort-by-position";
import type { ClientFullPackingList } from "$/transformers/packing-list";
import { Divider, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import SectionContent from "./section/section-content";
import { useFlipReorder } from "./use-flip-reorder";

interface Props {
  editable?: boolean;
  list: ClientFullPackingList;
}

export default function PackingListView({ editable = false, list }: Props) {
  // Sections render straight from the cache-fed prop; sort defensively since the
  // backend makes no ordering guarantee.
  const sections = sortByPosition(list.sections);
  // Section the user just added, so it mounts directly in edit mode.
  const [autoEditSectionId, setAutoEditSectionId] = useState<number | null>(
    null,
  );
  const columnsRef = useRef<HTMLDivElement>(null);
  const { register: registerSection, markMoved } = useFlipReorder();

  const updateList = useUpdatePackingList(list.id);
  const createSection = useCreateSection(list.id);
  const updateSection = useUpdateSection(list.id);
  const deleteSection = useDeleteSection(list.id);

  const notifyError = (title: string) => (error: Error) =>
    notifications.show({ color: "red", title, message: error.message });

  // Scroll a newly added section into view once it has mounted.
  useEffect(() => {
    if (autoEditSectionId == null) return;
    columnsRef.current
      ?.querySelector(`[data-section-id="${autoEditSectionId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [autoEditSectionId]);

  function handleMoveSection(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const upper = sections[Math.min(index, targetIndex)]!;
    const lower = sections[Math.max(index, targetIndex)]!;
    // Only the two swapped sections should animate; everything else may shift
    // due to column rebalancing and should snap into place instead.
    markMoved([upper.id, lower.id]);
    // Persist a swap by moving the lower section up into the upper's slot; the
    // backend's insert-and-push-down logic handles both directions this way.
    updateSection.mutate(
      { sectionId: lower.id, sortPosition: upper.sortPosition },
      { onError: notifyError("Couldn't reorder sections") },
    );
  }

  function handleRenameSection(sectionId: number, name: string) {
    updateSection.mutate(
      { sectionId, name },
      { onError: notifyError("Couldn't rename section") },
    );
  }

  function handleDeleteSection(sectionId: number) {
    deleteSection.mutate(sectionId, {
      onError: notifyError("Couldn't delete section"),
    });
  }

  function handleAddSection() {
    createSection.mutate(
      { name: "New section" },
      {
        // Reveal the persisted section in edit mode once it has an id.
        onSuccess: ({ section }) => setAutoEditSectionId(section.id),
        onError: notifyError("Couldn't add section"),
      },
    );
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
                  { onError: notifyError("Couldn't rename list") },
                )
              }
            />
            <CallToAction onAddSection={handleAddSection} />
          </Group>
          <PackingListDescription
            value={list.description}
            onSave={(description) =>
              updateList.mutate(
                { name: list.name, description },
                { onError: notifyError("Couldn't update description") },
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
                onMoveUp={() => handleMoveSection(index, "up")}
                onMoveDown={() => handleMoveSection(index, "down")}
                onRename={(name) => handleRenameSection(section.id, name)}
                onDelete={() => handleDeleteSection(section.id)}
                autoEdit={section.id === autoEditSectionId}
              />
            </div>
          ))}
        </div>
      </Stack>
    </PackingListProvider>
  );
}
