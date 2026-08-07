import { useUpdateFeedbackNote } from "$/frontend/utils/api/admin-feedback";
import { formatRelativeTime } from "$/frontend/utils/format-relative-time";
import { getInitials } from "$/frontend/utils/get-initials";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientAdminFeedbackNote } from "$/transformers/admin/feedback-note";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useState } from "react";

interface Props {
  feedbackId: string;
  note: ClientAdminFeedbackNote;
}

export default function NoteEntry({ feedbackId, note }: Props) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(note.message);
  const [userFacing, setUserFacing] = useState(note.userFacing);
  const updateNote = useUpdateFeedbackNote(feedbackId);

  function startEditing() {
    setMessage(note.message);
    setUserFacing(note.userFacing);
    setEditing(true);
  }

  function handleSave() {
    const trimmed = message.trim();
    if (!trimmed) return;
    updateNote.mutate(
      { noteId: note.id, message: trimmed, userFacing },
      {
        onSuccess: () => setEditing(false),
        onError: notifyError("Couldn't update note"),
      },
    );
  }

  return (
    <Paper withBorder p="sm">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Avatar radius="xl" size={30} color="bark-brown" variant="light">
          {note.admin ? getInitials(note.admin.name) : "?"}
        </Avatar>
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="wrap">
            <Text fw={700} size="sm">
              {note.admin?.name ?? "Deleted admin"}
            </Text>
            <Badge
              size="xs"
              color={note.userFacing ? "trail-green" : "stone-gray"}
              variant="light"
            >
              {note.userFacing ? "Visible to submitter" : "Internal"}
            </Badge>
            <Text size="xs" c="dimmed" ml="auto">
              {formatRelativeTime(new Date(note.createdAt))}
            </Text>
            {!editing && (
              <Button variant="subtle" size="compact-xs" onClick={startEditing}>
                Edit
              </Button>
            )}
          </Group>

          {editing ? (
            <Stack gap="xs">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.currentTarget.value)}
                autosize
                minRows={2}
                maxLength={1500}
              />
              <Group justify="space-between">
                <Checkbox
                  label="Visible to submitter"
                  checked={userFacing}
                  onChange={(e) => setUserFacing(e.currentTarget.checked)}
                />
                <Group gap="xs">
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => setEditing(false)}
                    disabled={updateNote.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    onClick={handleSave}
                    loading={updateNote.isPending}
                    disabled={!message.trim()}
                  >
                    Save
                  </Button>
                </Group>
              </Group>
            </Stack>
          ) : (
            <Text size="sm">{note.message}</Text>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}
