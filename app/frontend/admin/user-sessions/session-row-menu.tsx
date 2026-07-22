import { useRevokeSession } from "$/frontend/utils/api/admin-sessions";
import { notifyError } from "$/frontend/utils/notify-error";
import { ActionIcon, Button, Group, Menu, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DotsThreeVerticalIcon, SignOutIcon } from "@phosphor-icons/react";

interface SessionRowMenuProps {
  userId: string;
  sessionId: string;
}

export default function SessionRowMenu({
  userId,
  sessionId,
}: SessionRowMenuProps) {
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const revokeSession = useRevokeSession(userId);

  return (
    <>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            color="stone-gray"
            aria-label="Session actions"
          >
            <DotsThreeVerticalIcon size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            color="red"
            leftSection={<SignOutIcon size={16} />}
            onClick={openConfirm}
          >
            Revoke session
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={confirmOpened}
        onClose={closeConfirm}
        title="Revoke session?"
      >
        <Text size="sm" c="dimmed">
          This immediately signs the device out. The user will need to log in
          again to continue. This can&rsquo;t be undone.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={closeConfirm}>
            Cancel
          </Button>
          <Button
            color="red"
            loading={revokeSession.isPending}
            onClick={() =>
              revokeSession.mutate(sessionId, {
                onSuccess: closeConfirm,
                onError: notifyError("Couldn't revoke session"),
              })
            }
          >
            Revoke session
          </Button>
        </Group>
      </Modal>
    </>
  );
}
