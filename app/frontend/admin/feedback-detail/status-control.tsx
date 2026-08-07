import FeedbackStatusBadge from "$/frontend/admin/feedback/status-badge";
import { ALL_STATUSES, STATUS_LABEL } from "$/frontend/admin/feedback/status";
import { useUpdateFeedbackStatus } from "$/frontend/utils/api/admin-feedback";
import { notifyError } from "$/frontend/utils/notify-error";
import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { useState } from "react";
import type { FeedbackStatus } from "../../../../generated/prisma/enums";

const STATUS_OPTIONS = ALL_STATUSES.map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

interface Props {
  feedbackId: string;
  status: FeedbackStatus;
}

// Selecting a new status never commits it directly — it opens a confirm
// modal naming the exact change first. Once submitters can see their own
// feedback status, this is a change they'll notice, so it shouldn't be one
// accidental click in a dropdown.
export default function StatusControl({ feedbackId, status }: Props) {
  const [pending, setPending] = useState<FeedbackStatus | null>(null);
  const updateStatus = useUpdateFeedbackStatus(feedbackId);

  function handleCancel() {
    setPending(null);
  }

  function handleConfirm() {
    if (!pending) return;
    updateStatus.mutate(
      { status: pending },
      { onError: notifyError("Couldn't update status") },
    );
    setPending(null);
  }

  return (
    <>
      <Select
        label="Status"
        data={STATUS_OPTIONS}
        value={status}
        allowDeselect={false}
        onChange={(next) => {
          if (next && next !== status) setPending(next as FeedbackStatus);
        }}
        w={180}
      />

      <Modal
        opened={pending !== null}
        onClose={handleCancel}
        title="Update status?"
        size="sm"
        centered
      >
        <Stack gap="xs" mb="xl">
          <Text size="sm" c="dimmed">
            Change this feedback&rsquo;s status:
          </Text>
          <Group gap="sm">
            <FeedbackStatusBadge status={status} />
            <Text c="dimmed">&rarr;</Text>
            {pending && <FeedbackStatusBadge status={pending} />}
          </Group>
        </Stack>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={updateStatus.isPending}>
            Update status
          </Button>
        </Group>
      </Modal>
    </>
  );
}
