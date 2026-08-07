import LogEntry from "$/frontend/admin/feedback-detail/log-entry";
import NoteEntry from "$/frontend/admin/feedback-detail/note-entry";
import { formatRelativeTime } from "$/frontend/utils/format-relative-time";
import type { ClientFullAdminFeedback } from "$/transformers/admin/feedback";
import { Stack, Text } from "@mantine/core";
import { useState } from "react";

interface Props {
  feedback: ClientFullAdminFeedback;
}

type Entry =
  | {
      type: "note";
      key: string;
      createdAt: Date | string;
      note: ClientFullAdminFeedback["notes"][number];
    }
  | {
      type: "log";
      key: string;
      createdAt: Date | string;
      log: ClientFullAdminFeedback["auditLogs"][number];
    };

// Notes and audit logs are two separate arrays from the API, but read as one
// chronological feed — newest first, matching how each list is already
// ordered server-side.
export default function Timeline({ feedback }: Props) {
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(
    null,
  );
  const entries: Entry[] = [
    ...feedback.notes.map((note): Entry => ({
      type: "note",
      key: `note-${note.id}`,
      createdAt: note.createdAt,
      note,
    })),
    ...feedback.auditLogs.map((log): Entry => ({
      type: "log",
      key: `log-${log.id}`,
      createdAt: log.createdAt,
      log,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Stack gap="sm">
      {entries.map((entry) =>
        entry.type === "note" ? (
          <NoteEntry
            key={entry.key}
            feedbackId={feedback.id}
            note={entry.note}
            highlighted={entry.note.id === highlightedNoteId}
          />
        ) : (
          <LogEntry
            key={entry.key}
            log={entry.log}
            onNoteHover={setHighlightedNoteId}
          />
        ),
      )}
      <Text size="xs" c="dimmed" px={4}>
        &bull; Feedback submitted &mdash; {feedback.user.name}
        {" · "}
        {formatRelativeTime(new Date(feedback.createdAt))}
      </Text>
    </Stack>
  );
}
