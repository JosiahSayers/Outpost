import { useCreateFeedbackNote } from "$/frontend/utils/api/admin-feedback";
import { notifyError } from "$/frontend/utils/notify-error";
import { Button, Checkbox, Group, Paper, Textarea } from "@mantine/core";
import { useState } from "react";

interface Props {
  feedbackId: string;
}

export default function NoteComposer({ feedbackId }: Props) {
  const [message, setMessage] = useState("");
  const [userFacing, setUserFacing] = useState(false);
  const createNote = useCreateFeedbackNote(feedbackId);

  function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) return;
    createNote.mutate(
      { message: trimmed, userFacing },
      {
        onSuccess: () => {
          setMessage("");
          setUserFacing(false);
        },
        onError: notifyError("Couldn't post note"),
      },
    );
  }

  return (
    <Paper withBorder p="sm" mb="lg">
      <Textarea
        placeholder="Add a note…"
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
        autosize
        minRows={2}
        maxLength={1500}
        mb="sm"
      />
      <Group justify="space-between">
        <Checkbox
          label="Visible to submitter"
          checked={userFacing}
          onChange={(e) => setUserFacing(e.currentTarget.checked)}
        />
        <Button
          onClick={handleSubmit}
          loading={createNote.isPending}
          disabled={!message.trim()}
        >
          Post note
        </Button>
      </Group>
    </Paper>
  );
}
