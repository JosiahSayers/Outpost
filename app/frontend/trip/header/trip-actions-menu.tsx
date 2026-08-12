import { ActionIcon, Menu } from "@mantine/core";
import {
  DotsThreeVerticalIcon,
  PrinterIcon,
  TrashIcon,
} from "@phosphor-icons/react";

interface Props {
  onPrint: () => void;
  onDelete: () => void;
}

export default function TripActionsMenu({ onPrint, onDelete }: Props) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label="Trip actions">
          <DotsThreeVerticalIcon size={18} weight="bold" />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<PrinterIcon size={14} />} onClick={onPrint}>
          Print summary
        </Menu.Item>
        <Menu.Item
          color="red"
          leftSection={<TrashIcon size={14} />}
          onClick={onDelete}
        >
          Delete trip
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
