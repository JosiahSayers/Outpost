import { usePackingList } from "$/frontend/packing-list/packing-list-context";
import { Button } from "@mantine/core";
import { CopyIcon, PlusIcon } from "@phosphor-icons/react";

interface Props {
  onAddSection: () => void;
  onCopy?: () => void;
  isCopying?: boolean;
}

export default function CallToAction({
  onAddSection,
  onCopy,
  isCopying,
}: Props) {
  const { editable } = usePackingList();

  return editable ? (
    <Button
      leftSection={<PlusIcon size={16} />}
      variant="default"
      size="md"
      onClick={onAddSection}
    >
      Add section
    </Button>
  ) : (
    <Button
      leftSection={<CopyIcon size={16} />}
      size="md"
      onClick={onCopy}
      loading={isCopying}
    >
      Copy to my lists
    </Button>
  );
}
