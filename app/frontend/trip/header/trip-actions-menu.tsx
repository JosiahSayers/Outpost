import { ActionIcon, Menu } from "@mantine/core";
import { DotsThreeVerticalIcon, TrashIcon } from "@phosphor-icons/react";

interface Props {
  onDelete: () => void;
}

export default function TripActionsMenu({ onDelete }: Props) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label="Trip actions">
          <DotsThreeVerticalIcon size={18} weight="bold" />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
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
