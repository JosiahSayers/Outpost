import { usePackingList } from "$/frontend/packing-list/packing-list-context";
import { Button, Group } from "@mantine/core";
import {
  CopyIcon,
  FilePdfIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";

interface Props {
  listId: number;
  onAddSection: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  onCopy?: () => void;
  isCopying?: boolean;
}

export default function CallToAction({
  listId,
  onAddSection,
  onDelete,
  isDeleting,
  onCopy,
  isCopying,
}: Props) {
  const { editable } = usePackingList();

  const pdfButton = (
    <Button
      component="a"
      href={`/api/packing-lists/${listId}/pdf`}
      target="_blank"
      rel="noopener noreferrer"
      leftSection={<FilePdfIcon size={16} />}
      variant="default"
      size="md"
    >
      Export PDF
    </Button>
  );

  return editable ? (
    <Group gap="sm">
      {pdfButton}
      <Button
        leftSection={<PlusIcon size={16} />}
        variant="default"
        size="md"
        onClick={onAddSection}
      >
        Add section
      </Button>
      <Button
        leftSection={<TrashIcon size={16} />}
        color="red"
        variant="subtle"
        size="md"
        onClick={onDelete}
        loading={isDeleting}
      >
        Delete list
      </Button>
    </Group>
  ) : (
    <Group gap="sm">
      {pdfButton}
      <Button
        leftSection={<CopyIcon size={16} />}
        size="md"
        onClick={onCopy}
        loading={isCopying}
      >
        Copy to my lists
      </Button>
    </Group>
  );
}
