import { formatRelativeTime } from "$/frontend/utils/format-relative-time";
import type { ClientAdminFeedbackAuditLog } from "$/transformers/admin/feedback-audit-log";
import { Text } from "@mantine/core";

interface Props {
  log: ClientAdminFeedbackAuditLog;
  onNoteHover: (noteId: string | null) => void;
}

// Matches the note id the backend interpolates into changeDescription, e.g.
// "Note (a1b2c3d4-...) message updated" — see admin/feedback.ts.
const NOTE_ID_PATTERN = /\(([0-9a-f-]{36})\)/i;

function ChangeDescription({
  changeDescription,
  onNoteHover,
}: {
  changeDescription: string;
  onNoteHover: (noteId: string | null) => void;
}) {
  const match = changeDescription.match(NOTE_ID_PATTERN);
  if (!match || match.index === undefined) {
    return <>{changeDescription}</>;
  }

  const noteId = match[1]!;
  const before = changeDescription.slice(0, match.index);
  const after = changeDescription.slice(match.index + match[0].length);

  return (
    <>
      {before}
      <Text
        component="span"
        ff="monospace"
        fw={600}
        style={{ textDecoration: "underline dotted", cursor: "default" }}
        onMouseEnter={() => onNoteHover(noteId)}
        onMouseLeave={() => onNoteHover(null)}
      >
        (#{noteId.slice(0, 8)})
      </Text>
      {after}
    </>
  );
}

export default function LogEntry({ log, onNoteHover }: Props) {
  return (
    <Text size="xs" c="dimmed" px={4}>
      &bull;{" "}
      <ChangeDescription
        changeDescription={log.changeDescription}
        onNoteHover={onNoteHover}
      />{" "}
      &mdash; {log.admin?.name ?? "System"}
      {" · "}
      {formatRelativeTime(new Date(log.createdAt))}
    </Text>
  );
}
